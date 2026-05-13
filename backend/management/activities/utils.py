from .models import Activity


def create_activity(
    *,
    organization,
    user,
    action,
    message,
    project=None,
    task=None,
    subtask=None,
):

    Activity.objects.create(

        organization=organization,

        user=user,

        action=action,

        message=message,

        project=project,

        task=task,

        subtask=subtask,
    )