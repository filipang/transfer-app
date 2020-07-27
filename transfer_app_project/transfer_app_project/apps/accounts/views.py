from django.contrib import messages
from django.contrib.auth import login, authenticate, REDIRECT_FIELD_NAME
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.mixins import LoginRequiredMixin
from django.contrib.auth.models import User
from django.contrib.auth.views import (
    LogoutView as BaseLogoutView, PasswordChangeView as BasePasswordChangeView,
    PasswordResetDoneView as BasePasswordResetDoneView, PasswordResetConfirmView as BasePasswordResetConfirmView,
)
from django.shortcuts import get_object_or_404, redirect, render
from django.utils.crypto import get_random_string
from django.utils.decorators import method_decorator
from django.utils.http import is_safe_url
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import gettext_lazy as _
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django.views.generic import View, FormView, ListView
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse
from django.http import JsonResponse
from notifications.models import Notification
from notifications.signals import notify

from .utils import (
    send_activation_email, send_reset_password_email, send_forgotten_username_email, send_activation_change_email,
    BasePageMixin, generate_serializable_list_from_user_list
)
from .forms import (
    SignInViaUsernameForm, SignInViaEmailForm, SignInViaEmailOrUsernameForm, SignUpForm,
    RestorePasswordForm, RestorePasswordViaEmailOrUsernameForm, RemindUsernameForm,
    ResendActivationCodeForm, ResendActivationCodeViaEmailForm, ChangeProfileForm, ChangeEmailForm,
    ChangeProfileImageForm
)
from .models import Activation, Friendship, FriendRequest, ProfileImage


class GuestOnlyView(View):
    def dispatch(self, request, *args, **kwargs):
        # Redirect to the index page if the user already authenticated
        if request.user.is_authenticated:
            return redirect(settings.LOGIN_REDIRECT_URL)

        return super().dispatch(request, *args, **kwargs)


class LogInView(GuestOnlyView, FormView, BasePageMixin):
    template_name = 'accounts/log_in.html'

    @staticmethod
    def get_form_class(**kwargs):
        if settings.DISABLE_USERNAME or settings.LOGIN_VIA_EMAIL:
            return SignInViaEmailForm

        if settings.LOGIN_VIA_EMAIL_OR_USERNAME:
            return SignInViaEmailOrUsernameForm

        return SignInViaUsernameForm

    @method_decorator(sensitive_post_parameters('password'))
    @method_decorator(csrf_protect)
    @method_decorator(never_cache)
    def dispatch(self, request, *args, **kwargs):
        # Sets a test cookie to make sure the user has cookies enabled
        request.session.set_test_cookie()

        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        request = self.request

        # If the test cookie worked, go ahead and delete it since its no longer needed
        if request.session.test_cookie_worked():
            request.session.delete_test_cookie()

        # The default Django's "remember me" lifetime is 2 weeks and can be changed by modifying
        # the SESSION_COOKIE_AGE settings' option.
        if settings.USE_REMEMBER_ME:
            if not form.cleaned_data['remember_me']:
                request.session.set_expiry(0)

        login(request, form.user_cache)

        redirect_to = request.POST.get(REDIRECT_FIELD_NAME, request.GET.get(REDIRECT_FIELD_NAME))
        url_is_safe = is_safe_url(redirect_to, allowed_hosts=request.get_host(), require_https=request.is_secure())

        if url_is_safe:
            return redirect(redirect_to)

        return redirect(settings.LOGIN_REDIRECT_URL)


class SignUpView(GuestOnlyView, FormView, BasePageMixin):
    template_name = 'accounts/sign_up.html'
    form_class = SignUpForm

    def form_valid(self, form):
        request = self.request
        user = form.save(commit=False)

        if settings.DISABLE_USERNAME:
            # Set a temporary username
            user.username = get_random_string()
        else:
            user.username = form.cleaned_data['username']

        if settings.ENABLE_USER_ACTIVATION:
            user.is_active = False

        # Create a user record
        user.save()
        ProfileImage.objects.create(user=user)

        # Change the username to the "user_ID" form
        if settings.DISABLE_USERNAME:
            user.username = f'user_{user.id}'
            user.save()

        if settings.ENABLE_USER_ACTIVATION:
            code = get_random_string(20)

            act = Activation()
            act.code = code
            act.user = user
            act.save()

            send_activation_email(request, user.email, code)

            messages.success(
                request, _('You are signed up. To activate the account, follow the link sent to the mail.'))
        else:
            raw_password = form.cleaned_data['password1']

            user = authenticate(username=user.username, password=raw_password)
            login(request, user)

            messages.success(request, _('You are successfully signed up!'))

        return redirect('/')


class ActivateView(View, BasePageMixin):
    @staticmethod
    def get(request, code):
        act = get_object_or_404(Activation, code=code)

        # Activate profile
        user = act.user
        user.is_active = True
        user.save()

        # Remove the activation record
        act.delete()

        messages.success(request, _('You have successfully activated your account!'))

        return redirect('accounts:log_in')


