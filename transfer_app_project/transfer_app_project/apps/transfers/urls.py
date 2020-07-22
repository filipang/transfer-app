from django.urls import path, include
from django.conf.urls import url


from .views import Home, LiveTransferView, LiveTransferDownloadView, LiveTransferLinkView, DownloadInviteView, StartSessionView

app_name = 'transfers'

urlpatterns = [
    path('', Home.as_view(), name='upload'),
    path('live_transfer/<str:username>', LiveTransferView.as_view(), name='live_transfer'),
    path('live_transfer_session/<str:session_id>', LiveTransferLinkView.as_view(), name='live_transfer_link'),
    path('live_transfer_session/', LiveTransferLinkView.as_view(), name='live_transfer_link'),
    path('live_transfer/', StartSessionView.as_view(), name='start_session'),
    path('invite_transfer/<str:username>/magnet:', DownloadInviteView.as_view(), name='invite_transfer'),
    path('live_transfer_download/<str:session_id>', LiveTransferDownloadView.as_view(), name='live_transfer_download'),
]
