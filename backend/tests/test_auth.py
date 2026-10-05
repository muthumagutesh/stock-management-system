import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.authentication.models import CustomUser

@pytest.mark.django_db
class TestAuthentication:
    def setup_method(self):
        self.client = APIClient()
        self.user = CustomUser.objects.create_user(
            username='teststaff',
            email='teststaff@apexstock.io',
            password='StaffPassword@123',
            role=CustomUser.Role.STAFF
        )

    def test_login_success(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'teststaff',
            'password': 'StaffPassword@123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert response.data['user']['role'] == 'STAFF'

    def test_login_invalid_password(self):
        url = reverse('token_obtain_pair')
        response = self.client.post(url, {
            'username': 'teststaff',
            'password': 'WrongPassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_profile(self):
        self.client.force_authenticate(user=self.user)
        url = reverse('current_user')
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['user']['username'] == 'teststaff'
        assert response.data['permissions']['role'] == 'STAFF'
