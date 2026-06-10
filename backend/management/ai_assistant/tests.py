from unittest.mock import patch
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from accounts.models import User
from organizations.models import Organization

class AIChatViewTests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(
            name="Test Org",
            email="org@test.com",
            phone="12345"
        )
        self.user = User.objects.create_user(
            email="user@test.com",
            password="password123",
            name="Test User",
            role="employee",
            organization=self.org
        )
        self.url = reverse("ai-chat")

    def test_unauthenticated_requests_are_blocked(self):
        response = self.client.post(self.url, {"message": "Hello"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_message_returns_bad_request(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.url, {"history": []})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("message", response.data)

    def test_user_without_organization_returns_bad_request(self):
        no_org_user = User.objects.create_user(
            email="noorg@test.com",
            password="password123",
            name="No Org User",
            role="employee",
            organization=None
        )
        self.client.force_authenticate(user=no_org_user)
        response = self.client.post(self.url, {"message": "Hello"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("ai_assistant.providers.gemini_provider.generate_text")
    def test_successful_chat_interaction(self, mock_generate_text):
        mock_generate_text.return_value = "Mocked Gemini response"
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post(self.url, {
            "message": "Hello AI Co-pilot",
            "history": [{"role": "user", "text": "Hi"}]
        }, format="json")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["response"], "Mocked Gemini response")
        mock_generate_text.assert_called_once()
