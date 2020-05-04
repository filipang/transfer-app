from django.urls import path

from .views import Home

app_name = 'transfers'

urlpatterns = [
    path('', Home.as_view(), name = 'upload'),
]
