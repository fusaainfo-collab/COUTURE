from django.conf import settings
from django.db import models

from apps.core.models import SoftDeleteModel, TimeStampedModel


class MeasurementProfile(SoftDeleteModel):
    CATEGORY_MAN = "man"
    CATEGORY_WOMAN = "woman"
    CATEGORY_CHILD = "child"

    CATEGORY_CHOICES = [
        (CATEGORY_MAN, "Homme"),
        (CATEGORY_WOMAN, "Femme"),
        (CATEGORY_CHILD, "Enfant"),
    ]

    client = models.ForeignKey(
        "clients.Client",
        on_delete=models.CASCADE,
        related_name="measurement_profiles",
    )
    label = models.CharField(max_length=120, default="Profil principal")
    category = models.CharField(max_length=16, choices=CATEGORY_CHOICES)
    unit = models.CharField(max_length=8, default="cm")
    measurements = models.JSONField(default=dict)
    reference_photos = models.JSONField(default=list, blank=True)
    notes = models.TextField(blank=True)
    is_default = models.BooleanField(default=True)

    class Meta:
        ordering = ["client__full_name", "-is_default", "-updated_at"]

    def __str__(self):
        return f"{self.client.full_name} - {self.label}"


class MeasurementRevision(TimeStampedModel):
    profile = models.ForeignKey(
        MeasurementProfile,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    previous_measurements = models.JSONField(default=dict)
    new_measurements = models.JSONField(default=dict)
    note = models.CharField(max_length=240, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Revision mesures #{self.profile_id}"

