from django.db import transaction, models
from knowledge_base.models import Document
from knowledge_base.embeddings import get_embedding
from knowledge_base.chunking import split_text


def _sync_entity(organization, source_type, source_id_str, title, metadata_header, description, footer_info=""):
    """
    Helper to chunk a description, format it with headers/footers, generate embeddings,
    and update Document records atomically.
    """
    desc_clean = (description or "").strip()
    
    # Chunk the description using split_text (max_chars=600, overlap=120)
    chunks = split_text(desc_clean, max_chars=600, overlap=120)
    
    # If there are no chunks (e.g., empty description), create at least one empty chunk to index the entity details
    if not chunks:
        chunks = [""]
        
    with transaction.atomic():
        # Delete any previous documents matching the exact id or chunk id pattern
        Document.objects.filter(
            source_type=source_type
        ).filter(
            models.Q(source_id=source_id_str) | models.Q(source_id__startswith=f"{source_id_str}_chunk_")
        ).delete()
        
        # Save each chunk
        for idx, chunk in enumerate(chunks):
            # Create a descriptive title for this chunk
            chunk_title = title if len(chunks) == 1 else f"{title} (Part {idx + 1}/{len(chunks)})"
            
            content_parts = [metadata_header]
            if chunk:
                content_parts.append(f"Description:\n{chunk}")
            if footer_info:
                content_parts.append(footer_info)
                
            formatted_content = "\n\n".join(content_parts).strip()
            embedding = get_embedding(formatted_content)
            
            Document.objects.create(
                organization=organization,
                source_type=source_type,
                source_id=f"{source_id_str}_chunk_{idx}",
                title=chunk_title,
                content=formatted_content,
                embedding=embedding
            )


def sync_project(project):
    metadata_header = f"Project: {project.name}"
    footer_info = f"Status: {project.status}\nPriority: {project.priority}"
    
    _sync_entity(
        organization=project.organization,
        source_type="project",
        source_id_str=str(project.id),
        title=project.name,
        metadata_header=metadata_header,
        description=project.description,
        footer_info=footer_info
    )


def sync_task(task):
    metadata_header = f"Task: {task.title}\nProject: {task.project.name}"
    footer_info = f"Status: {task.status}\nPriority: {task.priority}"
    
    _sync_entity(
        organization=task.project.organization,
        source_type="task",
        source_id_str=str(task.id),
        title=task.title,
        metadata_header=metadata_header,
        description=task.description,
        footer_info=footer_info
    )


def sync_issue(issue):
    metadata_header = f"Issue: {issue.title}\nProject: {issue.project.name}"
    footer_info = f"Status: {issue.status}\nPriority: {issue.priority}"
    
    _sync_entity(
        organization=issue.project.organization,
        source_type="issue",
        source_id_str=str(issue.id),
        title=issue.title,
        metadata_header=metadata_header,
        description=issue.description,
        footer_info=footer_info
    )


def sync_subtask(subtask):
    metadata_header = f"Subtask: {subtask.title}\nTask: {subtask.task.title}\nProject: {subtask.task.project.name}"
    footer_info = f"Status: {subtask.status}\nPriority: {subtask.priority}"
    
    _sync_entity(
        organization=subtask.task.project.organization,
        source_type="subtask",
        source_id_str=str(subtask.id),
        title=subtask.title,
        metadata_header=metadata_header,
        description=subtask.description,
        footer_info=footer_info
    )