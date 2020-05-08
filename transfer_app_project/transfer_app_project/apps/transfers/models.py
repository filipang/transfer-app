import uuid
from django.db import models
from datetime import datetime
from datetime import timedelta
from django.contrib.auth.models import User
from notifications.signals import notify

from django.db.models.signals import post_save


class Package(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    user = models.ForeignKey(User, on_delete = models.CASCADE)
    created_at = models.DateTimeField(auto_now_add = True)


class Download(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    user = models.ForeignKey(User, null = True, on_delete=models.SET_NULL)
    package = models.ForeignKey(Package, on_delete = models.CASCADE)
    created_at = models.DateTimeField(auto_now_add = True)


class DownloadLink(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    package = models.ForeignKey(Package, on_delete = models.CASCADE)
    expires_at = models.DateTimeField()

    def save(self, *args, **kwargs):
        if not self.id:
            self.expires_at = datetime.now() + timedelta(days=7)
        return super(Package, self).save(*args, **kwargs)

class LiveTransfer(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, null = True, related_name='%(class)s_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, null = True, related_name='%(class)s_user2')
    started_at = models.DateTimeField(auto_now_add = True)
    ended_at = models.DateTimeField()
