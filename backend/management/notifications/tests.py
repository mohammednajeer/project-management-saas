from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from datetime import timedelta

from accounts.models import User
from organizations.models import Organization
from projects.models import Project, ProjectMilestone
from tasks.models import Task, SubTask
from notifications.models import Notification
from notifications.tasks import (
    check_deadlines_and_remind,
    send_daily_digest,
    send_weekly_summary
)


class NotificationAPITests(APITestCase):

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Org",
            email="testorg@example.com",
            phone="1234567890"
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            name="Admin User",
            role="admin",
            organization=self.org
        )
        self.employee = User.objects.create_user(
            email="employee@example.com",
            password="password123",
            name="Employee User",
            role="employee",
            organization=self.org
        )

        self.n1 = Notification.objects.create(
            user=self.employee,
            title="Task Assigned",
            message="You have been assigned a task.",
            type="task_assigned",
            category="task",
            is_read=False
        )
        self.n2 = Notification.objects.create(
            user=self.employee,
            title="System Alert",
            message="System is undergoing maintenance.",
            type="welcome_employee",
            category="system",
            is_read=True
        )

    def test_list_notifications_no_auth(self):
        url = "/api/notifications/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_list_notifications_all(self):
        self.client.force_authenticate(user=self.employee)
        url = "/api/notifications/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_list_notifications_unread_filter(self):
        self.client.force_authenticate(user=self.employee)
        url = "/api/notifications/?unread=true"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.n1.id))

    def test_list_notifications_category_filter(self):
        self.client.force_authenticate(user=self.employee)
        url = "/api/notifications/?category=system"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.n2.id))

    def test_mark_all_read(self):
        self.client.force_authenticate(user=self.employee)
        url = "/api/notifications/mark-all-read/"
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.n1.refresh_from_db()
        self.assertTrue(self.n1.is_read)


class NotificationCeleryTaskTests(TestCase):

    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Org",
            email="testorg@example.com",
            phone="1234567890"
        )
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="password123",
            name="Admin User",
            role="admin",
            organization=self.org
        )
        self.employee = User.objects.create_user(
            email="employee@example.com",
            password="password123",
            name="Employee User",
            role="employee",
            organization=self.org
        )
        self.project = Project.objects.create(
            name="Test Project",
            due_date=timezone.localdate() + timedelta(days=3),
            organization=self.org,
            created_by=self.admin_user,
            project_lead=self.admin_user
        )

    def test_task_deadline_reminders(self):
        task = Task.objects.create(
            title="Task Due Soon",
            project=self.project,
            created_by=self.admin_user,
            due_date=timezone.localdate() + timedelta(days=3)
        )
        task.assigned_to.add(self.employee)

        check_deadlines_and_remind()

        notifications = Notification.objects.filter(user=self.employee, type="task_reminder")
        self.assertTrue(notifications.exists())
        self.assertIn("Task Due Soon", notifications.first().title)

    def test_task_overdue_tracking(self):
        task = Task.objects.create(
            title="Overdue Task",
            project=self.project,
            created_by=self.admin_user,
            due_date=timezone.localdate() - timedelta(days=1)
        )
        task.assigned_to.add(self.employee)

        check_deadlines_and_remind()

        task.refresh_from_db()
        self.assertTrue(task.is_overdue)

        notifications = Notification.objects.filter(user=self.employee, type="task_overdue")
        self.assertTrue(notifications.exists())
