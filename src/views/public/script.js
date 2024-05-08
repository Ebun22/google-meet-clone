console.log("the javascript is connected...")
$(function() {

    const urlParams = new URLSearchParams(window.location.search);

    var meeting_id = urlParams.get('meetingID');

    if (!meeting_id) {
        var murl = window.location.origin + "?meetingID=" + (new Date()).getTime();
        $('#meetingid').attr('href', murl).text(murl);
        $("#meetingContainer").hide();
        $("#meetingbox").show();
        return;
    }

    var user_id = urlParams.get('uid');
    if (!user_id) {
        user_id = window.prompt('Enter your nick!');
    }

    if (!user_id || !meeting_id) {
        alert('user id or meeting id missing');
        window.location.href = '/action.html';
        return;
    }
    $("#meetingContainer").show();
    $("#meetingbox").hide();
    $(".username_holder").val(user_id);
    MyApp._init(user_id, meeting_id);

});

let mediaRecorder;
let recordedBlobs;
var recordButton = document.querySelector('#start-recording');
var downloadButton = document.querySelector('#download-video');
recordButton.addEventListener('click', () => {
    console.log(recordButton.textContent);
    if (recordButton.textContent === 'Start Recording') {
        startRecording();
        alert("start");
    } else {
        stopRecording();
        recordButton.textContent = 'Start Recording';
        //            playButton.disabled = false;
        downloadButton.disabled = false;
        alert("stop");
    }
});



downloadButton.addEventListener('click', () => {
    const blob = new Blob(recordedBlobs, {
        type: 'video/webm'
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
});

function handleDataAvailable(event) {
    console.log('handleDataAvailable', event);
    if (event.data && event.data.size > 0) {
        recordedBlobs.push(event.data);
    }
}

function startRecording() {
    navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
    }).then(stream => {


        recordedBlobs = [];
        let options = {
            mimeType: 'video/webm;codecs=vp9,opus'
        };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            console.error(`${options.mimeType} is not supported`);
            options = {
                mimeType: 'video/webm;codecs=vp8,opus'
            };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                console.error(`${options.mimeType} is not supported`);
                options = {
                    mimeType: 'video/webm'
                };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    console.error(`${options.mimeType} is not supported`);
                    options = {
                        mimeType: ''
                    };
                }
            }
        }

        try {
            mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
            console.error('Exception while creating MediaRecorder:', e);

            return;
        }

        console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
        recordButton.textContent = 'Stop Recording';
        //        playButton.disabled = true;
        downloadButton.disabled = true;
        mediaRecorder.onstop = (event) => {
            console.log('Recorder stopped: ', event);
            console.log('Recorded Blobs: ', recordedBlobs);
        };
        mediaRecorder.ondataavailable = handleDataAvailable;
        mediaRecorder.start();
        console.log('MediaRecorder started', mediaRecorder);
    })
}

function stopRecording() {
    mediaRecorder.stop();
}
$(function() {
    $(document).on("click", ".option-icon", function() {
        $(".recording-wrap").slideToggle(200)
    })
    const urlParams = new URLSearchParams(window.location.search);
    var meeting_id = urlParams.get('meetingID');
    var base_url = window.location.origin;




    $(document).on("click", ".share-attach", function(e) {
        e.preventDefault();
        var att_img = $("#customFile").prop('files')[0];
        var formData = new FormData();
        formData.append("zipfile", att_img);
        formData.append("meeting_id", meeting_id);
        formData.append("username", $('.username_holder').val());
        console.log(formData);

        $.ajax({
            url: base_url + "/attachimg",
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            success: function(response) {
                console.log(response);
            },
            error: function() {
                console.log('error');
            }
        })
    })




    $(".custom-file-input").on("change", function() {
        var fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
    });




    var time = new Date();
    var timeDiv = document.getElementsByClassName("top-left-time-wrap");
    timeDiv[0].innerHTML = time.toLocaleString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    })

    $(document).on('click', '.top-left-participant-wrap', function() {
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);

    });
    $(document).on('click', '.top-left-chat-wrap', function() {
        $(".g-right-details-wrap").show(300);
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);

    });
    $(document).on('click', '.meeting-heading-cross', function() {
        $(".g-right-details-wrap").hide(300);

    });
    $(document).on('click', '.chat-heading', function() {
        $(".in-call-wrap-up").hide(300);
        $(".chat-show-wrap").show(300);
    });
    $(document).on('click', '.people-heading', function() {
        $(".in-call-wrap-up").show(300);
        $(".chat-show-wrap").hide(300);
    });


    $(document).on('click', '.meeting-details-button', function() {
        $(".g-detail").slideToggle(300);
    });
    $(document).on("click", ".g-details-heading-detail", function() {
        $(".g-details-heading-show").show();
        $(".g-details-heading-show-attachment").hide();

    })
    $(document).on("click", ".g-details-heading-attachment", function() {
        $(".g-details-heading-show").hide();
        $(".g-details-heading-show-attachment").show();
    })
    $(document).on("click", ".copy_info", function() {
        var $temp = $("<input>");
        $("body").append($temp);
        $temp.val($(".meeting_url").text()).select();
        document.execCommand("copy");
        $temp.remove();
        $('.link-conf').show();
        setTimeout(function() {
            $('.link-conf').hide();
        }, 3000)
    })
    // $('[data-toggle="tooltip"]').tooltip();
    var url = window.location.href;
    $(".meeting_url").text(url)
    setTimeout(function() {
        var videoWidth = $("video").width();
        $("video").css({
            "width": videoWidth + "px"
        });
    }, 1000)

    function videoWith() {
        var videoCounter = $(".userbox").length;
        var videoContainerWidth = $("#divUsers").width();
        var videoWidth = (Math.floor(videoContainerWidth / videoCounter)) / 2;
        $("video").css({
            "width": videoWidth + "px"
        });
    }
    $(document).on('click', '.end-call-wrap', function() {
        $('.top-box-show').css({
            "display": "block"
        }).html('<div class="top-box align-vertical-middle profile-dialoge-show "> <h1 class="mt-2">Leave Meeting</h1> <hr> <div class="call-leave-cancel-action d-flex justify-content-center align-items-center w-100"> <a href="/sign"><button class="call-leave-action btn btn-danger mr-5">Leave</button></a> <button class="call-cancel-action btn btn-secondary">Cancel</button> </div> </div>');

    })
    $(document).mouseup(function(e) {
        var container = new Array();
        container.push($('.top-box-show'));
        $.each(container, function(key, value) {
            if (!$(value).is(e.target) && $(value).has(e.target).length === 0) {
                $(value).empty();
            }
        })

    })
    $(document).on('click', '.call-cancel-action', function() {
        $('.top-box-show').html('');
    })
})

