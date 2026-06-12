from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization
from tasks.models import Task, SubTask, TaskAttachment
from projects.models import Project, ProjectMilestone

class TaskDependencyTests(APITestCase):
    def setUp(self):
        # Create Organization
        self.org = Organization.objects.create(
            name="Test Org",
            email="test@org.com",
            phone="123-456",
            is_active=True
        )

        # Create Manager User (needed for modifying tasks)
        self.manager = User.objects.create_user(
            email="manager@org.com",
            password="password123",
            name="Project Manager",
            role="manager",
            organization=self.org
        )

        # Create Project
        self.project = Project.objects.create(
            name="Project A",
            description="Testing project",
            organization=self.org,
            status="active",
            created_by=self.manager
        )

        # Create other Project for cross-project testing
        self.other_project = Project.objects.create(
            name="Project B",
            description="Other testing project",
            organization=self.org,
            status="active",
            created_by=self.manager
        )

        # Create Tasks
        self.task1 = Task.objects.create(
            title="Task 1",
            project=self.project,
            created_by=self.manager,
            status="todo"
        )
        self.task2 = Task.objects.create(
            title="Task 2",
            project=self.project,
            created_by=self.manager,
            status="todo"
        )
        self.task3 = Task.objects.create(
            title="Task 3",
            project=self.project,
            created_by=self.manager,
            status="todo"
        )
        self.task_other = Task.objects.create(
            title="Task Other Project",
            project=self.other_project,
            created_by=self.manager,
            status="todo"
        )

        # Authenticate manager client
        self.client.force_authenticate(user=self.manager)

    def test_add_blocker_successfully(self):
        url = f"/api/tasks/task-detail/{self.task2.id}/"
        response = self.client.patch(url, {"blocked_by": [str(self.task1.id)]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Reload task2 and check it is blocked by task1
        self.task2.refresh_from_db()
        self.assertIn(self.task1, self.task2.blocked_by.all())

    def test_prevent_circular_dependency(self):
        # 1. Set Task 1 blocked by Task 2
        self.task1.blocked_by.add(self.task2)

        # 2. Try to set Task 2 blocked by Task 1 (should fail due to circularity)
        url = f"/api/tasks/task-detail/{self.task2.id}/"
        response = self.client.patch(url, {"blocked_by": [str(self.task1.id)]}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("blocked_by", response.data)
        self.assertTrue(any("Circular dependency" in err for err in response.data["blocked_by"]))

    def test_prevent_self_blocking(self):
        url = f"/api/tasks/task-detail/{self.task1.id}/"
        response = self.client.patch(url, {"blocked_by": [str(self.task1.id)]}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("blocked_by", response.data)
        self.assertTrue(any("cannot block itself" in err for err in response.data["blocked_by"]))

    def test_prevent_done_if_blocker_not_done(self):
        # 1. Set Task 2 blocked by Task 1
        self.task2.blocked_by.add(self.task1)

        # 2. Try to complete Task 2 (should fail)
        url = f"/api/tasks/task-detail/{self.task2.id}/"
        response = self.client.patch(url, {"status": "done"}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)
        self.assertTrue(any("Cannot complete task because it is blocked" in err for err in response.data["status"]))

    def test_allow_done_if_blocker_done(self):
        # 1. Set Task 2 blocked by Task 1
        self.task2.blocked_by.add(self.task1)
        
        # 2. Complete Task 1
        self.task1.status = "done"
        self.task1.save()

        # 3. Complete Task 2 (should succeed)
        url = f"/api/tasks/task-detail/{self.task2.id}/"
        response = self.client.patch(url, {"status": "done"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.task2.refresh_from_db()
        self.assertEqual(self.task2.status, "done")

    def test_prevent_blocker_from_different_project(self):
        url = f"/api/tasks/task-detail/{self.task2.id}/"
        response = self.client.patch(url, {"blocked_by": [str(self.task_other.id)]}, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("blocked_by", response.data)
        self.assertTrue(any("same project" in err for err in response.data["blocked_by"]))


class TaskAssigneeAndLeadPermissionTests(APITestCase):
    def setUp(self):
        # Create Organization
        self.org = Organization.objects.create(
            name="Perm Org",
            email="perm@org.com",
            phone="123-456",
            is_active=True
        )

        # Create Manager
        self.manager = User.objects.create_user(
            email="mgr@org.com",
            password="password123",
            name="Project Manager",
            role="manager",
            organization=self.org
        )

        # Create Project Lead Employee
        self.lead = User.objects.create_user(
            email="lead@org.com",
            password="password123",
            name="Project Lead",
            role="employee",
            organization=self.org
        )

        # Create Task Assignee Employee
        self.assignee = User.objects.create_user(
            email="assignee@org.com",
            password="password123",
            name="Task Assignee",
            role="employee",
            organization=self.org
        )

        # Create Other Project Member
        self.other_member = User.objects.create_user(
            email="other@org.com",
            password="password123",
            name="Other Member",
            role="employee",
            organization=self.org
        )

        # Create Non-member Employee
        self.non_member = User.objects.create_user(
            email="nonmember@org.com",
            password="password123",
            name="Non Member",
            role="employee",
            organization=self.org
        )

        # Create Project (lead set to self.lead, members include self.assignee and self.other_member)
        self.project = Project.objects.create(
            name="Perm Project",
            description="Project with leads and members",
            organization=self.org,
            status="active",
            created_by=self.manager,
            project_lead=self.lead
        )
        self.project.members.add(self.assignee, self.other_member)

        # Create Parent Task (assigned to self.assignee)
        self.task = Task.objects.create(
            title="Parent Task",
            description="Parent task description",
            project=self.project,
            created_by=self.manager,
            status="todo"
        )
        self.task.assigned_to.add(self.assignee)

    def test_assignee_can_update_status_and_assigned_to(self):
        self.client.force_authenticate(user=self.assignee)
        
        # Test status update
        url = f"/api/tasks/task/{self.task.id}/"
        response = self.client.patch(url, {"status": "in_progress"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, "in_progress")

        # Test assign employee in the project (only member is allowed)
        response = self.client.patch(url, {"assigned_to": [str(self.assignee.id), str(self.other_member.id)]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.task.assigned_to.count(), 2)

        # Test assign employee not in the project (should fail)
        response = self.client.patch(url, {"assigned_to": [str(self.assignee.id), str(self.non_member.id)]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_assignee_cannot_update_other_task_parameters(self):
        self.client.force_authenticate(user=self.assignee)
        url = f"/api/tasks/task/{self.task.id}/"
        
        # Try updating title
        response = self.client.patch(url, {"title": "Malicious Title Update"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Try updating priority
        response = self.client.patch(url, {"priority": "critical"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_assignee_can_crud_subtask(self):
        self.client.force_authenticate(user=self.assignee)
        
        # Create subtask
        url_create = f"/api/tasks/subtasks/{self.task.id}/"
        response = self.client.post(url_create, {
            "title": "Subtask 1",
            "description": "Subtask desc",
            "assigned_to": [str(self.assignee.id)],
            "status": "todo",
            "priority": "medium"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        subtask_id = response.data["id"]

        # Update subtask
        url_update = f"/api/tasks/subtask/{subtask_id}/"
        response = self.client.patch(url_update, {
            "title": "Updated Subtask Title",
            "status": "in_progress"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Delete subtask
        response = self.client.delete(url_update)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(SubTask.objects.filter(id=subtask_id).exists())

    def test_assignee_can_upload_and_delete_attachment(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        self.client.force_authenticate(user=self.assignee)
        
        dummy_file = SimpleUploadedFile("deliverable.txt", b"file content")
        url_upload = f"/api/tasks/{self.task.id}/attachments/upload/"
        
        response = self.client.post(url_upload, {"file": dummy_file}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        attachment_id = response.data["id"]

        # Delete attachment (assignee uploaded it, so they should be able to delete it)
        url_delete = f"/api/tasks/attachments/{attachment_id}/delete/"
        response = self.client.delete(url_delete)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_project_lead_permissions(self):
        self.client.force_authenticate(user=self.lead)

        # 1. Project lead can create milestone
        url_milestone = f"/api/projects/{self.project.id}/milestones/"
        response = self.client.post(url_milestone, {
            "title": "Milestone A",
            "description": "Milestone A desc",
            "target_date": "2026-06-30",
            "status": "pending"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        milestone_id = response.data["id"]

        # 2. Project lead can edit milestone
        url_milestone_detail = f"/api/projects/{self.project.id}/milestones/{milestone_id}/"
        response = self.client.patch(url_milestone_detail, {"title": "Updated Milestone A"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # 3. Project lead can create task
        url_task = f"/api/tasks/project/{self.project.id}/"
        response = self.client.post(url_task, {
            "title": "Lead Created Task",
            "status": "todo",
            "priority": "high"
        }, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 4. Project lead can add project member
        url_members = f"/api/projects/{self.project.id}/members/"
        response = self.client.post(url_members, {"members": [str(self.non_member.id)]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(self.project.members.filter(id=self.non_member.id).exists())

        # 5. Project lead can delete milestone
        response = self.client.delete(url_milestone_detail)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
