from django.urls import path, include
from django.conf.urls import url


from .views import Home, LiveTransferView, LiveTransferDownloadView, LiveTransferLinkView, DownloadInviteView, StartSessionView, StartSessionUserView

app_name = 'transfers'

urlpatterns = [
    path('', Home.as_view(), name='upload'),
    path('live_transfer/<str:username>', StartSessionUserView.as_view(), name='start_session_user'),
    path('live_transfer/', StartSessionView.as_view(), name='start_session'),
    path('live_transfer_session/<str:session_id>', LiveTransferLinkView.as_view(), name='live_transfer_link'),
    path('live_transfer_session/<str:session_id>/<str:username>', LiveTransferView.as_view(), name='live_transfer_user'),
    path('invite_transfer/<str:session_id>/<str:username>/', DownloadInviteView.as_view(), name='invite_transfer'),
    path('live_transfer_download/<str:session_id>', LiveTransferDownloadView.as_view(), name='live_transfer_download'),
]
