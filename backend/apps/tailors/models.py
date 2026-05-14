from django.conf import settings
from django.db import models

from apps.core.models import SoftDeleteModel


class TailorProfile(SoftDeleteModel):
    STATUS_AVAILABLE = "available"
    STATUS_BUSY = "busy"
    STATUS_OFFLINE = "offline"

    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Disponible"),
        (STATUS_BUSY, "Charge"),
        (STATUS_OFFLINE, "Absent"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tailor_profile",
    )
    full_name = models.CharField(max_length=160)
    phone = models.CharField(max_length=40, blank=True)
    specialty = models.CharField(max_length=120, blank=True)
    skills = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default=STATUS_AVAILABLE)
    quality_score = models.DecimalField(max_digits=4, decimal_places=2, default=4.50)
    average_delay_days = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name

