from datetime import timedelta

from django.utils import timezone

from analytics.workload import get_organization_team_workload, get_thresholds
from ai_assistant.providers.gemini_provider import (
    GeminiProviderError,
    compact_json,
    generate_text,
)
from issues.models import Issue
from projects.health import collect_health_signals
from projects.models import Project, ProjectMilestone
from tasks.models import SubTask, Task


SYSTEM_INSTRUCTION = (
    "You are ProjectFlow's AI risk analyst. Use only the organization-scoped "
    "risk payload provided. Do not add risks that are not present in the data."
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
        "due_date": project.due_date.isoformat() if project.due_date else None,
        "health": project.health,
    }


def _risk(risk_type, severity, title, message, entity_type, entity_id, **extra):
    return {
        "type": risk_type,
        "severity": severity,
        "title": title,
        "message": message,
        "entity": {
            "type": entity_type,
            "id": str(entity_id),
        },
        **extra,
    }


def _task_risk(task, today):
    days_overdue = (today - task.due_date).days if task.due_date else 0
    severity = (
        "critical"
        if task.priority == "critical" or days_overdue >= 7
        else "high"
    )
    return _risk(
        "overdue_task",
        severity,
        "Overdue task",
        f"{task.title} is {days_overdue} day(s) overdue.",
        "task",
        task.id,
        project=_project_payload(task.project),
        due_date=task.due_date.isoformat() if task.due_date else None,
        days_overdue=days_overdue,
        priority=task.priority,
        assigned_to=[_user_payload(user) for user in task.assigned_to.all()],
    )


def _subtask_risk(subtask, today):
    days_overdue = (today - subtask.due_date).days if subtask.due_date else 0
    severity = (
        "critical"
        if subtask.priority == "critical" or days_overdue >= 7
        else "high"
    )
    return _risk(
        "overdue_task",
        severity,
        "Overdue subtask",
        f"{subtask.title} is {days_overdue} day(s) overdue.",
        "subtask",
        subtask.id,
        project=_project_payload(subtask.task.project),
        parent_task={
            "id": str(subtask.task.id),
            "title": subtask.task.title,
        },
        due_date=subtask.due_date.isoformat() if subtask.due_date else None,
        days_overdue=days_overdue,
        priority=subtask.priority,
        assigned_to=[_user_payload(user) for user in subtask.assigned_to.all()],
    )


def detect_project_risks(organization, today=None):
    today = today or timezone.localdate()
    risks = []

    overdue_tasks = (
        Task.objects.filter(
            project__organization=organization,
            due_date__lt=today,
        )
        .exclude(status="done")
        .select_related("project")
        .prefetch_related("assigned_to")
        .order_by("due_date")
    )
    risks.extend(_task_risk(task, today) for task in overdue_tasks)

    overdue_subtasks = (
        SubTask.objects.filter(
            task__project__organization=organization,
            due_date__lt=today,
        )
        .exclude(status="done")
        .select_related("task", "task__project")
        .prefetch_related("assigned_to")
        .order_by("due_date")
    )
    risks.extend(_subtask_risk(subtask, today) for subtask in overdue_subtasks)

    overdue_milestones = ProjectMilestone.objects.filter(
        project__organization=organization,
        target_date__lt=today,
    ).exclude(
        status="completed",
    ).select_related(
        "project",
    ).order_by(
        "target_date",
    )
    for milestone in overdue_milestones:
        days_overdue = (today - milestone.target_date).days
        risks.append(
            _risk(
                "overdue_milestone",
                "critical" if days_overdue >= 7 else "high",
                "Overdue milestone",
                f"{milestone.title} is {days_overdue} day(s) overdue.",
                "milestone",
                milestone.id,
                project=_project_payload(milestone.project),
                target_date=milestone.target_date.isoformat(),
                days_overdue=days_overdue,
            )
        )

    critical_issues = Issue.objects.filter(
        project__organization=organization,
        priority="critical",
        status__in=("open", "investigating"),
    ).select_related(
        "project",
        "assigned_to",
    ).order_by(
        "created_at",
    )
    for issue in critical_issues:
        risks.append(
            _risk(
                "critical_issue",
                "critical",
                "Critical open issue",
                f"{issue.title} is still {issue.status}.",
                "issue",
                issue.id,
                project=_project_payload(issue.project),
                status=issue.status,
                assigned_to=_user_payload(issue.assigned_to),
                created_at=issue.created_at.isoformat(),
            )
        )

    workload_rows = get_organization_team_workload(organization, today=today)
    for row in workload_rows:
        if row["workload_status"] == "overloaded":
            risks.append(
                _risk(
                    "overloaded_employee",
                    "high" if row["overdue_tasks"] else "medium",
                    "Overloaded employee",
                    f"{row['name']} has {row['active_tasks']} active assignment(s).",
                    "user",
                    row["id"],
                    employee=row,
                )
            )

    deadline_window_end = today + timedelta(days=7)
    deadline_projects = Project.objects.filter(
        organization=organization,
        due_date__gte=today,
        due_date__lte=deadline_window_end,
    ).exclude(
        status__in=("completed", "archived"),
    ).prefetch_related(
        "tasks",
    ).order_by(
        "due_date",
    )
    for project in deadline_projects:
        signals = collect_health_signals(project, today=today)
        if signals["completion_pct"] >= 80:
            continue
        days_remaining = signals["days_to_deadline"]
        risks.append(
            _risk(
                "deadline_risk",
                (
                    "high"
                    if days_remaining is not None and days_remaining <= 3
                    else "medium"
                ),
                "Project deadline risk",
                (
                    f"{project.name} is due in {days_remaining} day(s) "
                    f"with {signals['completion_pct']}% progress."
                ),
                "project",
                project.id,
                project=_project_payload(project),
                days_remaining=days_remaining,
                progress=signals["completion_pct"],
            )
        )

    severity_rank = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    risks.sort(key=lambda risk: severity_rank.get(risk["severity"], 9))

    payload = {
        "scope": "organization",
        "generated_for": {
            "organization_id": str(organization.id),
            "organization_name": organization.name,
            "date": today.isoformat(),
        },
        "thresholds": get_thresholds(),
        "summary": {
            "total": len(risks),
            "critical": sum(1 for risk in risks if risk["severity"] == "critical"),
            "high": sum(1 for risk in risks if risk["severity"] == "high"),
            "medium": sum(1 for risk in risks if risk["severity"] == "medium"),
            "low": sum(1 for risk in risks if risk["severity"] == "low"),
        },
        "risks": risks,
    }

    prompt = (
        "Summarize the detected delivery risks for a manager. Highlight the "
        "most urgent risks first, explain why they matter, and recommend "
        "practical next actions. Keep it brief.\n\n"
        f"Risk payload:\n{compact_json(payload)}"
    )
    try:
        payload["generated_summary"] = generate_text(
            prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            max_output_tokens=750,
        )
        payload["ai_provider"] = "gemini"
    except GeminiProviderError as e:
        payload["ai_provider"] = "fallback"
        payload["ai_error"] = str(e)

    return payload
