import uuid
from django.db import models
from django.contrib.auth.models import User

class Activation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    code = models.CharField(max_length=20, unique=True)
    email = models.EmailField(blank=True)

class Friendship(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships2')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user1', 'user2')

class FriendRequest(models.Model):
    id = models.UUIDField(primary_key = True, default = uuid.uuid4, editable = False)
    sender_fr = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_requests_sender')
    recipient_fr = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_requests_recipient')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('sender_fr', 'recipient_fr')
