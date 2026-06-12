from rest_framework import status
from rest_framework.test import APITestCase
from django.utils import timezone
from accounts.models import User
from organizations.models import Organization
from leave_management.models import LeaveRequest, LeaveBalance
from leave_management.serializers import LeaveBalanceSerializer


class LeaveBalanceOptimizationTests(APITestCase):
    def setUp(self):
        # Create Organization
        self.org = Organization.objects.create(
            name="Test Org",
            email="test@org.com",
            phone="123-456",
            is_active=True
        )

        # Create Manager User
        self.manager = User.objects.create_user(
            email="manager@org.com",
            password="password123",
            name="Manager",
            role="manager",
            organization=self.org
        )

        # Create 5 Employees
        self.employees = []
        for i in range(5):
            emp = User.objects.create_user(
                email=f"employee{i}@org.com",
                password="password123",
                name=f"Employee {i}",
                role="employee",
                organization=self.org
            )
            self.employees.append(emp)
            
            # Precreate balances for these users
            for lt in ["annual", "sick", "casual", "personal"]:
                LeaveBalance.objects.create(
                    employee=emp,
                    organization=self.org,
                    leave_type=lt,
                    allocated_days=20 if lt == "annual" else 10
                )

        # Create some approved leave requests
        for i, emp in enumerate(self.employees):
            # 2 days annual leave
            LeaveRequest.objects.create(
                employee=emp,
                organization=self.org,
                leave_type="annual",
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timezone.timedelta(days=1),
                reason="Rest",
                status="approved"
            )
            # 1 day sick leave
            LeaveRequest.objects.create(
                employee=emp,
                organization=self.org,
                leave_type="sick",
                start_date=timezone.now().date(),
                end_date=timezone.now().date(),
                reason="Fever",
                status="approved"
            )
            # 3 days vacation leave (should map to annual)
            LeaveRequest.objects.create(
                employee=emp,
                organization=self.org,
                leave_type="vacation",
                start_date=timezone.now().date(),
                end_date=timezone.now().date() + timezone.timedelta(days=2),
                reason="Vacation trip",
                status="approved"
            )

        self.client.force_authenticate(user=self.manager)

    def test_leave_balances_calculations_correctness(self):
        # Retrieve the balances for employee 0
        emp = self.employees[0]
        balances = LeaveBalance.objects.filter(employee=emp)
        
        # Prefetch used days
        balances = LeaveBalance.prefetch_used_days(balances)
        
        # Verify annual balance (2 days annual + 3 days vacation = 5 used days)
        annual_bal = next(b for b in balances if b.leave_type == "annual")
        self.assertEqual(annual_bal.used_days, 5)
        self.assertEqual(annual_bal.remaining_days, 15)

        # Verify sick balance (1 day sick)
        sick_bal = next(b for b in balances if b.leave_type == "sick")
        self.assertEqual(sick_bal.used_days, 1)
        self.assertEqual(sick_bal.remaining_days, 9)

        # Verify default behavior without prefetch (fallback)
        balances_no_prefetch = LeaveBalance.objects.filter(employee=emp)
        for b in balances_no_prefetch:
            self.assertFalse(hasattr(b, "_precalculated_used_days"))
        
        annual_bal_fallback = next(b for b in balances_no_prefetch if b.leave_type == "annual")
        self.assertEqual(annual_bal_fallback.used_days, 5)

    def test_n_plus_one_query_optimization(self):
        # Fetch all balances for organization and evaluate to list to avoid counting the balance list query itself
        balances = list(LeaveBalance.objects.filter(organization=self.org).select_related("employee"))
        
        # We assert that executing prefetch_used_days and serializing all items executes exactly 1 database query (to get LeaveRequests)
        with self.assertNumQueries(1):
            precalculated_balances = LeaveBalance.prefetch_used_days(balances)
            serializer = LeaveBalanceSerializer(precalculated_balances, many=True)
            data = serializer.data
            
        # Verify correctness of serialized data for employee 0
        emp0_annual = next(
            item for item in data 
            if item["employee_email"] == "employee0@org.com" and item["leave_type"] == "annual"
        )
        self.assertEqual(emp0_annual["used_days"], 5)
        self.assertEqual(emp0_annual["remaining_days"], 15)

    def test_api_endpoint_uses_optimization(self):
        # Make a request to the balances listing API endpoint
        # With optimization, the number of queries is minimal/fixed, and serialization itself doesn't cause any extra queries.
        response = self.client.get("/api/leave/balances/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify response matches expected values (5 employees + 1 manager = 6 users * 4 types = 24 balances)
        data = response.data
        self.assertEqual(len(data), (len(self.employees) + 1) * 4)
