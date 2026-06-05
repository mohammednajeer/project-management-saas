from datetime import datetime, timedelta

from django.utils import timezone

from activities.models import Activity
from ai_assistant.providers.gemini_provider import (
    GeminiProviderError,
    compact_json,
    generate_text,
)
from issues.models import Issue
from leave_management.models import LeaveRequest
from projects.models import ProjectMilestone
from tasks.models import Task


SYSTEM_INSTRUCTION = (
    "You are ProjectFlow's weekly reporting assistant. Use only the provided "
    "organization-scoped report data. Keep the report factual and concise."
)


def _user_payload(user):
    if not user:
        return None
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
    }


def _project_payload(project):
    return {
        "id": str(project.id),
        "name": project.name,
    }


def _task_payload(task):
    return {
        "id": str(task.id),
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "project": _project_payload(task.project),
    }


def _issue_payload(issue):
    return {
        "id": str(issue.id),
        "title": issue.title,
        "status": issue.status,
        "priority": issue.priority,
        "project": _project_payload(issue.project),
        "resolved_at": issue.updated_at.isoformat(),
    }


def _leave_payload(leave):
    return {
        "id": str(leave.id),
        "employee": _user_payload(leave.employee),
        "leave_type": leave.leave_type,
        "status": leave.status,
        "start_date": leave.start_date.isoformat(),
        "end_date": leave.end_date.isoformat(),
    }


def _activity_payload(activity):
    return {
        "id": str(activity.id),
        "action": activity.action,
        "message": activity.message,
        "created_at": activity.created_at.isoformat(),
        "user": _user_payload(activity.user),
        "project": _project_payload(activity.project) if activity.project else None,
        "task": {
            "id": str(activity.task.id),
            "title": activity.task.title,
        }
        if activity.task
        else None,
    }


def _default_range(today):
    return today - timedelta(days=6), today


def generate_weekly_summary(organization, start_date=None, end_date=None, today=None):
    today = today or timezone.localdate()
    if not (start_date and end_date):
        start_date, end_date = _default_range(today)

    start_dt = timezone.make_aware(
        datetime.combine(start_date, datetime.min.time())
    )
    end_dt = timezone.make_aware(
        datetime.combine(end_date, datetime.max.time())
    )

    completed_activities = Activity.objects.filter(
        organization=organization,
        created_at__range=(start_dt, end_dt),
        action__in=("subtask_completed", "task_updated"),
    ).select_related(
        "user",
        "project",
        "task",
    )

    completed_tasks = Task.objects.filter(
        project__organization=organization,
        status="done",
        activities__created_at__range=(start_dt, end_dt),
    ).select_related(
        "project",
    ).distinct()

    new_tasks = Task.objects.filter(
        project__organization=organization,
        created_at__range=(start_dt, end_dt),
    ).select_related(
        "project",
    ).order_by(
        "-created_at",
    )

    resolved_issues = Issue.objects.filter(
        project__organization=organization,
        status__in=("resolved", "closed"),
        updated_at__range=(start_dt, end_dt),
    ).select_related(
        "project",
    ).order_by(
        "-updated_at",
    )

    leave_requests = LeaveRequest.objects.filter(
        organization=organization,
        start_date__lte=end_date,
        end_date__gte=start_date,
    ).select_related(
        "employee",
    ).order_by(
        "start_date",
    )

    upcoming_end = today + timedelta(days=7)
    upcoming_tasks = Task.objects.filter(
        project__organization=organization,
        due_date__gte=today,
        due_date__lte=upcoming_end,
    ).exclude(
        status="done",
    ).select_related(
        "project",
    ).order_by(
        "due_date",
    )
    upcoming_milestones = ProjectMilestone.objects.filter(
        project__organization=organization,
        target_date__gte=today,
        target_date__lte=upcoming_end,
    ).exclude(
        status="completed",
    ).select_related(
        "project",
    ).order_by(
        "target_date",
    )

    leave_by_status = {}
    for leave in leave_requests:
        leave_by_status[leave.status] = leave_by_status.get(leave.status, 0) + 1

    payload = {
        "scope": "organization",
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
        },
        "completed_tasks": {
            "count": completed_tasks.count(),
            "items": [_task_payload(task) for task in completed_tasks[:50]],
            "activity_evidence": [
                _activity_payload(activity)
                for activity in completed_activities[:20]
            ],
        },
        "new_tasks": {
            "count": new_tasks.count(),
            "items": [_task_payload(task) for task in new_tasks[:50]],
        },
        "resolved_issues": {
            "count": resolved_issues.count(),
            "items": [_issue_payload(issue) for issue in resolved_issues[:50]],
        },
        "leave_summary": {
            "count": leave_requests.count(),
            "by_status": leave_by_status,
            "items": [_leave_payload(leave) for leave in leave_requests[:50]],
        },
        "upcoming_deadlines": {
            "tasks": [_task_payload(task) for task in upcoming_tasks[:50]],
            "milestones": [
                {
                    "id": str(milestone.id),
                    "title": milestone.title,
                    "status": milestone.status,
                    "target_date": milestone.target_date.isoformat(),
                    "project": _project_payload(milestone.project),
                }
                for milestone in upcoming_milestones[:50]
            ],
        },
    }

    prompt = (
        "Write a weekly report for leadership. Include completed work, new "
        "work, resolved issues, leave impact, upcoming deadlines, and suggested "
        "focus for next week.\n\n"
        f"Weekly payload:\n{compact_json(payload)}"
    )
    try:
        payload["generated_report"] = generate_text(
            prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            max_output_tokens=850,
        )
        payload["ai_provider"] = "gemini"
    except GeminiProviderError as e:
        payload["ai_provider"] = "fallback"
        payload["ai_error"] = str(e)

    return payload
