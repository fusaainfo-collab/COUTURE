from django.db import migrations


def seed_workshop_memberships(apps, schema_editor):
    Workshop = apps.get_model("core", "Workshop")
    WorkshopMembership = apps.get_model("core", "WorkshopMembership")
    UserProfile = apps.get_model("accounts", "UserProfile")
    Client = apps.get_model("clients", "Client")
    TailorProfile = apps.get_model("tailors", "TailorProfile")

    workshop = Workshop.objects.filter(slug="atelier-principal").first() or Workshop.objects.first()
    if not workshop:
        return

    for profile in UserProfile.objects.select_related("user").filter(role="manager"):
        WorkshopMembership.objects.get_or_create(
            workshop=workshop,
            user=profile.user,
            defaults={"role": "manager", "is_active": True},
        )

    for tailor in TailorProfile.objects.select_related("user", "workshop").filter(user__isnull=False, workshop__isnull=False):
        WorkshopMembership.objects.get_or_create(
            workshop=tailor.workshop,
            user=tailor.user,
            defaults={"role": "tailor", "is_active": True},
        )

    for client in Client.objects.select_related("user", "workshop").filter(user__isnull=False, workshop__isnull=False):
        WorkshopMembership.objects.get_or_create(
            workshop=client.workshop,
            user=client.user,
            defaults={"role": "client", "is_active": True},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
        ("clients", "0003_client_user"),
        ("core", "0004_messagethread_threadmessage_workshopmembership"),
        ("tailors", "0002_tailorprofile_workshop"),
    ]

    operations = [
        migrations.RunPython(seed_workshop_memberships, migrations.RunPython.noop),
    ]
