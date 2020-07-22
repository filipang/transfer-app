from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.translation import gettext_lazy as _
from django.views import generic
from django.db.models import Q
from django.contrib.auth.models import User
from .models import Friendship, FriendRequest

def send_mail(to, template, context):
    html_content = render_to_string(f'accounts/emails/{template}.html', context)
    text_content = render_to_string(f'accounts/emails/{template}.txt', context)

    print('THIS IS email')
    print(settings.DEFAULT_FROM_EMAIL)
    msg = EmailMultiAlternatives(context['subject'], text_content, settings.DEFAULT_FROM_EMAIL, [to])
    msg.attach_alternative(html_content, 'text/html')
    msg.send(fail_silently=False)


def send_activation_email(request, email, code):
    context = {
        'subject': _('Profile activation'),
        'uri': request.build_absolute_uri(reverse('accounts:activate', kwargs={'code': code})),
    }

    send_mail(email, 'activate_profile', context)


def send_activation_change_email(request, email, code):
    context = {
        'subject': _('Change email'),
        'uri': request.build_absolute_uri(reverse('accounts:change_email_activation', kwargs={'code': code})),
    }

    send_mail(email, 'change_email', context)


def send_reset_password_email(request, email, token, uid):
    context = {
        'subject': _('Restore password'),
        'uri': request.build_absolute_uri(
            reverse('accounts:restore_password_confirm', kwargs={'uidb64': uid, 'token': token})),
    }

    send_mail(email, 'restore_password_email', context)


def send_forgotten_username_email(email, username):
    context = {
        'subject': _('Your username'),
        'username': username,
    }

    send_mail(email, 'forgotten_username', context)


class BasePageMixin(generic.base.ContextMixin):

    def get_context_data(self, **kwargs):

        context = super(BasePageMixin, self).get_context_data(**kwargs)
        if self.request.user.is_authenticated :

            friendships = list(self.request.user.friendships1.all())
            friendships.extend(list(self.request.user.friendships2.all()))

            query = User.objects.exclude(pk=self.request.user.pk)

            friend_fks=list(f.user1.pk for f in friendships)
            friend_fks.extend(list(f.user2.pk for f in friendships))

            context.update(dict(friends=query.filter(pk__in=friend_fks)))

            friend_requests = list(self.request.user.friend_requests_recipient.all())
            friend_request_user_fks = list(f.sender.pk for f in friend_requests)

            context.update(dict(friend_request_users=query.filter(pk__in=friend_request_user_fks)))

        return context
