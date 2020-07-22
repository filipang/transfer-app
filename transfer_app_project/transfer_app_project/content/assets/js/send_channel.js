function log (str) {
    var p = document.createElement('p')
    p.innerHTML = str
    var l = document.querySelector('.log').appendChild(p)
}

function humanFileSize(bytes, si=false, dp=1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);


  return bytes.toFixed(dp) + ' ' + units[u];
}

function waitfor(test, expectedValue, msec, count, source, callback) {
    // Check if condition met. If not, re-check later (msec).
    while (test() > expectedValue) {
        count++;
        setTimeout(function() {
            waitfor(test, expectedValue, msec, count, source, callback);
        }, msec);
        return;
    }
    // Condition finally met. callback() can be executed.
    console.log(source + ': ' + test() + ', expected: ' + expectedValue + ', ' + count + ' loops.');
    callback();
}

new ClipboardJS('.copy_btn');

var drags = 0;
document.addEventListener("DOMContentLoaded", function(event) {
    var card = document.querySelector('#background_card')
    var original_color = card.getAttribute('style');
    var counter = 0;
    $('#background_card').bind({
        dragenter: function(ev) {
            ev.preventDefault(); // needed for IE
            counter++;
            card.setAttribute("style", "background: #b0b0b0!important;");
        },

        dragleave: function() {
            counter--;
            if (counter === 0) {
                card.setAttribute("style", original_color);
            }
        },

        drop: function() {
            counter--;
            if (counter === 0) {
                card.setAttribute("style", original_color);
            }
        }
    });
});


function sendFile(){};

var readyToSend = false;
var queuedFiles = [];

var peerConnection;
var progressBar = document.querySelector('#progressBar');
var progressStatus = document.querySelector('.status');
var downloadLink = document.querySelector('#download_link');

progressStatus.textContent = 'Waiting for a peer...'

