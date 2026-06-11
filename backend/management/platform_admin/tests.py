from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization

class PlatformAdminTests(APITestCase):
    def setUp(self):
        # Create Organizations
        self.org1 = Organization.objects.create(
            name="Alpha Corp",
            email="info@alpha.com",
            phone="111-222",
            is_active=True
        )
        self.org2 = Organization.objects.create(
            name="Beta Inc",
            email="info@beta.com",
            phone="333-444",
            is_active=True
        )

        # Create Platform Admin User
        self.platform_admin = User.objects.create_user(
            email="platform@admin.com",
            password="password123",
            name="Platform Administrator",
            role="platform_admin",
            organization=None
        )

        # Create Regular User
        self.employee = User.objects.create_user(
            email="emp@alpha.com",
            password="password123",
            name="Alpha Employee",
            role="employee",
            organization=self.org1
        )

    def test_unauthenticated_requests_blocked(self):
        url = reverse("platform-stats")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_regular_user_access_forbidden(self):
        self.client.force_authenticate(user=self.employee)
        
        # Check Stats
        response = self.client.get(reverse("platform-stats"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Check Orgs List
        response = self.client.get(reverse("platform-organizations"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_admin_access_allowed(self):
        self.client.force_authenticate(user=self.platform_admin)
        
        # Check Stats
        response = self.client.get(reverse("platform-stats"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("totals", response.data)
        self.assertIn("system", response.data)
        self.assertEqual(response.data["totals"]["organizations"], 2)

        # Check Orgs List
        response = self.client.get(reverse("platform-organizations"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_toggle_organization_active_state(self):
        self.client.force_authenticate(user=self.platform_admin)
        url = reverse("platform-org-toggle", kwargs={"org_id": self.org2.id})
        
        # Deactivate
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_active"])
        
        # Verify db state
        self.org2.refresh_from_db()
        self.assertFalse(self.org2.is_active)

        # Re-activate
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_active"])
        
        # Verify db state
        self.org2.refresh_from_db()
        self.assertTrue(self.org2.is_active)

    def test_deactivated_org_login_blocked(self):
        # Deactivate Org1
        self.org1.is_active = False
        self.org1.save()

        # Try to login via Auth endpoint
        login_url = "/api/auth/login/"
        response = self.client.post(login_url, {
            "email": "emp@alpha.com",
            "password": "password123"
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("suspended", response.data.get("detail", "").lower() + response.data.get("message", "").lower())

    def test_platform_active_sessions_view(self):
        from django.utils import timezone
        self.platform_admin.last_login = timezone.now()
        self.platform_admin.save()
        
        self.employee.last_login = timezone.now() - timezone.timedelta(minutes=10)
        self.employee.save()

        user3 = User.objects.create_user(
            email="user3@alpha.com",
            password="password123",
            name="User Three",
            role="employee",
            organization=self.org1
        )
        user3.last_login = timezone.now() - timezone.timedelta(minutes=20)
        user3.save()

        # Admin request should succeed
        self.client.force_authenticate(user=self.platform_admin)
        response = self.client.get(reverse("platform-sessions"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)
        self.assertEqual(response.data[0]["user_email"], "platform@admin.com")

        # Non-admin request should fail
        self.client.force_authenticate(user=self.employee)
        response = self.client.get(reverse("platform-sessions"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_organizations_tier_view(self):
        self.client.force_authenticate(user=self.platform_admin)
        url = reverse("platform-org-tier", kwargs={"org_id": self.org1.id})

        # Test valid upgrade to 'pro'
        response = self.client.post(url, {"tier": "pro"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subscription_tier"], "pro")
        
        self.org1.refresh_from_db()
        self.assertEqual(self.org1.subscription_tier, "pro")

        # Test valid upgrade to 'enterprise'
        response = self.client.post(url, {"tier": "enterprise"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subscription_tier"], "enterprise")

        self.org1.refresh_from_db()
        self.assertEqual(self.org1.subscription_tier, "enterprise")

        # Test invalid tier value
        response = self.client.post(url, {"tier": "gold-deluxe"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        # Test unauthorized user
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(url, {"tier": "pro"})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_cache_clear_view(self):
        self.client.force_authenticate(user=self.platform_admin)
        url = reverse("platform-cache-clear")

        # Admin request should clear cache
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("evicted_keys", response.data)
        self.assertIn("evicted_bytes", response.data)
        self.assertEqual(response.data["status"], "Healthy")

        # Non-admin request should fail
        self.client.force_authenticate(user=self.employee)
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_organization_details_view(self):
        self.client.force_authenticate(user=self.platform_admin)
        url = reverse("platform-org-details", kwargs={"org_id": self.org1.id})

        # Test valid request
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["organization"]["name"], "Alpha Corp")
        self.assertIn("users", response.data)
        self.assertIn("projects", response.data)
        self.assertIn("activities", response.data)

        # Test invalid organization ID
        import uuid
        url_fake = reverse("platform-org-details", kwargs={"org_id": uuid.uuid4()})
        response = self.client.get(url_fake)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        # Test unauthorized regular user
        self.client.force_authenticate(user=self.employee)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_platform_users_list_view(self):
        self.client.force_authenticate(user=self.platform_admin)
        url = reverse("platform-users")

        # Test listing users
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 2)
        
        # Test searching users
        response = self.client.get(url, {"search": "Alpha"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(any(u["name"] == "Alpha Employee" for u in response.data))

        # Test filtering by role
        response = self.client.get(url, {"role": "employee"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(u["role"] == "employee" for u in response.data))

        # Test unauthorized regular user
        self.client.force_authenticate(user=self.employee)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_custom_user_manager(self):
        from django.utils import timezone
        
        # Test active_recently
        self.platform_admin.last_login = timezone.now()
        self.platform_admin.save()
        
        self.employee.last_login = timezone.now() - timezone.timedelta(hours=5)
        self.employee.save()
        
        active_users = User.objects.active_recently()
        self.assertIn(self.platform_admin, active_users)
        self.assertNotIn(self.employee, active_users)
        
        # Test platform_admins
        admins = User.objects.platform_admins()
        self.assertIn(self.platform_admin, admins)
        self.assertNotIn(self.employee, admins)


