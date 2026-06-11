import os
import subprocess
from django.utils import timezone
from django.conf import settings

from activities.models import Activity


def get_backup_dir():
    backup_dir = os.path.join(settings.BASE_DIR, 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    return backup_dir


def list_backups():
    backup_dir = get_backup_dir()
    backups_list = []
    for f in os.listdir(backup_dir):
        if f.endswith('.sql.gz'):
            p = os.path.join(backup_dir, f)
            stat = os.stat(p)
            backups_list.append({
                "id": f,
                "filename": f,
                "size": f"{round(stat.st_size / (1024 * 1024), 2)} MB" if stat.st_size >= 1024 * 1024 else f"{round(stat.st_size / 1024, 2)} KB",
                "created_at": timezone.datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                "status": "completed"
            })
    
    backups_list.sort(key=lambda x: x["created_at"], reverse=True)
    return backups_list


def create_backup(user):
    backup_dir = get_backup_dir()
    now = timezone.now()
    timestamp_str = now.strftime("%Y-%m-%d_%H%M%S")
    filename = f"projectflow_backup_{timestamp_str}.sql.gz"
    filepath = os.path.join(backup_dir, filename)
    
    env = os.environ.copy()
    env['PGPASSWORD'] = '1234567890'
    
    cmd = f"pg_dump -h db -U postgres -d project_management_db | gzip > {filepath}"
    
    try:
        result = subprocess.run(cmd, shell=True, env=env, capture_output=True, text=True)
        if result.returncode != 0:
            raise Exception(f"pg_dump failed: {result.stderr}")
            
        stat = os.stat(filepath)
        new_backup = {
            "id": filename,
            "filename": filename,
            "size": f"{round(stat.st_size / (1024 * 1024), 2)} MB" if stat.st_size >= 1024 * 1024 else f"{round(stat.st_size / 1024, 2)} KB",
            "created_at": now.isoformat(),
            "status": "completed",
        }
        
        Activity.objects.create(
            user=user,
            action="system_backup",
            message=f"Platform Admin {user.email} triggered a physical database backup."
        )
        
        return True, new_backup
    except Exception as e:
        return False, f"Failed to execute database backup: {str(e)}"
