from knowledge_base.models import Document
from knowledge_base.embeddings import get_embedding


def sync_project(project):

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


def sync_task(task):

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


def sync_issue(issue):

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


def sync_subtask(subtask):

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