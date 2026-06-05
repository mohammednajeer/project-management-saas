from analytics.workload import get_project_team_workload, get_thresholds
from ai_assistant.providers.gemini_provider import (
    GeminiProviderError,
    compact_json,
    generate_text,
)
from projects.health import HEALTH_LABELS, refresh_project_health


SYSTEM_INSTRUCTION = (
    "You are ProjectFlow's AI assistant. Use only the project data provided. "
    "Do not invent names, dates, tasks, or issues. Write concise operational "
    "summaries for project managers."
)


def _user_payload(user):
    if not user:
        return None
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
    }


def _task_payload(task):
    return {
        "id": str(task.id),
        "title": task.title,
        "status": task.status,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "assigned_to": [_user_payload(user) for user in task.assigned_to.all()],
    }


def _issue_payload(issue):
    return {
        "id": str(issue.id),
        "title": issue.title,
        "status": issue.status,
        "priority": issue.priority,
        "assigned_to": _user_payload(issue.assigned_to),
        "created_at": issue.created_at.isoformat(),
    }


def _milestone_payload(milestone):
    return {
        "id": str(milestone.id),
        "title": milestone.title,
        "status": milestone.status,
        "target_date": milestone.target_date.isoformat(),
        "is_overdue": milestone.is_overdue,
    }


def generate_project_summary(project):
    health, signals = refresh_project_health(project)

    tasks = project.tasks.prefetch_related("assigned_to").order_by(
        "due_date",
        "created_at",
    )
    completed_tasks = list(tasks.filter(status="done"))
    remaining_tasks = list(tasks.exclude(status="done"))
    total_tasks = len(completed_tasks) + len(remaining_tasks)
    progress = round((len(completed_tasks) / total_tasks) * 100) if total_tasks else 100

    open_issues = project.issues.filter(
        status__in=("open", "investigating"),
    ).select_related(
        "assigned_to",
    ).order_by(
        "-priority",
        "-created_at",
    )

    upcoming_milestones = project.milestones.exclude(
        status="completed",
    ).order_by(
        "target_date",
        "created_at",
    )

    workload_rows = get_project_team_workload(project)
    overloaded = [
        row
        for row in workload_rows
        if row["workload_status"] == "overloaded"
    ]

    payload = {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "status": project.status,
            "priority": project.priority,
            "due_date": project.due_date.isoformat() if project.due_date else None,
            "project_lead": _user_payload(project.project_lead),
        },
        "project_name": project.name,
        "progress": {
            "percentage": progress,
            "completed": len(completed_tasks),
            "remaining": len(remaining_tasks),
            "total": total_tasks,
        },
        "completed_tasks": [_task_payload(task) for task in completed_tasks],
        "remaining_tasks": [_task_payload(task) for task in remaining_tasks],
        "open_issues": [_issue_payload(issue) for issue in open_issues],
        "upcoming_milestones": [
            _milestone_payload(milestone)
            for milestone in upcoming_milestones
        ],
        "project_health": {
            "status": health,
            "label": HEALTH_LABELS.get(health, health.title()),
            "signals": signals,
        },
        "workload": {
            "thresholds": get_thresholds(),
            "member_count": len(workload_rows),
            "overloaded_count": len(overloaded),
            "overloaded_members": overloaded,
        },
    }

    prompt = (
        "Create a concise project summary with: current status, progress, "
        "key blockers, workload concerns, and next recommended actions.\n\n"
        f"Project payload:\n{compact_json(payload)}"
    )
    try:
        payload["generated_summary"] = generate_text(
            prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            max_output_tokens=700,
        )
        payload["ai_provider"] = "gemini"
    except GeminiProviderError as e:
        payload["ai_provider"] = "fallback"
        payload["ai_error"] = str(e)

    return payload
