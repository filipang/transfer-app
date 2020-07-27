from django.urls import path

from .views import (
    LogInView, ResendActivationCodeView, RemindUsernameView, SignUpView, ActivateView, LogOutView,
    ChangeEmailView, ChangeEmailActivateView, ChangeProfileView, ChangePasswordView,
    RestorePasswordView, RestorePasswordDoneView, RestorePasswordConfirmView, ProfileView,
    FriendsView, AddFriendView, RemoveFriendView, AcceptFriendView, DeclineFriendView, SearchUserView, ClearNotificationsView, DeleteNotificationView, ChangeProfileImageView, FriendListView
)

app_name = 'accounts'

urlpatterns = [
    path('log-in/', LogInView.as_view(), name='log_in'),
    path('log-out/', LogOutView.as_view(), name='log_out'),

    path('resend/activation-code/', ResendActivationCodeView.as_view(), name='resend_activation_code'),

    path('sign-up/', SignUpView.as_view(), name='sign_up'),
    path('activate/<code>/', ActivateView.as_view(), name='activate'),

    path('restore/password/', RestorePasswordView.as_view(), name='restore_password'),
    path('restore/password/done/', RestorePasswordDoneView.as_view(), name='restore_password_done'),
    path('restore/<uidb64>/<token>/', RestorePasswordConfirmView.as_view(), name='restore_password_confirm'),

    path('remind/username/', RemindUsernameView.as_view(), name='remind_username'),

    path('change/image/', ChangeProfileImageView.as_view(), name='change_image'),
    path('change/profile/', ChangeProfileView.as_view(), name='change_profile'),
    path('change/password/', ChangePasswordView.as_view(), name='change_password'),
    path('change/email/', ChangeEmailView.as_view(), name='change_email'),
    path('change/email/<code>/', ChangeEmailActivateView.as_view(), name='change_email_activation'),

    path('profile/<str:username>', ProfileView.as_view(), name = 'profile'),

    path('friends', FriendsView.as_view(), name='friends'),
    path('add_friend/<str:username>', AddFriendView.as_view(), name='add_friend'),
    path('remove_friend/<str:username>', RemoveFriendView.as_view(), name='remove_friend'),
    path('accept_friend/<str:username>', AcceptFriendView.as_view(), name='accept_friend'),
    path('decline_friend/<str:username>', DeclineFriendView.as_view(), name='decline_friend'),
    path('friend_list/', FriendListView.as_view(), name='friend_list'),

    path('search', SearchUserView.as_view(), name='search'),

    path('clear_notifications', ClearNotificationsView.as_view(), name='clear_notifications'),
    path('clear_notification/<int:pk>', DeleteNotificationView.as_view(), name='delete_notification')


]
