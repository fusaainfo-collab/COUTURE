from django.db import migrations


def create_default_workshop_and_attach_data(apps, schema_editor):
    Workshop = apps.get_model("core", "Workshop")
    workshop, _ = Workshop.objects.get_or_create(
        slug="atelier-principal",
        defaults={
            "name": "Atelier Principal",
            "currency": "XOF",
            "is_active": True,
        },
    )

    models_to_attach = [
        ("analytics", "StatisticItem"),
        ("appointments", "Appointment"),
        ("clients", "Client"),
        ("measurements", "MeasurementProfile"),
        ("notifications", "Notification"),
        ("orders", "Order"),
        ("orders", "Pattern"),
        ("payments", "Expense"),
        ("payments", "Payment"),
        ("tailors", "TailorProfile"),
    ]

    for app_label, model_name in models_to_attach:
        model = apps.get_model(app_label, model_name)
        model.objects.filter(workshop__isnull=True).update(workshop=workshop)


class Migration(migrations.Migration):

    dependencies = [
        ("analytics", "0002_statisticitem_workshop"),
        ("appointments", "0002_appointment_workshop"),
        ("clients", "0002_client_workshop"),
        ("core", "0002_workshop"),
        ("measurements", "0002_measurementprofile_workshop"),
        ("notifications", "0002_notification_workshop"),
        ("orders", "0002_order_workshop_pattern_workshop"),
        ("payments", "0002_expense_workshop_payment_workshop"),
        ("tailors", "0002_tailorprofile_workshop"),
    ]

    operations = [
        migrations.RunPython(create_default_workshop_and_attach_data, migrations.RunPython.noop),
    ]
