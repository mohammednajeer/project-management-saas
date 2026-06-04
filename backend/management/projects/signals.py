from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from issues.models import Issue
from tasks.models import Task

from .health import refresh_project_health
from .models import ProjectMilestone


def _refresh_for_project_id(project_id):
    if not project_id:
        return
    from .models import Project

    try:
        project = Project.objects.get(pk=project_id)
    except Project.DoesNotExist:
        return
    refresh_project_health(project)


@receiver(post_save, sender=Task)
def refresh_health_on_task_save(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)


@receiver(post_delete, sender=Task)
def refresh_health_on_task_delete(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)


@receiver(post_save, sender=Issue)
def refresh_health_on_issue_save(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)


@receiver(post_delete, sender=Issue)
def refresh_health_on_issue_delete(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)


@receiver(post_save, sender=ProjectMilestone)
def refresh_health_on_milestone_save(sender, instance, **kwargs):
    refresh_project_health(instance.project)


@receiver(post_delete, sender=ProjectMilestone)
def refresh_health_on_milestone_delete(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)
