from django.db.models.signals import post_save
from django.dispatch import receiver

from projects.models import Project
from tasks.models import Task
from tasks.models import SubTask
from issues.models import Issue

from knowledge_base.services.sync_service import (
    sync_project,
    sync_task,
    sync_subtask,
    sync_issue,
)

@receiver(post_save, sender=Project)
def project_saved(sender, instance, **kwargs):
    sync_project(instance)



@receiver(post_save, sender=Task)
def task_saved(sender, instance, **kwargs):
    sync_task(instance)

@receiver(post_save, sender=Issue)
def issue_saved(sender, instance, **kwargs):
    sync_issue(instance)


@receiver(post_save, sender=SubTask)
def subtask_saved(sender, instance, **kwargs):
    sync_subtask(instance)