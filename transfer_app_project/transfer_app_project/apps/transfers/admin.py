from django.contrib import admin
from transfer_app_project.apps.accounts.views import FriendRequest, Friendship, Activation

# Register your models here.
admin.site.register(FriendRequest)
admin.site.register(Friendship)
admin.site.register(Activation)
