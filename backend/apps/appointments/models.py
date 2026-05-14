from datetime import timedelta

from django.db import models
from django.utils import timezone

from apps.core.models import SoftDeleteModel


class Appointment(SoftDeleteModel):
    TYPE_FITTING = "fitting"
    TYPE_DELIVERY = "delivery"
    TYPE_CONSULTATION = "consultation"
    TYPE_URGENT = "urgent"

    TYPE_CHOICES = [
        (TYPE_FITTING, "Essayage"),
        (TYPE_DELIVERY, "Livraison"),
        (TYPE_CONSULTATION, "Consultation"),
        (TYPE_URGENT, "Urgence"),
    ]

    PRIORITY_NORMAL = "normal"
    PRIORITY_HIGH = "high"
    PRIORITY_URGENT = "urgent"

    PRIORITY_CHOICES = [
        (PRIORITY_NORMAL, "Normale"),
        (PRIORITY_HIGH, "Haute"),
        (PRIORITY_URGENT, "Urgente"),
    ]

    STATUS_SCHEDULED = "scheduled"
    STATUS_CONFIRMED = "confirmed"
    STATUS_COMPLETED = "completed"
    STATUS_CANCELLED = "cancelled"
    STATUS_MISSED = "missed"

    STATUS_CHOICES = [
        (STATUS_SCHEDULED, "Programme"),
        (STATUS_CONFIRMED, "Confirme"),
        (STATUS_COMPLETED, "Termine"),
        (STATUS_CANCELLED, "Annule"),
        (STATUS_MISSED, "Manque"),
    ]

    client = models.ForeignKey("clients.Client", on_delete=models.PROTECT, related_name="appointments")
    tailor = models.ForeignKey(
        "tailors.TailorProfile",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="appointments",
    )
    title = models.CharField(max_length=160, blank=True)
    appointment_type = models.CharField(max_length=24, choices=TYPE_CHOICES, default=TYPE_CONSULTATION)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default=PRIORITY_NORMAL)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default=STATUS_SCHEDULED)
    start_at = models.DateTimeField(default=timezone.now)
    end_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ["start_at", "-created_at"]
        indexes = [
            models.Index(fields=["start_at"]),
            models.Index(fields=["appointment_type"]),
            models.Index(fields=["priority"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self):
        return self.title or f"{self.get_appointment_type_display()} - {self.client.full_name}"

    @property
    def effective_end_at(self):
        return self.end_at or self.start_at + timedelta(hours=1)

