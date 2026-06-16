from django.core.management.base import BaseCommand
from projects.models import Project
from tasks.models import Task,SubTask
from issues.models import Issue
from knowledge_base.embeddings import get_embedding
from knowledge_base.models import Document


class Command(BaseCommand):

    def handle(self, *args, **kwargs):

        for project in Project.objects.all():


            content = f"""
            Project: {project.name}

            Description:
            {project.description}

            Status:
            {project.status}

            Priority:
            {project.priority}
            """

            embedding = get_embedding(content)

            Document.objects.update_or_create(
                source_type="project",
                source_id=str(project.id),
                defaults={
                    "organization": project.organization,
                    "title": project.name,
                    "content": content,
                    "embedding": embedding,
                }
            )

        for task in Task.objects.select_related("project"):

            content = f"""
            Task: {task.title}

            Project:
            {task.project.name}

            Description:
            {task.description}

            Status:
            {task.status}

            Priority:
            {task.priority}
            """

            embedding = get_embedding(content)

            Document.objects.update_or_create(
                source_type="task",
                source_id=str(task.id),
                defaults={
                    "organization": task.project.organization,
                    "title": task.title,
                    "content": content,
                    "embedding": embedding,
                }
            )

        for issue in Issue.objects.select_related("project"):

            content = f"""
            Issue: {issue.title}

            Project:
            {issue.project.name}

            Description:
            {issue.description}

            Status:
            {issue.status}

            Priority:
            {issue.priority}
            """

            embedding = get_embedding(content)

            Document.objects.update_or_create(
                source_type="issue",
                source_id=str(issue.id),
                defaults={
                    "organization": issue.project.organization,
                    "title": issue.title,
                    "content": content,
                    "embedding": embedding,
                }
            )

        for subtask in SubTask.objects.select_related("task","task__project"):

            content = f"""
            Subtask: {subtask.title}

            Task:
            {subtask.task.title}

            Project:
            {subtask.task.project.name}

            Description:
            {subtask.description}

            Status:
            {subtask.status}

            Priority:
            {subtask.priority}
            """

            embedding = get_embedding(content)

            Document.objects.update_or_create(
                source_type="subtask",
                source_id=str(subtask.id),
                defaults={
                    "organization": subtask.task.project.organization,
                    "title": subtask.title,
                    "content": content,
                    "embedding": embedding,
                }
            )
        
        self.stdout.write(self.style.SUCCESS("Knowledge base synced successfully"))