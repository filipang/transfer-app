function log (str) {
    var p = document.createElement('p')
    p.innerHTML = str
    var l = document.querySelector('.log1').appendChild(p)
}

function isString(x) {
  return Object.prototype.toString.call(x) === "[object String]"
}

var fileStream, writer, filename, peerConnection
var fileChunks = [];

function connect(){
    peerConnection.handleMessage(window.offer)
    window.ice_candidates.forEach(function(ic){
        peerConnection.handleMessage(ic)
    })
}

function saveChunk(_writer, chunk) {
    console.log('Saving chunk')
    _writer.write(new Uint8Array(chunk))
}


function PeerConnectionImpl(originId,targetId,initiator,reliability){
          this.reliable = reliability;
          this.originId = originId;
          this.targetId = targetId;

          if (window.webkitRTCPeerConnection) {
              this.RTCPeerConnection = webkitRTCPeerConnection;
              this.RTCSessionDescription = RTCSessionDescription;
          } else if (window.mozRTCPeerConnection) {
              //delete turn servers due to incompatablitiy now
              //peer5.config.TURN_SERVERS = []
              this.RTCPeerConnection = mozRTCPeerConnection;
              this.RTCSessionDescription = mozRTCSessionDescription;
              RTCIceCandidate = mozRTCIceCandidate;
          }

          if (this.reliable)
              this.dataChannelOptions = {};
          else
              this.dataChannelOptions = { outOfOrderAllowed:true, maxRetransmitNum:0 };
          this.initiatePeerConnection(initiator);
};

