from django.utils import timezone

HEALTH_HEALTHY = "healthy"
HEALTH_ATTENTION = "attention"
HEALTH_AT_RISK = "at_risk"

HEALTH_LABELS = {
    HEALTH_HEALTHY: "Healthy",
    HEALTH_ATTENTION: "Attention",
    HEALTH_AT_RISK: "At Risk",
}

OPEN_ISSUE_STATUSES = ("open", "investigating")


def collect_health_signals(project, today=None):
    today = today or timezone.localdate()

    tasks = project.tasks.all()
    total_tasks = tasks.count()
    completed_tasks = tasks.filter(status="done").count()
    completion_pct = (
        round((completed_tasks / total_tasks) * 100) if total_tasks else 100
    )

    overdue_tasks = (
        tasks.filter(due_date__lt=today).exclude(status="done").count()
    )

    critical_issues = project.issues.filter(
        priority="critical",
        status__in=OPEN_ISSUE_STATUSES,
    ).count()

    milestones = project.milestones.all()
    milestone_total = milestones.count()
    milestone_completed = milestones.filter(status="completed").count()
    overdue_milestones = (
        milestones.filter(target_date__lt=today)
        .exclude(status="completed")
        .count()
    )
    milestone_progress_pct = (
        round((milestone_completed / milestone_total) * 100)
        if milestone_total
        else 100
    )

    days_to_deadline = None
    approaching_deadline = False
    deadline_passed = False
    if project.due_date:
        days_to_deadline = (project.due_date - today).days
        approaching_deadline = 0 <= days_to_deadline <= 7
        deadline_passed = days_to_deadline < 0

    return {
        "completion_pct": completion_pct,
        "overdue_tasks": overdue_tasks,
        "critical_issues": critical_issues,
        "overdue_milestones": overdue_milestones,
        "milestone_progress_pct": milestone_progress_pct,
        "approaching_deadline": approaching_deadline,
        "deadline_passed": deadline_passed,
        "days_to_deadline": days_to_deadline,
    }


def calculate_health(signals):
    overdue = signals["overdue_tasks"]
    critical = signals["critical_issues"]
    completion = signals["completion_pct"]
    overdue_ms = signals["overdue_milestones"]
    days = signals["days_to_deadline"]
    approaching = signals["approaching_deadline"]
    passed = signals["deadline_passed"]

    if overdue >= 3 or critical >= 2 or overdue_ms >= 2:
        return HEALTH_AT_RISK

    if passed and completion < 80:
        return HEALTH_AT_RISK

    if days is not None and days <= 3 and completion < 40:
        return HEALTH_AT_RISK

    if overdue >= 1 and critical >= 1 and completion < 50:
        return HEALTH_AT_RISK

    if overdue >= 1 or critical >= 1 or overdue_ms >= 1:
        return HEALTH_ATTENTION

    if approaching and completion < 60:
        return HEALTH_ATTENTION

    if days is not None and days <= 7 and completion < 70:
        return HEALTH_ATTENTION

    return HEALTH_HEALTHY


def refresh_project_health(project, save=True):
    signals = collect_health_signals(project)
    health = calculate_health(signals)

    update_fields = []
    if project.health != health:
        project.health = health
        update_fields.append("health")

    if save and update_fields:
        project.health_updated_at = timezone.now()
        update_fields.append("health_updated_at")
        project.save(update_fields=update_fields)

    return health, signals
