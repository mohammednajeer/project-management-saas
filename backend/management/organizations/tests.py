from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from organizations.models import Organization
from accounts.models import User

class OrganizationTeamViewTests(APITestCase):
    def setUp(self):
        # Create Organization
        self.org = Organization.objects.create(
            name="Org Team Test Org",
            email="teamtest@org.com",
            phone="999-999",
            is_active=True
        )

        # Create Manager
        self.manager = User.objects.create_user(
            email="mgr@teamtest.com",
            password="password123",
            name="Org Manager",
            role="manager",
            organization=self.org
        )

        # Create Employee
        self.employee = User.objects.create_user(
            email="emp@teamtest.com",
            password="password123",
            name="Org Employee",
            role="employee",
            organization=self.org
        )

        # URL for organization team list
        self.url = "/api/organizations/team/"

    def test_unauthenticated_request_is_unauthorized(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_can_list_team_members(self):
        self.client.force_authenticate(user=self.manager)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should include both manager and employee (and any other users in the org)
        self.assertEqual(len(response.data), 2)
        names = [u["name"] for u in response.data]
        self.assertIn("Org Manager", names)
        self.assertIn("Org Employee", names)

    def test_employee_can_list_team_members(self):
        self.client.force_authenticate(user=self.employee)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        names = [u["name"] for u in response.data]
        self.assertIn("Org Manager", names)
        self.assertIn("Org Employee", names)
