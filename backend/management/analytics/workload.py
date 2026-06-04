from django.conf import settings
from django.utils import timezone

from issues.models import Issue
from tasks.models import SubTask, Task

OPEN_ISSUE_STATUSES = ("open", "investigating")
DONE_STATUS = "done"

WORKLOAD_STATUS_LABELS = {
    "underutilized": "Underutilized",
    "balanced": "Balanced",
    "overloaded": "Overloaded",
}


def get_thresholds():
    return {
        "underutilized_max": int(
            getattr(settings, "WORKLOAD_UNDERUTILIZED_MAX", 3)
        ),
        "overloaded_min": int(
            getattr(settings, "WORKLOAD_OVERLOADED_MIN", 15)
        ),
    }


def classify_workload(active_load, thresholds=None):
    thresholds = thresholds or get_thresholds()
    if active_load <= thresholds["underutilized_max"]:
        return "underutilized", WORKLOAD_STATUS_LABELS["underutilized"]
    if active_load >= thresholds["overloaded_min"]:
        return "overloaded", WORKLOAD_STATUS_LABELS["overloaded"]
    return "balanced", WORKLOAD_STATUS_LABELS["balanced"]


def _task_queryset(*, organization, project=None):
    qs = Task.objects.filter(project__organization=organization)
    if project is not None:
        qs = qs.filter(project=project)
    return qs


def _subtask_queryset(*, organization, project=None):
    qs = SubTask.objects.filter(task__project__organization=organization)
    if project is not None:
        qs = qs.filter(task__project=project)
    return qs


def _issue_queryset(*, organization, project=None):
    qs = Issue.objects.filter(project__organization=organization)
    if project is not None:
        qs = qs.filter(project=project)
    return qs


def compute_member_workload(user, *, organization, project=None, today=None):
    today = today or timezone.localdate()
    thresholds = get_thresholds()

    tasks = _task_queryset(organization=organization, project=project).filter(
        assigned_to=user
    )
    subtasks = _subtask_queryset(organization=organization, project=project).filter(
        assigned_to=user
    )

    active_tasks = tasks.exclude(status=DONE_STATUS).count()
    active_subtasks = subtasks.exclude(status=DONE_STATUS).count()
    assigned_tasks = active_tasks + active_subtasks

    completed_tasks = tasks.filter(status=DONE_STATUS).count()
    completed_subtasks = subtasks.filter(status=DONE_STATUS).count()
    completed_total = completed_tasks + completed_subtasks

    overdue_tasks = (
        tasks.filter(due_date__lt=today)
        .exclude(status=DONE_STATUS)
        .count()
        + subtasks.filter(due_date__lt=today)
        .exclude(status=DONE_STATUS)
        .count()
    )

    open_issues = (
        _issue_queryset(organization=organization, project=project)
        .filter(assigned_to=user, status__in=OPEN_ISSUE_STATUSES)
        .count()
    )

    workload_score = assigned_tasks + open_issues
    status_key, status_label = classify_workload(workload_score, thresholds)

    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "active_tasks": assigned_tasks,
        "active_task_count": active_tasks,
        "active_subtask_count": active_subtasks,
        "completed_tasks": completed_total,
        "overdue_tasks": overdue_tasks,
        "open_issues": open_issues,
        "assigned_tasks": assigned_tasks,
        "workload_status": status_key,
        "workload_label": status_label,
    }


def get_organization_team_workload(organization, today=None):
    from accounts.models import User

    today = today or timezone.localdate()
    members = User.objects.filter(organization=organization).order_by("name")
    rows = [
        compute_member_workload(user, organization=organization, today=today)
        for user in members
    ]
    rows.sort(key=lambda row: row["active_tasks"], reverse=True)
    return rows


def get_project_team_workload(project, today=None):
    today = today or timezone.localdate()
    members = project.members.all().order_by("name")
    return [
        compute_member_workload(
            user,
            organization=project.organization,
            project=project,
            today=today,
        )
        for user in members
    ]


def get_workload_charts(organization, today=None):
    today = today or timezone.localdate()
    team = get_organization_team_workload(organization, today=today)
    thresholds = get_thresholds()

    task_qs = _task_queryset(organization=organization)
    subtask_qs = _subtask_queryset(organization=organization)

    active_count = (
        task_qs.exclude(status=DONE_STATUS).count()
        + subtask_qs.exclude(status=DONE_STATUS).count()
    )
    completed_count = (
        task_qs.filter(status=DONE_STATUS).count()
        + subtask_qs.filter(status=DONE_STATUS).count()
    )
    overdue_count = (
        task_qs.filter(due_date__lt=today)
        .exclude(status=DONE_STATUS)
        .count()
        + subtask_qs.filter(due_date__lt=today)
        .exclude(status=DONE_STATUS)
        .count()
    )

    task_distribution = [
        {"name": "Active", "value": active_count},
        {"name": "Completed", "value": completed_count},
        {"name": "Overdue", "value": overdue_count},
        {
            "name": "Open Issues",
            "value": _issue_queryset(organization=organization)
            .filter(status__in=OPEN_ISSUE_STATUSES)
            .count(),
        },
    ]

    status_counts = {
        "underutilized": 0,
        "balanced": 0,
        "overloaded": 0,
    }
    for row in team:
        status_counts[row["workload_status"]] = (
            status_counts.get(row["workload_status"], 0) + 1
        )

    workload_distribution = [
        {
            "name": WORKLOAD_STATUS_LABELS[key],
            "value": status_counts.get(key, 0),
            "status": key,
        }
        for key in ("underutilized", "balanced", "overloaded")
    ]

    overloaded_employees = [
        {
            "name": row["name"],
            "active_tasks": row["active_tasks"],
            "overdue_tasks": row["overdue_tasks"],
            "workload_label": row["workload_label"],
        }
        for row in team
        if row["workload_status"] == "overloaded"
    ]

    return {
        "thresholds": thresholds,
        "task_distribution": task_distribution,
        "workload_distribution": workload_distribution,
        "overloaded_employees": overloaded_employees,
        "team_workload": team,
    }