function connect(){

    log('Initiating connection...')
    peerConnection = new PeerConnectionImpl('sender','receiver', true, false)
    peerConnection.setupCall()
    window.clearInterval(window.interval)
    window.interval = window.setInterval(function attempt_connection(){
    console.log(peerConnection.RTCPeerConnection.signalingState)
    console.log(peerConnection.dataChannel.readyState)
    console.log(peerConnection.signalingState)
    if(peerConnection.dataChannel.readyState == 'connecting'){
        $.ajax({
            type:'GET',
            url:window.location.href,
            data:{
                sdp_type: 'get_sdp',
                csrfmiddlewaretoken: window.csrf_token,
                peer_id: peerConnection.originId,
                session_id: window.session_id,
            },
            success:function(peer_session){
                console.log('Sdp message response: ')
                console.log(peer_session)
                if (peer_session['err']){
                    console.log('YEP ERROR')
                }
                else{
                    var answer = peer_session['answer']
                    //answer.sdpMessage = JSON.parse(answer.sdpMessage)
                    peerConnection.handleMessage(answer)
                    peer_session['ice_candidates'].forEach(function(candidate){
                        console.log('CANNNDIDATE')
                        console.log(candidate)
                        //candidate.sdpMessage = JSON.parse(candidate.sdpMessage)
                        peerConnection.handleMessage(candidate)
                    })
                    window.clearInterval(window.interval)
                }
            },
            error : function(xhr,errmsg,err) {
                console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
            },
        });
    }
}, 3000);

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
          var thi$ = this;
          if (thi$.dataChannel.readyState.toLowerCase() == 'open') {
              console.log("  on dataChannel");
              thi$.dataChannel.send(binaryMessage);
          } else {
              console.log('dataChannel was not ready, setting timeout');
              /*setTimeout(function (dataChannel, binaryMessage) {
                  thi$.send(dataChannel, binaryMessage);
              }, 1000, thi$.dataChannel, binaryMessage);*/
          }
      },
      close:function(){
          this.ready = false;
          this.dataChannel.close();
          this.peerConnection.close();
      },

      /** @private methods*/
      initiatePeerConnection:function (initiator) {
          var thi$ = this;
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
                        sdp_type: 'offer',
                        csrfmiddlewaretoken: window.csrf_token,
                        peer_id: thi$.originId,
                        sdp: session_description.sdp,
                        session_id: window.session_id,
                    },
                    success:function(responseJSON){
                        console.log(responseJSON)
                        log('<a href=\'' + '/live_transfer_download/' + responseJSON.session_id + '\'>Download link ready!</a>');
                        downloadLink.value = 'http://' + window.location.hostname + ":" + window.location.port + '/live_transfer_download/' + responseJSON.session_id;
                        log('Waiting for peer...');
                        console.log('Sdp message response: ')
                        console.log(responseJSON);
                    },
                    error : function(xhr,errmsg,err) {
                        console.log(xhr.status + ": " + xhr.responseText); // provide a bit more info about the error to the console
                    },
              });
          };

          this.iceCallback_ = function (event) {
              if (event.candidate && event.target.iceConnectionState != 'disconnected') {
                  var sdp_message = event.candidate;
                  console.log(event.candidate)
                  console.log('THIS IS THE ID: ' + thi$.originId)
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
                  //---You'll need to send this SDP to the targetId peer --------//
                  //---Choose a signaling mechanism using a server to do that ---//
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
                  log('Connected!')
                  progressStatus.textContent = 'Waiting for a file to send...'
                  readyToSend = true;
                  if(queuedFiles.length > 0){
                      console.log('SEND SOMETHING!')
                      console.log(queuedFiles[queuedFiles.length - 1])
                      sendFile(queuedFiles.pop())
                      readyToSend = false;
                  }

              }
          };

          this.onDataChannelClose_ = function (event) {
              console.log("data channel was closed");
              thi$.handlePeerDisconnection();
          };

          this.onMessageCallback_ = function (message) {
              console.log("receiving data on dataChannel");
              //---You have received a message, bubble it up to higher logic level --------//
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
          window.clearInterval(window.interval)
          log('Disconnected');
          connect();
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

connect()
function parseFile(file, callback) {
    var fileSize   = file.size;
    var chunkSize  = 32 * 1024; // bytes
    var maxBuffer = 8*1024*1024;
    var safeBuffer = 4 * chunkSize;
    var safe = true;
    var backPressureTimeout = 200; //ms
    var offset     = 0;
    var self       = this; // we need a reference to the current object
    var timeoutCount = 0;
    var chunkReaderBlock = null;


    var readEventHandler = function(evt) {
        if (evt.target.error == null) {
            offset += evt.target.result.byteLength;
            callback(evt.target.result, offset >= fileSize); // callback for handling read chunk

            progressBar.setAttribute("style", "width: " + (Math.round(offset/fileSize*100)) + "%");
            progressBar.textContent = (Math.round(offset/fileSize*10000)/100) + '% Complete'
        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
        if (offset >= fileSize) {
            console.log("Done reading file");
            console.log("THERE WERE" + timeoutCount + " TIMEOUTS DUE TO BACK PRESSURE")
            progressStatus.textContent = 'FILE SENT!'
            if(queuedFiles.length > 0){
                sendFile(queuedFiles.pop())
            }else{
                readyToSend = true;
            }
            return;
        }

        // of to the next chunk
        console.log('BUFFERED AMMOUNT: ' + peerConnection.dataChannel.bufferedAmount)
        if(peerConnection.dataChannel.bufferedAmount>=maxBuffer){
            waitfor(function(){return peerConnection.dataChannel.bufferedAmount}, safeBuffer, backPressureTimeout, 0,'something', function(){chunkReaderBlock(offset, chunkSize, file)});
        }
        else{
            chunkReaderBlock(offset, chunkSize, file);
        }
    }

    chunkReaderBlock = function(_offset, length, _file) {
        if(safe){
            var r = new FileReader();
            var blob = _file.slice(_offset, length + _offset);
            r.onload = readEventHandler;
            r.readAsArrayBuffer(blob);
        }
        else{
            if(peerConnection.dataChannel.bufferedAmount <= safeBuffer){
                chunkReaderBlock(_offset, length, _file);
                safe = true;
            }
            else{
                setTimeout(chunkReaderBlock, backPressureTimeout, _offset, length, _file)
            }
        }
    }

    // now let's start the read with the first block
    chunkReaderBlock(offset, chunkSize, file);
}

function sendFile(file){
        var data = {}
        data.fileName = file.name
        data.fileSize = file.size
        peerConnection.send(JSON.stringify(data));
        progressStatus.textContent = 'Sending file: ' + file.name + ' with size: ' + humanFileSize(file.size, false);
        parseFile(file, function(fileChunk, last){
            console.log('THIS IS SENT CHUNK')
            console.log(fileChunk)// data object to transmit over data channel
            peerConnection.send(fileChunk); // use JSON.stringify for chrome!
            if(last){
                var data = {};
                data.last = last;
                peerConnection.send(JSON.stringify(data));
            }

        })
}

dragDrop('body', function (files) {
    if(readyToSend){
        console.log('LANDED')
        queuedFiles = queuedFiles.concat(files);
        if(files.length === 1){
            log('Queued 1 file to send...');
        }
        else{
            log('Queued ' + files.length + ' files to send...');
        }
        sendFile(queuedFiles.pop())
    }else{
        queuedFiles = queuedFiles.concat(files);
        if(files.length === 1){
            log('Queued 1 file to send...');
        }
        else{
            log('Queued ' + files.length + ' files to send...');
        }
    }
})

