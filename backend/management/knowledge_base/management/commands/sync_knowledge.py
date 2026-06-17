from django.core.management.base import BaseCommand
from projects.models import Project
from tasks.models import Task, SubTask
from issues.models import Issue
from knowledge_base.services.sync_service import (
    sync_project,
    sync_task,
    sync_issue,
    sync_subtask,
)


class Command(BaseCommand):
    help = "Syncs active projects, tasks, issues, and subtasks to the RAG knowledge base"

    def handle(self, *args, **kwargs):
        self.stdout.write("Syncing projects...")
        for project in Project.objects.all():
            sync_project(project)

        self.stdout.write("Syncing tasks...")
        for task in Task.objects.select_related("project"):
            sync_task(task)

        self.stdout.write("Syncing issues...")
        for issue in Issue.objects.select_related("project"):
            sync_issue(issue)

        self.stdout.write("Syncing subtasks...")
        for subtask in SubTask.objects.select_related("task", "task__project"):
            sync_subtask(subtask)
        
        self.stdout.write(self.style.SUCCESS("Knowledge base synced successfully"))