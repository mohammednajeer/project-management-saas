from rest_framework import serializers

from accounts.models import User
from .health import HEALTH_LABELS, refresh_project_health
from .models import Project, ProjectMilestone
from .permissions import user_can_manage_projects


def serialize_user_brief(user):
    if not user:
        return None
    return {
        "id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "profile_picture": user.profile_picture.url if user.profile_picture else None,
        "initials": user.name[:2].upper() if user.name else "?",
    }


class ProjectMilestoneSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectMilestone
        fields = [
            "id",
            "title",
            "description",
            "target_date",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]


class ProjectSerializer(serializers.ModelSerializer):
    total_tasks = serializers.SerializerMethodField()
    completed_tasks = serializers.SerializerMethodField()
    members_data = serializers.SerializerMethodField()
    project_lead_data = serializers.SerializerMethodField()
    health_label = serializers.SerializerMethodField()
    milestone_progress = serializers.SerializerMethodField()
    milestones = serializers.SerializerMethodField()
    milestone_summary = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "priority",
            "status",
            "due_date",
            "organization",
            "created_by",
            "members",
            "members_data",
            "project_lead",
            "project_lead_data",
            "health",
            "health_label",
            "milestone_progress",
            "milestones",
            "milestone_summary",
            "created_at",
            "total_tasks",
            "completed_tasks",
        ]
        read_only_fields = [
            "organization",
            "created_by",
            "created_at",
            "health",
            "health_label",
            "milestone_progress",
            "milestones",
            "milestone_summary",
        ]

    def get_total_tasks(self, obj):
        return obj.tasks.count()

    def get_completed_tasks(self, obj):
        return obj.tasks.filter(status="done").count()

    def get_members_data(self, obj):
        return [serialize_user_brief(member) for member in obj.members.all()]

    def get_project_lead_data(self, obj):
        return serialize_user_brief(obj.project_lead)

    def get_health_label(self, obj):
        return HEALTH_LABELS.get(obj.health, "Healthy")

    def get_milestone_progress(self, obj):
        total = obj.milestones.count()
        if not total:
            return 100
        completed = obj.milestones.filter(status="completed").count()
        return round((completed / total) * 100)

    def get_milestones(self, obj):
        if not self.context.get("include_milestones"):
            return None
        return ProjectMilestoneSerializer(
            obj.milestones.all(),
            many=True,
        ).data

    def get_milestone_summary(self, obj):
        if not self.context.get("include_milestones"):
            return None

        from django.utils import timezone

        today = timezone.localdate()
        milestones = list(obj.milestones.all())

        upcoming = []
        completed = []
        overdue = []

        for milestone in milestones:
            payload = ProjectMilestoneSerializer(milestone).data
            if milestone.status == "completed":
                completed.append(payload)
            elif milestone.target_date < today:
                overdue.append(payload)
            else:
                upcoming.append(payload)

        return {
            "upcoming": upcoming,
            "completed": completed,
            "overdue": overdue,
            "progress": self.get_milestone_progress(obj),
        }

    def validate_project_lead(self, value):
        request = self.context.get("request")
        if value is None:
            return value
        if not request or not request.user.organization_id:
            raise serializers.ValidationError("Invalid organization context.")
        if value.organization_id != request.user.organization_id:
            raise serializers.ValidationError(
                "Project lead must belong to your organization."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if request and "project_lead" in attrs:
            if not user_can_manage_projects(request.user):
                raise serializers.ValidationError(
                    {"project_lead": "Only admins and managers can assign a project lead."}
                )
        return attrs

    def create(self, validated_data):
        project = super().create(validated_data)
        refresh_project_health(project)
        return project

    def update(self, instance, validated_data):
        project = super().update(instance, validated_data)
        refresh_project_health(project)
        return project
