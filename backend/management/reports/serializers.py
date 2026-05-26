from rest_framework import serializers


class DashboardStatsSerializer( serializers.Serializer):

    total_projects = serializers.IntegerField()

    total_tasks = serializers.IntegerField()

    completed_tasks = serializers.IntegerField()

    pending_tasks = serializers.IntegerField()

    overdue_tasks = serializers.IntegerField()

    total_issues = serializers.IntegerField()

    active_members = serializers.IntegerField()

    completion_rate = serializers.FloatField()