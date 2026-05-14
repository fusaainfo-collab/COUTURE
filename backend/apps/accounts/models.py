from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class UserProfile(TimeStampedModel):
    ROLE_MANAGER = "manager"
    ROLE_TAILOR = "tailor"
    ROLE_CLIENT = "client"
    ROLE_ADMIN = "admin"

    ROLE_CHOICES = [
        (ROLE_MANAGER, "Gerant"),
        (ROLE_TAILOR, "Tailleur"),
        (ROLE_CLIENT, "Client"),
        (ROLE_ADMIN, "Administration"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    role = models.CharField(max_length=24, choices=ROLE_CHOICES, default=ROLE_MANAGER)
    phone = models.CharField(max_length=32, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    is_available = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.role}"