class ResendActivationCodeView(GuestOnlyView, FormView, BasePageMixin):
    template_name = 'accounts/resend_activation_code.html'

    @staticmethod
    def get_form_class(**kwargs):
        if settings.DISABLE_USERNAME:
            return ResendActivationCodeViaEmailForm

        return ResendActivationCodeForm

    def form_valid(self, form):
        user = form.user_cache

        activation = user.activation_set.first()
        activation.delete()

        code = get_random_string(20)

        act = Activation()
        act.code = code
        act.user = user
        act.save()

        send_activation_email(self.request, user.email, code)

        messages.success(self.request, _('A new activation code has been sent to your email address.'))

        return redirect('accounts:resend_activation_code')


class RestorePasswordView(GuestOnlyView, FormView, BasePageMixin):
    template_name = 'accounts/restore_password.html'

    @staticmethod
    def get_form_class(**kwargs):
        if settings.RESTORE_PASSWORD_VIA_EMAIL_OR_USERNAME:
            return RestorePasswordViaEmailOrUsernameForm

        return RestorePasswordForm

    def form_valid(self, form):
        user = form.user_cache
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))

        send_reset_password_email(self.request, user.email, token, uid)

        return redirect('accounts:restore_password_done')


class ChangeProfileView(LoginRequiredMixin, FormView, BasePageMixin):
    template_name = 'accounts/profile/change_profile.html'
    form_class = ChangeProfileForm

    def get_initial(self):
        user = self.request.user
        initial = super().get_initial()
        initial['first_name'] = user.first_name
        initial['last_name'] = user.last_name
        return initial

    def form_valid(self, form):
        user = self.request.user
        user.first_name = form.cleaned_data['first_name']
        user.last_name = form.cleaned_data['last_name']
        user.save()

        messages.success(self.request, _('Profile data has been successfully updated.'))

        return redirect('accounts:change_profile')


class ChangeProfileImageView(LoginRequiredMixin, FormView, BasePageMixin):
    template_name = 'accounts/profile/change_image.html'
    form_class = ChangeProfileImageForm

    def get_initial(self):
        user = self.request.user
        initial = super().get_initial()
        return initial

    def form_valid(self, form):
        user = self.request.user
        has_profile_image = False
        try:
            has_profile_image = (user.profileimage is not None)
        except ProfileImage.DoesNotExist:
            pass

        if has_profile_image:
            user.profileimage.delete()

        profile_image = form.save(commit=False)
        print(profile_image.image)
        profile_image.user = user
        profile_image.save()

        messages.success(self.request, _('Profile image has been successfully updated.'))

        return redirect('accounts:change_image')


class ProfileView(View, BasePageMixin):
    template_name = 'accounts/profile.html'

    def get(self, request, username):
        context = self.get_context_data(request=request)

        user = User.objects.get(username=username)

        is_friend = (request.user.friendships1.all() & user.friendships2.all()).exists() or (
                    request.user.friendships2.all() & user.friendships1.all()).exists()

        is_pending = (request.user.friend_requests_sender.all() & user.friend_requests_recipient.all()).exists()

        can_add = not (is_friend or is_pending)

        print(request.user.friend_requests_sender.all())

        context.update(dict(username=username, user=user, is_friend=is_friend, is_pending=is_pending, can_add=can_add))

        return render(request, self.template_name, context)


class ChangeEmailView(LoginRequiredMixin, FormView, BasePageMixin):
    template_name = 'accounts/profile/change_email.html'
    form_class = ChangeEmailForm

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs['user'] = self.request.user
        return kwargs

    def get_initial(self):
        initial = super().get_initial()
        initial['email'] = self.request.user.email
        return initial

    def form_valid(self, form):
        user = self.request.user
        email = form.cleaned_data['email']

        if settings.ENABLE_ACTIVATION_AFTER_EMAIL_CHANGE:
            code = get_random_string(20)

            act = Activation()
            act.code = code
            act.user = user
            act.email = email
            act.save()

            send_activation_change_email(self.request, email, code)

            messages.success(self.request, _('To complete the change of email address, click on the link sent to it.'))
        else:
            user.email = email
            user.save()

            messages.success(self.request, _('Email successfully changed.'))

        return redirect('accounts:change_email')


class ChangeEmailActivateView(View, BasePageMixin):
    @staticmethod
    def get(request, code):
        act = get_object_or_404(Activation, code=code)

        # Change the email
        user = act.user
        user.email = act.email
        user.save()

        # Remove the activation record
        act.delete()

        messages.success(request, _('You have successfully changed your email!'))

        return redirect('accounts:change_email')


class RemindUsernameView(GuestOnlyView, FormView, BasePageMixin):
    template_name = 'accounts/remind_username.html'
    form_class = RemindUsernameForm

    def form_valid(self, form):
        user = form.user_cache
        send_forgotten_username_email(user.email, user.username)

        messages.success(self.request, _('Your username has been successfully sent to your email.'))

        return redirect('accounts:remind_username')