PeerConnectionImpl.prototype = {
      /** @public methods*/
      setupCall:function () {
          this.peerConnection.createOffer(
              this.setLocalAndSendMessage_,
              function (err) {
                  console.log('createOffer(): failed, ' + err)
              },
              this.createOfferConstraints);
      },

      handleMessage:function (message) {
          console.log('handling message:');
          console.log(message)
          try{
            parsed_msg = JSON.parse(message.sdpMessage);
          }catch(err){
            console.log('COULDN\'T PARSE MESSAGE TRYING TO PUT IT LIKE IT IS')
            console.log(err)
            parsed_msg = message.sdpMessage
          }
          if (parsed_msg.type) {
              var session_description = new this.RTCSessionDescription(parsed_msg);
              var thi$ = this;
              if(!this.peerConnectionStateValid()) return;
              this.peerConnection.setRemoteDescription(
                  session_description,
                  function () {
                      console.log('setRemoteDescription(): success.')
                      if (session_description.type == "offer") {
                          console.log('createAnswer with constraints: ' +
                              JSON.stringify(this.createAnswerConstraints, null, ' '));
                          if(!thi$.peerConnectionStateValid()) return;
                          thi$.peerConnection.createAnswer(
                              thi$.setLocalAndSendMessage_,
                              function (err) {
                                  console.log('createAnswer(): failed, ' + err)
                              },
                              thi$.createAnswerConstraints);
                      }
                  },
                  function (err) {
                      console.log('setRemoteDescription(): failed, ' + err)
                  });

              return;
          } else if (parsed_msg.candidate) {
              if (JSON.stringify(parsed_msg) in this.peerConnection.candidates) {
                  console.log('candidate was already added');
                  return; // no need to add this!
              }
              if(!this.peerConnectionStateValid()) return;
              var candidate = new RTCIceCandidate(parsed_msg);
              this.peerConnection.addIceCandidate(candidate);

              this.peerConnection.candidates[JSON.stringify(parsed_msg)] = Date.now(); //memorize we have this candidate
              return;
          }
          console.log("unknown message received");
//            addTestFailure("unknown message received");
          return;
      },

      //Uint8Array binaryMessage
      send:function (binaryMessage) {
          var message = binaryMessage.buffer;
          var thi$ = this;
          if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
              console.log("sending data on dataChannel");
              thi$.dataChannel.send(message);
          } else {
              console.log('dataChannel was not ready, setting timeout');
              setTimeout(function (dataChannel, message) {
                  thi$.send(dataChannel, message);
              },3000, thi$.dataChannel, message);
          }
      },
      close:function(){
          this.ready = false;
          this.dataChannel.close();
          this.peerConnection.close();
      },

      /** @private methods*/
      initiatePeerConnection:function (initiator) {
          this.initiatePeerConnectionCallbacks();
          this.createPeerConnection();
          if (initiator)
              this.ensureHasDataChannel();
          var id = setTimeout(function (thi$) {
              if (!thi$.ready) {
                  console.log("ready state of PCImpl to " + thi$.targetId + " = " + thi$.ready);
                  thi$.failure = true;
                  console.log("couldn't connect to " + thi$.targetId);
                  thi$.handlePeerDisconnection(thi$.targetId);
              }
          }, 20000000, this);
      },
      initiatePeerConnectionCallbacks:function () {
          this.registerEvents();
      },
      registerEvents:function () {
          var thi$ = this;
          this.setLocalAndSendMessage_ = function (session_description) {
              console.log(session_description.sdp);
              thi$.peerConnection.setLocalDescription(
                  session_description,
                  function () {
                      console.log('setLocalDescription(): success.');
                  },
                  function (err) {
                      console.log('setLocalDescription(): failed' + err)
                  });

              console.log("Sending SDP message:\n" + session_description.sdp);
              $.ajax({
                    type: 'POST',
                    url: window.location.href,
                    data:{
                        sdp_type: 'answer',
                        csrfmiddlewaretoken: window.csrf_token,
                        sdp: session_description.sdp,
                        session_id: window.session_id,
                        peer_id: thi$.originId,
                    },
                    success:function(json){
                    },
                    error : function(xhr,errmsg,err) {
                        console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },
              });
              //---You'll need to send this SDP to the targetId peer --------//
              //---Choose a signaling mechanism using a server to do that ---//
          };

          this.iceCallback_ = function (event) {
              if (event.candidate && event.target.iceConnectionState != 'disconnected') {
                  var sdp_message = event.candidate;
                  console.log(event.candidate)

                  $.ajax({
                        type:'POST',
                        url:window.location.href,
                        data:{
                            sdp_type: 'candidate',
                            csrfmiddlewaretoken: window.csrf_token,
                            peer_id: thi$.originId,
                            sdp: JSON.stringify(sdp_message),
                            session_id: window.session_id,
                        },
                        success:function(responseJSON){
                            console.log('Sdp message response: ')
                            console.log(responseJSON);
                        },
                        error : function(xhr,errmsg,err) {
                            console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                        },
                  });
              }
          };

          this.iceStateChangedCallback_ = function (event) {
              if (!!event.target && event.target.iceConnectionState === 'disconnected') {
                  console.log("iceStateChanged to disconnected");
                  thi$.handlePeerDisconnection();
              }

          };

          this.signalingStateChangeCallback_ = function (event) {
              if(event.target && event.target.signalingState == "closed"){
                  console.log("signalingStateChanged to closed");
                  thi$.handlePeerDisconnection();
              }
          };

          this.onCreateDataChannelCallback_ = function (event) {
              if (thi$.dataChannel != null && thi$.dataChannel.readyState != 'closed') {
                  console.log('Received DataChannel, but we already have one.');
              }
              thi$.dataChannel = event.channel;
              console.log('DataChannel with label ' + thi$.dataChannel.label +
                  ' initiated by remote peer.');
              thi$.hookupDataChannelEvents();
          };

          this.onDataChannelReadyStateChange_ = function (event) {
              var readyState = event.target.readyState;
              console.log('DataChannel to ' + thi$.targetId + ' state:' + readyState);
              if (readyState.toLowerCase() == 'open') {
                  thi$.ready = true;
                  log('Connected!');
              }
          };

          this.onDataChannelClose_ = function (event) {
              console.log("data channel was closed");
              thi$.handlePeerDisconnection();
          };

          this.onMessageCallback_ = function (message) {
                console.log("receiving data on dataChannel");
                if(isString(message.data)){
                    var data = JSON.parse(message.data);
                    console.log('parsed message:')
                    console.log(data)
                    if(data.fileName){
                        fileStream = streamSaver.createWriteStream(data.fileName, {size: data.fileSize})
                        writer = fileStream.getWriter()
                    }
                    else{
                        if(data.last){
                            writer.close()
                            console.log('DONE!')
                        }
                    }
                }else{
                    saveChunk(writer, message.data);
                }
          };
      },
      ensureHasDataChannel:function () {
          if (this.peerConnection == null)
              console.log('Tried to create data channel, ' +
                  'but have no peer connection.');
          if (this.dataChannel != null && this.dataChannel != 'closed') {
              console.log('Creating DataChannel, but we already have one.');
          }
          this.createDataChannel();
      },
      createPeerConnection:function () {
          //----configure you stun_servers----//
          var servers = {"iceServers":[{url:"stun:stun.l.google.com:19302"}]}
          try {
              if(window.mozRTCPeerConnection)
                  this.peerConnection = new this.RTCPeerConnection(); //mozila has a default ice server hard coded
              else
                  this.peerConnection = new this.RTCPeerConnection(
                      servers
                  );
              this.peerConnection.candidates = {}; // to remember what candidates were added
          } catch (exception) {
              console.log('Failed to create peer connection: ' + exception);
          }
          this.peerConnection.onaddstream = this.addStreamCallback_;
          this.peerConnection.onremovestream = this.removeStreamCallback_;
          this.peerConnection.onicecandidate = this.iceCallback_;
          this.peerConnection.oniceconnectionstatechange = this.iceStateChangedCallback_;
          this.peerConnection.onicechange = this.iceStateChangedCallback_;
          this.peerConnection.onsignalingstatechange = this.signalingStateChangeCallback_;
          this.peerConnection.ondatachannel = this.onCreateDataChannelCallback_;
      },
      createDataChannel:function () {
          console.log("createDataChannel");
          this.dataChannel = this.peerConnection.createDataChannel(this.label, this.dataChannelOptions);
          //peer5.debug('DataChannel with label ' + this.dataChannel.label + ' initiated locally.');
          this.hookupDataChannelEvents();
      },
      closeDataChannel:function () {
          if (this.dataChannel == null)
              console.log('Closing DataChannel, but none exists.');
          console.log('DataChannel with label ' + this.dataChannel.label + ' is being closed.');
          this.dataChannel.close();
      },
      hookupDataChannelEvents:function () {
          this.dataChannel.binaryType = 'arraybuffer';
          this.dataChannel.onmessage = this.onMessageCallback_;
          this.dataChannel.onopen = this.onDataChannelReadyStateChange_;
          this.dataChannel.onclose = this.onDataChannelClose_;
          //connecting status:
          console.log('data-channel-status: ' + this.dataChannel.readyState);
      },

      handlePeerDisconnection:function(){
          if(this.dataChannel && this.dataChannel.readyState != "closed"){
              console.log("handling peer disconnection: closing the datachannel");
              this.dataChannel.close();
          }
          if(this.peerConnection.signalingState != "closed"){
              console.log("handling peer disconnection: closing the peerconnection");
              this.peerConnection.close();
          }
          log('Disconnected');
          log('Session expired');
      },

      peerConnectionStateValid:function(){
          if(this.peerConnection.iceConnectionState != 'closed' && this.peerConnection.signalingState != 'closed')
              return true;
          else{
              console.log("peerConnection state to " + this.targetId + " is invalid - 'not usable'");
              return false;
          }

      }
}


log('Initiating connection...')
peerConnection = new PeerConnectionImpl('receiver','sender', false, false)

connect()
