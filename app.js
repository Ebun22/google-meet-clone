var appProcess = (function () {
  let peers_connection_ids = [];
  let peers_connection = [];
  let remote_vid_stream = [];
  let remote_aud_stream = [];
  let serverProcess;
  let local_div;
  let audio;
  let videoCamTrack;
  let isAudioMute = true;
  let rtp_aud_senders = [];
  let rtp_vid_senders = [];
  let video_states = {
    none: 0,
    camera: 1,
    screenShare: 2,
  };
  let video_st = video_states.none;


  const _init = async (SDP_function, connId) => {
    serverProcess = SDP_function;
    connId = connId;
    local_div = document.getElementById("localVideoCtr");

    //functions called here are functions that aren't triggereed by events on the server side but rather by user interactions such as button clicks
    eventProcess();
  };

  function eventProcess() {
    $("#btnMuteUnmute").on("click", async () => {
      if (!audio) {
        await loadAudio();
      }
      if (!audio) {
        alert("Audio permission has not been granted");
        return;
      }
      if (isAudioMute) {
        audio.enabled = true;
        $(this).html('<span class="material-icons">mic</span>');
        updateMediaSenders(audio, rtp_aud_senders);
      } else {
        audio.enabled = false;
        $(this).html('<span class="material-icons">mic_off</span>');
        removeMediaSenders(audio, rtp_aud_senders);
      }
      isAudioMute = !isAudioMute;
    });

    $("#btnStartStopCam").on("click", async () => {
      if (video_st == video_states.camera) {
        await videoProcess(video_states.none);
      } else {
        await videoProcess(video_states.camera);
      }
    });
    $("#btnStartStopScreenshare").on("click", async () => {
      if (video_st == video_states.screenShare) {
        await videoProcess(video_states.none);
      } else {
        await videoProcess(video_states.screenShare);
      }
    });
  }

  async function loadAudio(){
    try{
      let astream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true
      });
      console.log("This is the astream: ", astream)
      audio = astream.getAudioTracks()[0];
      console.log("This is the audio: ", audio)
      audio.enabled = false;
    }catch(e){console.log(e)}
  }

  function connection_status(connection) {
    if (
      connection &&
      (connection.connectionState == "new" ||
        connection.connectionState == "connecting" ||
        connection.connectionState == "connected")
    ) {
      return true;
    }
    return false;
  }

  function updateMediaSenders(track, rtp_senders) {
    peers_connection_ids.forEach((id) => {
      if (connection_status(peers_connection_ids[id])) {
        if (rtp_senders[id] && rtp_senders[id].track) {
          rtp_senders[id].replaceTrack(track);
        } else {
          rtp_senders[id] = peers_connection[id].addTrack(track);
          console.log("This is the rtp_senders[id]: ", rtp_senders[id]);
        }
      }
    });
  }    

  function removeMediaSenders(rtp_senders){
    console.log("thid di teh rtp_senders[id]: ", rtp_senders)
    peers_connection_ids.forEach(id => {
      console.log("thid di teh rtp_senders[id]: ", id);
      if(rtp_senders[id] && connection_status(peers_connection_ids[id])){
        peers_connection[id].removeTrack(rtp_senders[id]);
        rtp_senders[id] = null;
      }
    })
  }

    function removeVideoStream(rtp_vid_senders){
      if(videoCamTrack){
        videoCamTrack.stop();
        videoCamTrack = null;
        local_div.srcObject = null;
        removeMediaSenders(rtp_vid_senders);
      }
    }

  async function videoProcess(newVideoState) {
    if(newVideoState == video_states.none){
      $('#btnStartStopCam').html('<span class="material-icons" style="width: 100%">videocam_off</span>');
      $("#btnStartStopScreenshare").html('<span class="material-icons"> present_to_all</span><div>Present Now</div>')
      video_st = newVideoState;
      removeVideoStream(rtp_vid_senders);
      return
    }else if(newVideoState == video_states.camera){
      $('#btnStartStopCam').html('<span class="material-icons" style="width: 100%">videocam_on</span>');
    }
    try {
      let vstream = null;
      if (newVideoState == video_states.camera) {
        vstream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        console.log("This is the getvideoTracks: ", vstream.getVideoTracks());
        if (vstream && vstream.getVideoTracks().length > 0) {
          videoCamTrack = vstream.getVideoTracks()[0];
          if (videoCamTrack) {
            local_div.srcObject = new MediaStream([videoCamTrack]);
            console.log("This is the videoCamTrack: ", videoCamTrack);
            updateMediaSenders(videoCamTrack, rtp_vid_senders);
          }
        }
        console.log(newVideoState);
      } else if (newVideoState == video_states.screenShare) {
        vstream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: 1920,
            height: 1080,
          },
          audio: false,
        });
        vstream.oninactive = (e) =>{
          removeVideoStream(rtp_vid_senders);
          $("#btnStartStopScreenshare").html('<span class="material-icons"> present_to_all</span><div>Present Now</div>')
        }
      }
    } catch (e) {
      console.log(e);
    }
    video_st = newVideoState;
    if (newVideoState == video_states.camera) {
      $('#btnStartStopCam').html('<span class="material-icons" style="width: 100%">videocam_off</span>');
      $("#btnStartStopScreenshare").html('<span class="material-icons"> present_to_all</span><div>Present Now</div>')
    }else if (newVideoState == video_states.screenShare) {
      $("#btnStartStopScreenshare").html('<span class="material-icons text-success"> present_to_all</span><div class="text-success">Stop Present Now</div>')
    }
  }

  const iceConfiguration = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  async function setNewConnection(connId) {
    const connection = new RTCPeerConnection(iceConfiguration);

    function garbageCycleForce(){
      setTimeout(() => {
        connection.close();
        connection = null;
      }, 10);
      console.log(i++);
      if (!(i % 20)) {
        // try to invoke GC on each 20ish iteration
        queueMicrotask(() => { 
          let img = document.createElement("img");
          img.src = window.URL.createObjectURL(new Blob([new ArrayBuffer(5e+7)])); // 50Mo or less or more depending as you wish to force/invoke GC cycle run
          img.onerror = function() {
            window.URL.revokeObjectURL(this.src);
            img = null
          }
        })  
      }

      setInterval(garbageCycleForce, 20)
    }

    connection.onnegotiationneeded = async (event) => {
      await setOffer(connId);
    };

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        serverProcess(
          Json.stringify({ iceCandidate: event.candidate }),
          connId
        );
      }
    };

    connection.ontrack = (event) => {
      if (!remote_vid_stream[connId]) {
        remote_vid_stream[connId] = new MediaStream();
      }
      if (!remote_aud_stream[connId]) {
        remote_aud_stream[connId] = new MediaStream();
      }
      if (event.track.kind == "video") {
        remote_vid_stream[connId]
          .getVideoTrack()
          .forEach((t) => remote_vid_stream[connId].removeTrack(t));
        remote_vid_stream[connId].addTrack(event.track);
        let remoteVideoPlayer = document.getElementById("v_" + connId);
        remoteVideoPlayer.srcObject = null;
        remoteVideoPlayer.srcObject = remote_vid_stream[connId];
        remoteVideoPlayer.load();
      } else if (event.track.kind == "audio") {
        remote_aud_stream[connId]
          .getAudioTrack()
          .forEach((t) => remote_aud_stream[connId].removeTrack(t));
        remote_aud_stream[connId].addTrack(event.track);
        let remoteAudioPlayer = document.getElementById("a_" + connId);
        remoteAudioPlayer.srcObject = null;
        remoteAudioPlayer.srcObject = remote_aud_stream[connId];
        remoteAudioPlayer.load();
      }
    };

    peers_connection_ids[connId] = connId;
    peers_connection[connId] = connection;
    if(video_st == video_states.camera || video_st == video_states.screenShare){
      if(videoCamTrack){
        updateMediaSenders(videoCamTrack, rtp_vid_senders);
      }
    }
    return connection;
  }

  const setOffer = async (connid) => {
    const connection = peers_connection[connid];
    let offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    serverProcess(
      Json.stringify({
        offer: connection.localDescription,
      }),
      connid
    );
  };

  const SDPProcess = async (message, from_connId) => {
    message = JSON.parse(message);
    if (message.answer) {
      await peers_connection[connId].setRemoteDescription(
        new RTCSessionDescription(message.answer)
      );
    } else if (message.offer) {
      if (!peers_connection[from_connId]) {
        await setNewConnection(from_connId);
      }
      await peers_connection[from_connId].setRemoteDescription(
        new RTCSessionDescription(message.offer)
      );
      let answer = await peers_connection[from_connId].createAnswer();
      await peers_connection[from_connId].setLocalDescription(answer);
      serverProcess(
        JSON.stringify({
          answer: answer,
        }),
        from_connId
      );
    } else if (message.iceCandidiate) {
      if (!peers_connection[from_connId]) {
        await setNewConnection(from_connId);
      }
      try {
        await peers_connection[from_connId].addIceCandidate(
          message.iceCandidate
        );
      } catch (e) {
        console.log(e);
      }
    }
  };

  const closeConnection = async (connId) => {
    peers_connection_ids[connId] = null;
    console.log(peers_connection_ids[connId], peers_connection[connId])
    if(peers_connection[connId]){
      peers_connection[connId].close();
      peers_connection[connId] = null;
    }
    if(remote_aud_stream[connId]){
      remote_aud_stream[connId].getTracks().forEach(t => {
        if(t.stop) t.stop();
      })
      remote_aud_stream[connId] = null
    }
    if(remote_vid_stream[connId]){
      remote_vid_stream[connId].getTracks().forEach(t => {
        if(t.stop) t.stop();
      });
      remote_vid_stream[connId] = null
    }
  }

  return {
    setNewConnection: async (connId) => {
      await setNewConnection(connId);
    },
    init: async (SDP_function, connId) => {
      await _init(SDP_function, connId);
    },
    processClientFunction: async (data, from_connId) => {
      await SDPProcess(data, from_connId);
    },
    closeConnectionCall: async (connId) => {
      await closeConnection(connId);
    },
  };
})();

