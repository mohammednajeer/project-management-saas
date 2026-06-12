from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from issues.models import Issue
from tasks.models import Task
from notifications.models import Notification

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


@receiver(pre_save, sender=ProjectMilestone)
def track_milestone_status_change(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = ProjectMilestone.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except ProjectMilestone.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=ProjectMilestone)
def refresh_health_on_milestone_save(sender, instance, created, **kwargs):
    refresh_project_health(instance.project)

    old_status = getattr(instance, "_old_status", None)
    if not created and old_status != "completed" and instance.status == "completed":
        project = instance.project
        users_to_notify = set()
        
        if project.project_lead:
            users_to_notify.add(project.project_lead)
            
        for member in project.members.all():
            users_to_notify.add(member)
            
        for manager in project.organization.users.filter(role="manager"):
            users_to_notify.add(manager)
            
        for user in users_to_notify:
            Notification.objects.create(
                user=user,
                title="Milestone Completed",
                message=f"Milestone '{instance.title}' in project '{project.name}' has been completed.",
                type="milestone_completed",
                category="milestone"
            )


@receiver(post_delete, sender=ProjectMilestone)
def refresh_health_on_milestone_delete(sender, instance, **kwargs):
    _refresh_for_project_id(instance.project_id)


@receiver(post_save, sender="projects.Project")
def auto_create_project_channel(sender, instance, created, **kwargs):
    if created:
        if getattr(instance, "_skip_channel_creation", False):
            return
        from chat.models import GroupChannel
        import re
        name = instance.name.strip().lower()
        name = re.sub(r'[^a-z0-9\s-]', '', name)
        name = re.sub(r'[\s_]+', '-', name)
        name = name[:50]
        if not name:
            name = f"project-{instance.id.hex[:6]}"

        original_name = name
        counter = 1
        while GroupChannel.objects.filter(organization=instance.organization, name=name).exists():
            name = f"{original_name}-{counter}"
            counter += 1

        GroupChannel.objects.create(
            organization=instance.organization,
            project=instance,
            name=name,
            description=f"Group discussion channel for project '{instance.name}'",
            created_by=instance.created_by
        )


@receiver(post_save, sender="tasks.SubTask")
def sync_issue_status_on_subtask_save(sender, instance, **kwargs):
    from issues.models import Issue
    
    if instance.status == "in_progress":
        issues_to_update = Issue.objects.filter(subtask=instance, status="open")
        for issue in issues_to_update:
            issue.status = "investigating"
            issue.save(update_fields=["status"])
    elif instance.status == "done":
        issues_to_update = Issue.objects.filter(subtask=instance, status__in=["open", "investigating"])
        for issue in issues_to_update:
            issue.status = "resolved"
            issue.save(update_fields=["status"])

