import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.base_user import BaseUserManager


class UserQuerySet(models.QuerySet):

    def active_recently(self):
        from django.utils import timezone
        return self.filter(last_login__gt=timezone.now() - timezone.timedelta(hours=2))

    def platform_admins(self):
        return self.filter(role="platform_admin")


class UserManager(BaseUserManager):

    def get_queryset(self):
        return UserQuerySet(self.model, using=self._db)

    def active_recently(self):
        return self.get_queryset().active_recently()

    def platform_admins(self):
        return self.get_queryset().platform_admins()

    def create_user(self, email, password=None, **extra_fields):

        if not email:
            raise ValueError("Email is required")

        email = self.normalize_email(email)

        user = self.model(
            email=email,
            **extra_fields
        )

        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, email, password=None, **extra_fields):

        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_email_verified", True)

        return self.create_user(
            email,
            password,
            **extra_fields
        )


class User(AbstractBaseUser, PermissionsMixin):

    ROLE_CHOICES = [
        ("platform_admin", "Platform Admin"),
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("employee", "Employee"),
    ]

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    email = models.EmailField(
        unique=True
    )

    name = models.CharField(
        max_length=255
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="employee",
        db_index=True
    )

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True
    )

    is_email_verified = models.BooleanField(
        default=False
    )

    is_staff = models.BooleanField(
        default=False
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        db_index=True
    )
    PROFILE_STATUS_CHOICES = [

        ("available", "Available"),

        ("busy", "Busy"),

        ("meeting", "In Meeting"),

        ("focused", "Focused"),

        ("offline", "Offline"),
    ]
    profile_picture = models.ImageField(
        upload_to="profile_pictures/",
        null=True,
        blank=True
    )

    bio = models.TextField(
        blank=True,
        null=True
    )

    designation = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    department = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True
    )

    work_status = models.CharField(
        max_length=20,
        choices=PROFILE_STATUS_CHOICES,
        default="available"
    )

    joined_at = models.DateTimeField(
        auto_now_add=True
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        indexes = [
            models.Index(fields=["last_login"]),
        ]

    def __str__(self):
        return self.email