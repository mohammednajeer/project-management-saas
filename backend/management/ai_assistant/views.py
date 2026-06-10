from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from projects.models import Project
from tasks.models import Task, SubTask
from issues.models import Issue

from .services.project_summary import generate_project_summary
from .services.risk_detection import detect_project_risks
from .services.task_breakdown import generate_task_breakdown
from .services.weekly_summary import generate_weekly_summary
from .services.workload_insights import generate_workload_insights


MANAGER_ROLES = ("admin", "manager")


def _organization_required(user):
    return user.organization is not None


def _is_manager(user):
    return user.role in MANAGER_ROLES


def _permission_denied(message="Permission denied"):
    return Response(
        {"message": message},
        status=status.HTTP_403_FORBIDDEN,
    )


def _organization_error():
    return Response(
        {"message": "Organization required"},
        status=status.HTTP_400_BAD_REQUEST,
    )


class ProjectSummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, project_id):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access project summaries."
            )

        try:
            project = (
                Project.objects.filter(
                    id=project_id,
                    organization=request.user.organization,
                )
                .select_related("project_lead")
                .prefetch_related("tasks__assigned_to", "issues", "milestones")
                .get()
            )
        except Project.DoesNotExist:
            return Response(
                {"message": "Project not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(generate_project_summary(project))


class RiskDetectionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access organization risk detection."
            )

        return Response(detect_project_risks(request.user.organization))


class TaskBreakdownView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        title = (request.data.get("title") or "").strip()
        description = (request.data.get("description") or "").strip()

        if not title:
            return Response(
                {"title": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(generate_task_breakdown(title, description))


class WeeklySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()
        if not _is_manager(request.user):
            return _permission_denied(
                "Only admins and managers can access weekly summaries."
            )

        start_date = None
        end_date = None
        if request.query_params.get("start_date"):
            start_date = parse_date(request.query_params["start_date"])
            if not start_date:
                return Response(
                    {"start_date": ["Use YYYY-MM-DD format."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if request.query_params.get("end_date"):
            end_date = parse_date(request.query_params["end_date"])
            if not end_date:
                return Response(
                    {"end_date": ["Use YYYY-MM-DD format."]},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if (start_date and not end_date) or (end_date and not start_date):
            return Response(
                {"message": "Provide both start_date and end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if start_date and end_date and start_date > end_date:
            return Response(
                {"message": "start_date must be before or equal to end_date."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            generate_weekly_summary(
                request.user.organization,
                start_date=start_date,
                end_date=end_date,
            )
        )


class WorkloadInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not _organization_required(request.user):
            return _organization_error()

        user = request.user if request.user.role == "employee" else None
        if request.user.role not in ("admin", "manager", "employee"):
            return _permission_denied()

        return Response(
            generate_workload_insights(
                request.user.organization,
                user=user,
            )
        )


class AIChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not _organization_required(request.user):
            return _organization_error()

        message = request.data.get("message")
        history = request.data.get("history", [])

        if not message:
            return Response(
                {"message": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user
        org = user.organization

        active_projects = Project.objects.filter(organization=org).exclude(status="completed")
        projects_summary = ", ".join([f"{p.name} ({p.status})" for p in active_projects]) or "No active projects"

        my_tasks = Task.objects.filter(assigned_to=user).exclude(status="done")
        tasks_summary = ", ".join([f"{t.title} (Project: {t.project.name}, Status: {t.status})" for t in my_tasks]) or "No active tasks"

        my_subtasks = SubTask.objects.filter(assigned_to=user).exclude(status="done")
        subtasks_summary = ", ".join([f"{st.title} (Parent Task: {st.task.title}, Status: {st.status})" for st in my_subtasks]) or "No active subtasks"

        open_issues = Issue.objects.filter(project__organization=org, status__in=["open", "investigating"])
        issues_summary = ", ".join([f"{i.title} (Status: {i.status}, Priority: {i.priority})" for i in open_issues]) or "No open issues"

        system_instruction = (
            "You are ProjectFlow's Smart AI Workspace Co-pilot. Your job is to assist employees in managing, planning, and executing their work.\n"
            f"You are currently chatting with {user.name} ({user.role}), who works in the {user.department or 'General'} department as a {user.designation or 'Team Member'} at {org.name}.\n\n"
            "Here is the real-time context of the workspace:\n"
            f"- Active Projects in Organization: {projects_summary}\n"
            f"- Active Tasks assigned to this user: {tasks_summary}\n"
            f"- Active Subtasks assigned to this user: {subtasks_summary}\n"
            f"- Open/Investigating Issues in Organization: {issues_summary}\n\n"
            "Use this workspace context when answering questions about tasks, deadlines, workloads, or projects. Be helpful, concise, professional, and friendly. "
            "You can answer general questions as well, but always relate back to helping the user with their work if possible. Keep answers structured (use bullet points or lists for clarity)."
        )

        prompt_parts = []
        for h in history:
            role = "User" if h.get("role") == "user" else "Assistant"
            prompt_parts.append(f"{role}: {h.get('text')}")
        prompt_parts.append(f"User: {message}")
        prompt = "\n".join(prompt_parts)

        try:
            from ai_assistant.providers.gemini_provider import generate_text
            ai_response = generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=0.7,
            )
            return Response({"response": ai_response})
        except Exception as e:
            return Response(
                {"message": f"AI Assistant is currently unavailable. Error: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
