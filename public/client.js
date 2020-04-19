// Get a reference to webpage elements
var divSelectRoom = document.getElementById("selectRoom");
var divConferenceRoom = document.getElementById("conferenceRoom");
var inputRoomNumber = document.getElementById("roomNumber");
var btnGoRoom = document.getElementById("goRoom");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVide");
// Global variables
var roomNumber;
var localStream;
var remoteStream;
var rtcPeerConnection;
//the STUN servers
var iceServers = {
    'iceServers': [
        {'url': 'stun:stun.services.mozilla.com'},
        {'url': 'stun:stun.l.google.com:19302'}
    ]
}
var streamConstraints = {audio: true, video: true};
var isCaller;

// Connect to socket.io server
var socket = io();

// Add a click event to button
btnGoRoom.onclick = function () {
    if (inputRoomNumber.value === '') {
        alert("Please type a room number");
    } else {
        roomNumber = inputRoomNumber.value; // Grab from element
        socket.emit('create or join', roomNumber); // send message to server
        divSelectRoom.style = "display:none;"; //hide selectRoom div
        divConferenceRoom.style = "display:block;"; //show div
    }
};

// When server emits created
socket.on('created', function(room) {
    //caller gets user media devices with defined constraints
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream){
        localStream = stream;
        try {
            localVideo.srcObject = stream; // show stream to user
        } catch (error) {
            localVideo.src = URL.createObjectURL(stream); 
        }
        isCaller = true; // sets current user as caller
    }).catch(function (err) {
        console.log("An error occured when accesing media devices", err)
    });
});

// when server emits joined
socket.on('joined', function(room){
    //callee gets user media devices
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function(stream){
        localStream = stream; // sets local stream to variable
        try {
            localVideo.srcObject = stream; // show stream to user
        } catch (error) {
            localVideo.src = URL.createObjectURL(stream); 
        }

        socket.emit('ready', roomNumber); // send message to server
    }).catch(function(err) {
        console.log("An error occured when accessing media devices", err);
    });
});


//when server emits ready
socket.on('ready', function() {
    if (isCaller) {
        //creates an RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        //adds event listeners to newly created object
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        //adds the local stream to the object
        rtcPeerConnection.addStream(localStream);

        //prepares an offer
        rtcPeerConnection.createOffer(setLocalAndOffer, function(e){console.log(e)})
    }
});

//when servers emits offer
socket.on('offer',function(event){
    if(isCaller){
        //creates RTCPeerConnection object
        rtcPeerConnection = new RTCPeerConnection(iceServers);

        //adds event listeners
        rtcPeerConnection.onicecandidate = onIceCandidate;
        rtcPeerConnection.onaddstream = onAddStream;

        //adds the current local stream to the object
        rtcPeerConnection.addStream(localStream);

        //stores the offer as a remote description
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));

        //prepares answer
        rtcPeerConnection.createAnswer(setLocalAndAnswer, function(e){console.log(e)});
    }
});

//when server emits answer
socket.on('answer',function(event){
    //stores it as a remote description
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
});

//when server emits candidate
socket.on('candidate',function(event){
    //create candidate object
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    //stores candidate
    rtcPeerConnection.addIceCandidate(candidate);
});

//when a user receives the other user's video and audio stream
function onAddStream(event) {
    remoteVideo.src = URL.createObjectURL(event.stream);
    try {
        remoteVideo.srcObject = event.stream; // show stream to user
    } catch (error) {
        remoteVidea.src = URL.createObjectURL(event.stream); 
    }
    remoteStream = event.stream;
}

//Listeners

//sends a candidate message to the server
function onIceCandidate(event){
    if (event.candidate){
        console.log('sending ice candidate');
        socket.emite('candidate', {
            type:'candidate',
            label:event.candidate.sdpMLineIndex,
            id:event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}

//stores offer and sends message to server
function setLocalAndOffer(sessionDescription){
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer',{
        type:'offer',
        sdp:sessionDescription,
        room:roomNumber
    });
}

//stores answer and sends message to server
function setLocalAndAnswer(sessionDescription){
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer',{
        type:'answer',
        sdp:sessionDescription,
        room:roomNumber
    });
}

