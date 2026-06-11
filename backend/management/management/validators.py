import os
from django.core.exceptions import ValidationError

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Whitelist of safe, standard file formats
ALLOWED_EXTENSIONS = {
    # Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    # Documents
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv', '.md',
    # Archives
    '.zip', '.tar', '.gz', '.rar', '.7z',
    # Audio/Video
    '.mp3', '.wav', '.mp4', '.mov', '.avi', '.mkv'
}

def validate_file(uploaded_file):
    # Check size limit
    if uploaded_file.size > MAX_FILE_SIZE:
        raise ValidationError(
            f"File '{uploaded_file.name}' exceeds the maximum allowed size of 10MB."
        )

    # Check extension limit
    _, ext = os.path.splitext(uploaded_file.name)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"File extension '{ext}' for file '{uploaded_file.name}' is not allowed. "
            f"Allowed extensions are standard documents, images, archives, and media files."
        )
