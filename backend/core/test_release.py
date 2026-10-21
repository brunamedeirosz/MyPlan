from unittest.mock import patch

from django.core.cache import cache
from django.db import OperationalError
from django.test import TestCase
from rest_framework.test import APIClient


class ReleaseTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def tearDown(self):
        cache.clear()

    def test_health_checks_database_without_exposing_details(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})
        with patch('core.health.connection.cursor', side_effect=OperationalError('private database details')):
            response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {'status': 'unavailable'})

    def test_login_attempts_are_limited(self):
        with patch('core.throttles.LoginThrottle.get_rate', return_value='2/min'):
            for _ in range(2):
                self.assertEqual(self.client.post('/api/token/', {'username': 'unknown', 'password': 'wrong'}).status_code, 401)
            response = self.client.post('/api/token/', {'username': 'unknown', 'password': 'wrong'})
            self.assertEqual(response.status_code, 429)
            self.assertIn('Retry-After', response)

    def test_registration_attempts_are_limited(self):
        with patch('core.throttles.RegistrationThrottle.get_rate', return_value='1/hour'):
            self.assertEqual(self.client.post('/api/registro/', {}).status_code, 400)
            self.assertEqual(self.client.post('/api/registro/', {}).status_code, 429)