class ChangePasswordView(BasePasswordChangeView, BasePageMixin):
    template_name = 'accounts/profile/change_password.html'

    def form_valid(self, form):
        # Change the password
        user = form.save()

        # Re-authentication
        login(self.request, user)

        messages.success(self.request, _('Your password was changed.'))

        return redirect('accounts:change_password')


class RestorePasswordConfirmView(BasePasswordResetConfirmView, BasePageMixin):
    template_name = 'accounts/restore_password_confirm.html'

    def form_valid(self, form):
        # Change the password
        form.save()

        messages.success(self.request, _('Your password has been set. You may go ahead and log in now.'))

        return redirect('accounts:log_in')


class RestorePasswordDoneView(BasePasswordResetDoneView, BasePageMixin):
    template_name = 'accounts/restore_password_done.html'


class LogOutView(LoginRequiredMixin, BaseLogoutView, BasePageMixin):
    template_name = 'accounts/log_out.html'


class FriendsView(LoginRequiredMixin, View, BasePageMixin):
    template_name = 'accounts/friends.html'


class AddFriendView(LoginRequiredMixin, View, BasePageMixin):
    @staticmethod
    def post(request, username):
        user = get_object_or_404(User, username=username)

        notification = notify.send(request.user,
                                   recipient=user,
                                   verb=' sent you a friend request!',
                                   href="/accept_friend/" + request.user.username,
                                   username=request.user.username,
                                   image_path=request.user.profileimage.image.url,
                                   type='FRIEND_REQUEST')

        notification_obj = notification[0][1][0]

        f_request = FriendRequest.objects.create(sender=request.user, recipient=user, notification=notification_obj)
        print(f_request.sender)
        print(" sent a request to ")
        print(f_request.recipient)
        messages.success(request, _('Friend request sent!'))

        f_request.save()
        return redirect('transfers:upload')


class RemoveFriendView(LoginRequiredMixin, View, BasePageMixin):
    @staticmethod
    def post(request, username):
        print('JONATHANN')
        print(username)
        print('REMOVED')
        user = get_object_or_404(User, username=username)
        Friendship.objects.get(Q(user1=user) | Q(user2=user)).delete()
        print(user)
        print(request.user)
        messages.success(request, _(''.join([username, ' has been removed from your friend list.'])))

        return JsonResponse({'username': username})


class AcceptFriendView(LoginRequiredMixin, View, BasePageMixin):
    def post(self, request, username):
        context = self.get_context_data(request=request)
        user = get_object_or_404(User, username=username)
        if FriendRequest.objects.filter(sender=user, recipient=request.user).count() > 0:
            friendship = Friendship.objects.create(user1=user, user2=request.user)
            friendship.save()

            #Deleting this the friend request's notification will also delete the friend request
            FriendRequest.objects.get(sender=user, recipient=request.user).notification.delete()

            messages.success(request, _('Friend request accepted!'))
        else:
            messages.error(request, _('Friend request doesn\'t exist!'))

        return JsonResponse({'username': username,
                             'friends': generate_serializable_list_from_user_list(list(context['friends']))}, safe=False)


class DeclineFriendView(LoginRequiredMixin, View, BasePageMixin):
    def post(self, request, username):
        user = get_object_or_404(User, username=username)
        if FriendRequest.objects.filter(sender=user, recipient=request.user).count() > 0:
            FriendRequest.objects.get(sender=user, recipient=request.user).notification.delete()

            messages.success(request, _(''.join([username, '\'s friend request has been declined.'])))
        else:
            messages.error(request, _('Friend request doesn\'t exist!'))
        return JsonResponse({'username': username})


class SearchUserView(LoginRequiredMixin, View, BasePageMixin):
    template_name = 'accounts/search_user.html'

    def get(self, request):
        context = self.get_context_data(request=request)
        if request.GET.urlencode() != '':
            print(list(User.objects.filter(username__icontains=request.GET.get('query', ''))))
            context.update(dict(users_found=User.objects.filter(username__icontains=request.GET.get('query', ''))))
        return render(request, self.template_name, context)


class ClearNotificationsView(LoginRequiredMixin, View, BasePageMixin):
    def post(self, request):
        request.user.notifications.all().delete()
        return JsonResponse({'request': 'la dee da'})


class DeleteNotificationView(LoginRequiredMixin, View, BasePageMixin):
    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk)
        print('JONASX')
        print(notification.recipient)
        print(request.user)
        if request.user == notification.recipient:
            notification.delete()
        return JsonResponse({'id': pk})


class FriendListView(LoginRequiredMixin, View, BasePageMixin):
    def get(self, request):
        context = self.get_context_data(request=request)
        print('FRIEND LISTTTT')
        print(context)
        print(list(context['friends']))
        return JsonResponse(generate_serializable_list_from_user_list(list(context['friends'])), safe=False)


