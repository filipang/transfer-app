from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
from transfer_app_project.apps.accounts.utils import BasePageMixin

from django.contrib.auth.models import User
from notifications.signals import notify
from django.shortcuts import get_object_or_404, redirect, render

from notifications import notify

from django.http import HttpResponse
from django.http import JsonResponse

class Home(View, BasePageMixin):
    template_name = 'transfers/upload.html'
    def get(self, request):
        return render(request, self.template_name, self.get_context_data(request=request))


class LiveTransferView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_send.html'
    def get(self, request, username):
        context = self.get_context_data(request=request)
        user = get_object_or_404(User, username=username)

        context.update(dict(username=username, is_link=False))
        return render(request, self.template_name, context)


class LiveTransferLinkView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_send.html'
    def get(self, request):
        context = self.get_context_data(request=request)

        context.update(dict(is_link=True))
        return render(request, self.template_name, context)

class LiveTransferDownloadView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_recieve.html'
    def get(self, request):
        context =  self.get_context_data(request=request)

        magnet = "".join(["magnet:?", request.GET.urlencode('"<>#%{}|\^~[]`;/?:@=&')])
        context.update(dict(magnet=magnet))
        return render(request, self.template_name, context)

class DownloadInviteView(View, BasePageMixin):
    def post(self, request, username):
        user = get_object_or_404(User, username=username)
        magnet = "".join(["magnet:?", request.GET.urlencode('"<>#%{}|\^~[]`;/?:@=&')])
        notify.send(request.user, recipient=user, verb='wants to send you some files! <a style="color:blue!important;padding:0px!important;margin:0px!important;display:inline-block" href="/live_transfer_download/' + magnet+'">Accept</a><br>')
        return JsonResponse({'username':username})
