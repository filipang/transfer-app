from django.shortcuts import render
from django.http import HttpResponse
from django.views import View
from transfer_app_project.apps.accounts.utils import BasePageMixin

from django.contrib.auth.models import User
from notifications.signals import notify
from django.shortcuts import get_object_or_404, redirect, render, reverse


from django.http import HttpResponse
from django.http import JsonResponse
import uuid


live_transfer_sessions = dict()


class Home(View, BasePageMixin):
    @staticmethod
    def get(request):
        return redirect(reverse('transfers:live_transfer_link', kwargs={'session_id': uuid.uuid1()}))


class LiveTransferView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_send.html'

    def get(self, request, username):
        context = self.get_context_data(request=request)
        user = get_object_or_404(User, username=username)

        context.update(dict(username=username, is_link=False))
        return render(request, self.template_name, context)


class LiveTransferLinkView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_send.html'

    def get(self, request, session_id):
        if request.GET.get('sdp_type') == 'get_sdp':
            print('TEST HERE!!!!!!!!')
            print(live_transfer_sessions[session_id])
            if 'receiver' in live_transfer_sessions[session_id]:
                if 'answer' in live_transfer_sessions[session_id]['receiver']:
                    answer = {'sdpMessage': {
                        'type': 'answer',
                        'sdp': live_transfer_sessions[session_id]['receiver']['answer']
                        }
                    }

                    ice_candidates = []
                    if 'ice_candidates' in live_transfer_sessions[session_id]['receiver']:
                        for ic in live_transfer_sessions[session_id]['receiver']['ice_candidates']:
                            ice_candidates.append({'sdpMessage': ic})
                    live_transfer_sessions[session_id] = {};
                    return JsonResponse({'answer': answer, 'ice_candidates': ice_candidates})

            return JsonResponse({'err': 'Unknown/unspecified message'})
        else:
            context = self.get_context_data(request=request)
            #context.update(dict(is_link=True))
            return render(request, self.template_name, context)

    @staticmethod
    def post(request, session_id):
        peer_id = request.POST.get('peer_id')
        if request.POST.get('sdp_type') == 'offer':
            live_transfer_sessions.update({session_id: {
                                            peer_id: {
                                                'offer': request.POST.get('sdp'),
                                                'ice_candidates': []
                                            }
                                        }
                                    })
            print(live_transfer_sessions)
            print(''.join(['Session created: ', session_id]))
            print(''.join(['Session sdp: ', request.POST.get('sdp')]))
            return JsonResponse({'message': 'success',
                                 'session_id': session_id})
        if request.POST.get('sdp_type') == 'candidate':
            print(live_transfer_sessions)
            live_transfer_sessions[session_id][peer_id]['ice_candidates'].append(request.POST.get('sdp'))
            return JsonResponse({'message': 'success', 'session_id': session_id, 'peer_id': peer_id})

        return JsonResponse({'message': 'Unknown/unspecified message type from ' + peer_id})


class LiveTransferDownloadView(View, BasePageMixin):
    template_name = 'transfers/live_transfer_recieve.html'

    def get(self, request, session_id):
        if request.GET.get('sdp_type') == 'get_sdp':
            return
        else:
            context = self.get_context_data(request=request)
            print('MAKEEE ANSWER')
            offer = {'sdpMessage': {
                        'type': "offer",
                        'sdp': live_transfer_sessions[session_id]['sender']['offer']
                        }
                   }

            ice_candidates = []
            for ic in live_transfer_sessions[session_id]['sender']['ice_candidates']:
                ice_candidates.append({'sdpMessage': ic})

            context.update(dict(offer=offer, ice_candidates=ice_candidates, session_id=session_id))
            return render(request, self.template_name, context)

    @staticmethod
    def post(request, session_id):
        peer_id = request.POST.get('peer_id')
        print('POSTING ANSWER!!!')
        print(peer_id)
        print(request.POST.get('sdp_type'))
        if request.POST.get('sdp_type') == 'answer':
            live_transfer_sessions[session_id].update({'receiver': {
                    'answer': request.POST.get('sdp'),
                    'ice_candidates': []
                }
            })
            return JsonResponse({'message': 'success',
                                 'session_id': session_id,
                                 'peer_id': peer_id,
                                 'type': 'answer'})

        if request.POST.get('sdp_type') == 'candidate':
            if 'receiver' in live_transfer_sessions[session_id]:
                if 'ice_candidates' in live_transfer_sessions[session_id]['receiver']:
                    live_transfer_sessions[session_id]['receiver']['ice_candidates'].append(request.POST.get('sdp'))
                    return JsonResponse({'message': 'success',
                                         'session_id': session_id,
                                         'peer_id': peer_id,
                                         'sdp_type': 'candidate'})
                else:
                    print('WARNING: ADDED CANDIDATE TO RECEIVER WITHOUT AN ANSWER')
                    live_transfer_sessions[session_id]['receiver'].update({'ice_candidates': []})
                    live_transfer_sessions[session_id]['receiver']['ice_candidates'].append(request.POST.get('sdp'))
                    return JsonResponse({'message': 'success',
                                         'session_id': session_id,
                                         'peer_id': peer_id,
                                         'sdp_type': 'candidate'})
            else:
                print('WARNING: TRIED TO ADD CANDIDATE BUT RECEIVER DOESN\'T EXIST')

        return JsonResponse({'message': 'Unknown/unspecified message type'})


class DownloadInviteView(View, BasePageMixin):
    @staticmethod
    def post(request, username):
        user = get_object_or_404(User, username=username)
        magnet = "".join(["magnet:?", request.GET.urlencode('"<>#%{}|\\^~[]`;/?:@=&')])

        print('BEAT IT JUST BEAT IT')
        print(notify.send(request.user,
                          recipient=user,
                          verb=' wants to send you some files!',
                          href="/live_transfer_download/" + magnet,
                          username=username,
                          image_path=user.profileimage.image.url,
                          type='NOTIFICATION'))

        return JsonResponse({'username': username})


class StartSessionView(View, BasePageMixin):
    @staticmethod
    def get(request):
        return redirect(reverse('transfers:live_transfer_link', kwargs={'session_id': uuid.uuid1()}))
