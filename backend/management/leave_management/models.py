import uuid

from django.db import models


class LeaveRequest(models.Model):
    LEAVE_TYPE_CHOICES = [
        ("annual", "Annual Leave"),
        ("sick", "Sick Leave"),
        ("casual", "Casual Leave"),
        ("personal", "Personal Leave"),
        ("vacation", "Vacation Leave"),
        ("other", "Other"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    employee = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="leave_requests"
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="leave_requests"
    )

    leave_type = models.CharField(
        max_length=20,
        choices=LEAVE_TYPE_CHOICES
    )

    start_date = models.DateField()

    end_date = models.DateField()

    reason = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending"
    )

    approved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        related_name="approved_leave_requests",
        null=True,
        blank=True
    )

    approved_at = models.DateTimeField(
        null=True,
        blank=True
    )

    rejection_reason = models.TextField(
        blank=True,
        default=""
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.employee.name} - "
            f"{self.get_leave_type_display()} "
            f"({self.status})"
        )


class LeaveBalance(models.Model):
    LEAVE_TYPE_CHOICES = [
        ("annual", "Annual Leave"),
        ("sick", "Sick Leave"),
        ("casual", "Casual Leave"),
        ("personal", "Personal Leave"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    employee = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        related_name="leave_balances"
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="leave_balances"
    )

    leave_type = models.CharField(
        max_length=20,
        choices=LEAVE_TYPE_CHOICES
    )

    allocated_days = models.IntegerField(default=0)

    class Meta:
        unique_together = ("employee", "leave_type")

    @property
    def used_days(self):
        types_to_query = [self.leave_type]
        if self.leave_type == "annual":
            types_to_query.append("vacation")

        requests = LeaveRequest.objects.filter(
            employee=self.employee,
            leave_type__in=types_to_query,
            status="approved"
        )
        total_days = 0
        for r in requests:
            total_days += (r.end_date - r.start_date).days + 1
        return total_days

    @property
    def remaining_days(self):
        return max(0, self.allocated_days - self.used_days)

    def __str__(self):
        return f"{self.employee.name} - {self.get_leave_type_display()} ({self.remaining_days}/{self.allocated_days})"


