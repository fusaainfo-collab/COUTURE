from django.db import models

from apps.core.models import SoftDeleteModel


class StatisticItem(SoftDeleteModel):
    TONE_CHOICES = [
        ("neutral", "Neutre"),
        ("gold", "Important"),
        ("green", "Positif"),
        ("red", "A surveiller"),
    ]

    IMPACT_CHOICES = [
        ("low", "Faible"),
        ("medium", "Moyen"),
        ("high", "Fort"),
        ("critical", "Critique"),
    ]

    label = models.CharField(max_length=160)
    value = models.CharField(max_length=80)
    evolution = models.CharField(max_length=40, blank=True)
    impact = models.CharField(max_length=16, choices=IMPACT_CHOICES, default="medium")
    tone = models.CharField(max_length=16, choices=TONE_CHOICES, default="neutral")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["label"]
        indexes = [
            models.Index(fields=["label"]),
            models.Index(fields=["impact"]),
            models.Index(fields=["tone"]),
        ]

    def __str__(self):
        return f"{self.label}: {self.value}"

