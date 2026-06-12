from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from accounts.models import User
from organizations.models import Organization
from projects.models import Project
from tasks.models import Task, SubTask
from chat.models import GroupChannel, ChannelMessage


class GroupChannelAndMentionsTests(APITestCase):
    def setUp(self):
        # Create Organization A
        self.org_a = Organization.objects.create(
            name="Org A",
            email="org-a@test.com",
            phone="123-456",
            is_active=True
        )

        # Create Organization B (to test access restrictions)
        self.org_b = Organization.objects.create(
            name="Org B",
            email="org-b@test.com",
            phone="999-888",
            is_active=True
        )

        # Create Admin User for Org A
        self.admin_a = User.objects.create_user(
            email="admin-a@org.com",
            password="password123",
            name="Admin A",
            role="admin",
            organization=self.org_a
        )

        # Create Employee User for Org A
        self.employee_a = User.objects.create_user(
            email="employee-a@org.com",
            password="password123",
            name="Employee A",
            role="employee",
            organization=self.org_a
        )

        # Create User for Org B
        self.user_b = User.objects.create_user(
            email="user-b@org.com",
            password="password123",
            name="User B",
            role="employee",
            organization=self.org_b
        )

    def test_auto_create_project_channel_signal(self):
        # When a project is created, check that a GroupChannel is automatically spun up
        project = Project.objects.create(
            name="Alpha Release Sync",
            description="Alpha project",
            organization=self.org_a,
            status="active",
            created_by=self.admin_a
        )
        
        # Check that the channel exists
        channel = GroupChannel.objects.filter(project=project).first()
        self.assertIsNotNone(channel)
        self.assertEqual(channel.name, "alpha-release-sync")
        self.assertEqual(channel.organization, self.org_a)

    def test_group_channels_list_and_default_general(self):
        self.client.force_authenticate(user=self.employee_a)
        
        # Fetching channels should automatically create the default '#general' channel if it doesn't exist yet
        response = self.client.get("/api/chat/channels/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "general")
        self.assertTrue(response.data[0]["is_general"])

    def test_manual_channel_creation_rules(self):
        # Admins should be allowed to create custom channels
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.post("/api/chat/channels/", {
            "name": "Dev Discussion",
            "description": "Custom dev room"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "dev-discussion")

        # Regular employees should be forbidden from creating channels manually
        self.client.force_authenticate(user=self.employee_a)
        response = self.client.post("/api/chat/channels/", {
            "name": "Design Sync"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_channel_messages_access_restrictions(self):
        # Create a channel for Org A
        channel = GroupChannel.objects.create(
            organization=self.org_a,
            name="restricted-sync",
            is_general=False,
            created_by=self.admin_a
        )
        # Add employee_a as a explicit channel member
        channel.members.add(self.employee_a)

        # Post a message in the channel
        ChannelMessage.objects.create(
            channel=channel,
            sender=self.admin_a,
            content="Hello Org A team!"
        )

        # Org A employee should have access
        self.client.force_authenticate(user=self.employee_a)
        response = self.client.get(f"/api/chat/channels/{channel.id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["content"], "Hello Org A team!")

        # Org B employee should receive 404 (hidden existence)
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(f"/api/chat/channels/{channel.id}/messages/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_mentions_search(self):
        self.client.force_authenticate(user=self.employee_a)

        # Create project and tasks/subtasks to search
        project = Project.objects.create(
            name="Project Beta",
            organization=self.org_a,
            created_by=self.admin_a
        )
        task = Task.objects.create(
            title="Design Frontend Layout",
            project=project,
            created_by=self.admin_a
        )
        subtask = SubTask.objects.create(
            title="Create Figma Wireframes",
            task=task
        )

        # Query the search endpoint for "Design"
        response = self.client.get("/api/chat/mentions-search/?q=Design")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "task")
        self.assertEqual(response.data[0]["title"], "Design Frontend Layout")

        # Query the search endpoint for "Wireframes"
        response = self.client.get("/api/chat/mentions-search/?q=Wireframes")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["type"], "subtask")
        self.assertEqual(response.data[0]["title"], "Create Figma Wireframes")
        self.assertEqual(response.data[0]["parent_task_title"], "Design Frontend Layout")

    def test_skip_project_channel_creation(self):
        # Instantiate project with _skip_channel_creation set
        project = Project(
            name="No Channel Project",
            organization=self.org_a,
            created_by=self.admin_a
        )
        project._skip_channel_creation = True
        project.save()

        # Check that no group channel is created
        self.assertFalse(GroupChannel.objects.filter(project=project).exists())

    def test_create_channel_linked_to_project(self):
        self.client.force_authenticate(user=self.admin_a)
        project = Project.objects.create(
            name="Project Gamma",
            organization=self.org_a,
            created_by=self.admin_a
        )
        
        response = self.client.post("/api/chat/channels/", {
            "name": "Gamma Backlog Sync",
            "description": "Linked project channel",
            "project_id": str(project.id)
        }, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        channel = GroupChannel.objects.get(id=response.data["id"])
        self.assertEqual(channel.project, project)

    def test_channel_members_and_invite_flows(self):
        # Create a custom channel
        channel = GroupChannel.objects.create(
            organization=self.org_a,
            name="custom-manual-room",
            is_general=False,
            created_by=self.admin_a
        )
        channel.members.add(self.admin_a)

        # 1. Fetch channel members - admin has access
        self.client.force_authenticate(user=self.admin_a)
        response = self.client.get(f"/api/chat/channels/{channel.id}/members/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], str(self.admin_a.id))

        # 2. Invite employee_a to custom channel - Admin role should succeed
        invite_res = self.client.post(f"/api/chat/channels/{channel.id}/invite/", {
            "user_ids": [str(self.employee_a.id)]
        }, format="json")
        self.assertEqual(invite_res.status_code, status.HTTP_200_OK)
        self.assertTrue(channel.members.filter(id=self.employee_a.id).exists())

        # 3. Non-organization user cannot be invited
        cross_org_invite = self.client.post(f"/api/chat/channels/{channel.id}/invite/", {
            "user_ids": [str(self.user_b.id)]
        }, format="json")
        self.assertFalse(channel.members.filter(id=self.user_b.id).exists())

        # 4. Try to invite members to a project channel directly (should fail)
        project_channel = GroupChannel.objects.create(
            organization=self.org_a,
            project=Project.objects.create(name="Proj", organization=self.org_a, created_by=self.admin_a),
            name="project-channel-fail",
            is_general=False,
            created_by=self.admin_a
        )
        project_invite = self.client.post(f"/api/chat/channels/{project_channel.id}/invite/", {
            "user_ids": [str(self.employee_a.id)]
        }, format="json")
        self.assertEqual(project_invite.status_code, status.HTTP_400_BAD_REQUEST)