var MyApp = (function () {
  var socket = null;
  const baseUrl = window.location.origin
  // var socker_url = "http://localhost:3000";
  var meeting_id = "";
  var user_id = "";

  var mediaRecorder
  var chunks = [];

  function init(uid, mid) {
    user_id = uid;
    meeting_id = mid;
    $("#meetingContainer").show();
    $("#me h2").text(user_id + "(Me)");
    document.title = user_id;

    event_process_for_signaling_server();
    eventHandling();

  }
// console.log("This is the io var ", io())
  function event_process_for_signaling_server() {
    socket = io();

    const SDP_function = (data, to_connId) => {
      socket.emit("SDPProcess", {
        message: data,
        to_connId: to_connId,
      });
    };



    socket.on("connect", () => {
      if (socket.connected) {
        appProcess.init(SDP_function, socket.id);
        if (user_id !== "" && meeting_id !== "") {
          socket.emit("userConnection", {
            displayName: user_id,
            meetingId: meeting_id,
          });
          
          //to inform other users of me
          socket.on("informOtherUsersAboutMe", (data) => {
            addUser(data.otherUserDisplayName, data.conId, data.userCount);
            appProcess.setNewConnection(data.connId);
          });

          //to inform me of other users in my meeting
          socket.on("informMeAboutOtherUser", (otherUsers) => {
            const userCount = otherUsers.length + 1
            otherUsers.forEach((user) => {
              addUser(user.displayName, user.connectionId, userCount);
              appProcess.setNewConnection(user.connectionId);
            });
          });

          socket.on("SDPProcess", async (data) => {
            await appProcess.processClientFunction(
              data.message,
              data.from_connId
            );
          });
        }

        socket.on("informOthersAboutDisconnectedUser", async (data) => {
          $(`#${data.connId}`).remove()
          $('.participant-count').text(data.numUserLeft)
          $(`.participant_${connId}`).remove()
          await appProcess.closeConnectionCall(data.connId)
        })

        socket.on('showMessage', (data) => {
          const time = new Date();
          const lTime = time.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })
          const div = $("<div>").html("<span class='font-weight-bold mr-3' style='color:black'>"+data.from+"</span>"+lTime+"<br />"+data.message);
          $('#messages').append(div)
        })

        socket.on('showFileMessage', (data) => {
          const time = new Date();
          const lTime = time.toLocaleString('en-US', {
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
          })
          let attachFileAreaForOthers = $document.querySelector(".show-attach-file");
          attachFileAreaForOthers.innerHTML += `<div class='left-align' style='display:flex;align-items:center;'> 
          <img src='src/views/public/attachment/2773904/69-image6.jpeg' style='height:40px;width:40px;' 
          class='caller-image circle'><div style='font-weight:600;margin:0 5px;'>${data.username}<div>:<div>
          <a style='color:#007bff; href=${data.filePath}download>${data.fileName}</a></div></div><br/>`;
        })

      }
    });
  }

  function eventHandling(){
    $('#btnsend').on('click', () => {
      socket.emit('sendMessage', $('#msgbox').val());

      const time = new Date();
      const lTime = time.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })
      const div = $("<div>").html("<span class='font-weight-bold mr-3' style='color:black'>"+user_id+"</span>"+lTime+"<br />"+"<span>"+ $('#msgbox').val()+ "</span>");
   
      $('#messages').append(div)
      $('#msgbox').val("")
    })
    const url = window.location.href;
    $(".meeting_url").text(url);

    $("divUsers").on("dbclick", 'video', () => {
      this.requestFullscreen();
    })
  };

  function addUser(otherUserId, connId, userCount) {
    let newDivId = $("#otherTemplate").clone();
    newDivId = newDivId.attr("id", connId).addClass("other");
    newDivId.find("h2").text(otherUserId);
    newDivId.find("video").attr("id", "v_" + connId);
    newDivId.find("audio").attr("id", "a_" + connId);
    newDivId.show();
    $("#divUsers").append(newDivId);
    $(".in-call-wrap-up").append('<div class="in-call-wrap d-flex justify-content-between align-items-center mb-3" id="participant_'+connId+'" > <div class="participant-img-name-wrap display-center cursor-pointer"> <div class="participant-img"> <img src="images/other.jpg" alt="" class="border border-secondary" style="height: 40px;width: 40px;border-radius: 50%;"> </div> <div class="participant-name ml-2">'+otherUserId+'</div> </div> <div class="participant-action-wrap display-center"> <div class="participant-action-dot display-center mr-2 cursor-pointer"> <span class="material-icons"> more_vert </span> </div> <div class="participant-action-pin display-center cursor-pointer"> <span class="material-icons"> push_pin </span> </div> </div> </div>');
    $(".participant-count").text(userCount);
  }

  $(document).on('click', '.people-heading', () => {
    $('.chat-show-wrap').hide(300);
    $('.in-call-wrap-up').show(300);
    $(".people-heading").addClass("active")
    $('.chat-heading').removeClass("active")
  });

  $(document).on('click', '.chat-heading', () => {
    $('.chat-show-wrap').show(300);
    $('.in-call-wrap-up').hide(300);
    $(".chat-heading").addClass("active")
    $('.people-heading').removeClass("active")
  });

  $(document).on('click', '.meeting-heading-cross', () => {
    $('.g-right-details-wrap').hide(300);
  });

  $(document).on('click', '.top-left-participant-wrap ', () => {
    $(".chat-heading").removeClass("active")
    $('.people-heading').addClass("active")
    $('.g-right-details-wrap').show(300);
    $('.in-call-wrap-up').show(300);
    $('.chat-show-wrap').hide(300);
  });

  $(document).on('click', '.top-left-chat-wrap', () => {
    $(".chat-heading").addClass("active")
    $('.people-heading').removeClass("active")
    $('.g-right-details-wrap').show(300);
    $('.in-call-wrap-up').hide(300);
    $('.chat-show-wrap').show(300);
  });

  $(document).on('click', '.end-call-wrap', () => {
    $('.top-box-show').css({'display':'block'}).html(' <div class="top-box align-vertical-middle profile-dialogue-show"> <h1 class="mt2">Leave Meeting</h1><br /> <div class="call-leave-cancel-action d-flex justify-content-center align-items-center w-100"> <a href="/action.html"><button class="call-leave-action btn btn-danger mr-5">Leave</button></a> <button class="call-cancel-action btn btn-secondary">Cancel</button> </div> </div>');
  });

  $(document).on('click', '.g-details-heading-attachment', () => {
    $('.g-details-heading-show').hide()
    $('.g-details-heading-show-attachment').show()
    $('.g-details-heading-attachment').addClass("active")
    $('.g-details-heading-detail').removeClass("active")
   });
  $(document).on('click', '.g-details-heading-detail', () => {
    $('.g-details-heading-show').show()
    $('.g-details-heading-show-attachment').hide()
    $('.g-details-heading-attachment').removeClass("active")
    $('.g-details-heading-detail').addClass("active")
   });

   $(document).on('click', '.call-cancel-action', () => {
    $('.top-box-show').html('')
    })

  $(document).on('click', '.meeting-details-button', () => {
    console.log("this button was clicked")
    $('.g-detail').show(300)
   // $('.g-detail').slideUp(300)
   });

  $(document).on('change', '.custom-file-input', () => {
    const fileName = $('.custom-file-input').val().split('\\').pop()
    $('.custom-file-input').siblings(".custom-file-label").addClass("selected").html(fileName);
  });

  $(document).on('click', '.share-attach', (e) => {
    e.preventDefault();
    const att_img = $("#customFile").prop('files')[0]
    console.log(att_img)
    const formData = new FormData();
    formData.append('zipfile', att_img)
    formData.append('meetingId', meeting_id)
    formData.append('username', user_id)
    formData.forEach((value, key) => {
      console.log(`${key}: ${value}`);
    });

    $.ajax({
      url: `${baseUrl}/attachment`,
      type: "POST",
      data: formData,
      contentType: false,
      processData: false,
      success: (response) => {
        console.log(response)
      },
      error: () => {
        console.log(error)
      }
    })

      var attachFileArea = $('.show-attach-file');
      var inputFiles = $("#customFile")[0].files
      var attachFileName = inputFiles[0].name.split("\\").pop();
      console.log(attachFileName);

      var attachFilePath = `src/views/public/attachment/${meeting_id}/${attachFileName}`;
      attachFileArea.append(`<div class='left-align' style='display:flex;align-items:center;'>
          <img src='src/views/public/attachment/2773904/69-image6.jpeg' style='height:40px;width:40px;' 
          class='caller-image circle'>
          <div style='font-weight:600;margin:0 5px;'>${user_id}: 
          <a style='color:#007bff;' href='${attachFilePath}' download>${attachFileName}</a></div></div><br/>`);
    
      $("label.custom-file-label").text("");

      socket.emit('fileTransferToOther', {
        username: user_id,
        meetingId: meeting_id,
        filePath: attachFilePath,
        fileName: attachFileName,
      });
      
  });

  $(document).on('click', '.copy_info', async () => {
    try{
      const textToCopy = $(".meeting_url").text()
      await navigator.clipboard.writeText(textToCopy)
    }catch(err){console.log(err)}

    $(".link-conf").show();
    setTimeout(() => {
      $('.link-conf').hide();
    }, 3000)
  })


  $(document).mouseup((e) => {
      const container = new Array();
      container.push($('.top-box-show'));
      $.each(container, (key, value) => {
        if(!$(value).is(e.target) && $(value).has(e.target).length == 0){
          $(value).empty();
        }
      })
  })

  $(document).mouseup((e) => {
      const container = new Array();
      container.push($('.g-detail'));
      container.push($('.g-right-details-wrap'));
      $.each(container, (key, value) => {
        if(!$(value).is(e.target) && $(value).has(e.target).length == 0){
          $(value).hide(1000);
        }
      })
  })

  $(document).on('click', ".option-icon", () => {
     $(".recording-show").toggle(300)
  })
  
  $(document).on('click', ".start-record", () => {
     $(".start-record").removeClass().addClass("stop-record btn-danger text-light").text("Stop Recording");
     startRecording()
  })

  $(document).on('click', ".stop-record", () => {
     $(".stop-record").removeClass().addClass("start-record btn-dark text-danger").text("Start Recording");
     mediaRecorder.stop()
  })

  async function captureScreen(mediaConstraints = {
    video: true
  }){
    const screenStream = await navigator.mediaDevices.getDisplayMedia(mediaConstraints)
    return screenStream;
  }

  async function captureAudio(mediaConstraints = {
    video: false,
    audio: true
  }){
    const audioStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    return audioStream;
  }

  async function startRecording(){
    const screenStream = await captureScreen();
    const audioStream = await captureAudio();
    const stream = new MediaStream([...screenStream.getTracks(), ...audioStream.getTracks()]);
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    mediaRecorder.onstop() = (e) => {
      const clipName = prompt("Enter a name for your recording");
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, {
        type: "video/webm"
      })
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${clipName}.webm`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100)
    }

    mediaRecorder.ondataavailable = (e) => {
      chunks.push(e.data)
    }
  }

  return {
    _init: function (uid, mid) {
      init(uid, mid);
    },
  };
})();
