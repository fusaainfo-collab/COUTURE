from django.conf import settings
from django.db import models

from apps.core.models import SoftDeleteModel


class Client(SoftDeleteModel):
    GENDER_MALE = "male"
    GENDER_FEMALE = "female"
    GENDER_CHILD = "child"
    GENDER_OTHER = "other"

    GENDER_CHOICES = [
        (GENDER_MALE, "Homme"),
        (GENDER_FEMALE, "Femme"),
        (GENDER_CHILD, "Enfant"),
        (GENDER_OTHER, "Autre"),
    ]

    full_name = models.CharField(max_length=160)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="client_profiles",
    )
    phone = models.CharField(max_length=40, db_index=True)
    whatsapp = models.CharField(max_length=40, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    gender = models.CharField(max_length=16, choices=GENDER_CHOICES, default=GENDER_OTHER)
    preferences = models.JSONField(default=dict, blank=True)
    favorite_sizes = models.JSONField(default=dict, blank=True)
    private_notes = models.TextField(blank=True)
    photo = models.ImageField(upload_to="clients/", null=True, blank=True)
    vip_level = models.PositiveSmallIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["full_name"]
        indexes = [
            models.Index(fields=["full_name"]),
            models.Index(fields=["phone"]),
            models.Index(fields=["vip_level"]),
        ]

    def __str__(self):
        return self.full_name
