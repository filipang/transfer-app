# Generated by Django 3.0.4 on 2020-05-28 23:43

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.NOTIFICATIONS_NOTIFICATION_MODEL),
        ('accounts', '0009_auto_20200508_1430'),
    ]

    operations = [
        migrations.AddField(
            model_name='friendrequest',
            name='notification',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.NOTIFICATIONS_NOTIFICATION_MODEL),
        ),
    ]
