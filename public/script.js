// A $( document ).ready() block.
$(document).ready(function () {



  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const startCallButton = document.getElementById('startCall');
  const endCallButton = document.getElementById('endCall');
  const users_ids = document.getElementById('users');
  const socket = io();

  let peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun.l.google.com:5349" },
      { urls: "stun:stun1.l.google.com:3478" },
      { urls: "stun:stun1.l.google.com:5349" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:5349" },
      { urls: "stun:stun3.l.google.com:3478" },
      { urls: "stun:stun3.l.google.com:5349" },
      { urls: "stun:stun4.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:5349" }
    ]
  });

  let localStream;
  let remoteId;

  const USERS = { you: null, user: null };
  // console.log(socket.id)
  // Get local video/audio stream
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then((stream) => {
      localStream = stream;
      localVideo.srcObject = stream;
      stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
    })
    .catch((error) => {
      console.error('Error accessing media devices:', error);
    });

  // Handle remote track
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Handle ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate && remoteId) {
      socket.emit('candidate', { candidate: event.candidate, target: remoteId });
    }
  };

  socket.on('your:id', (id) => {
    USERS.you = id
    console.log('You Joined:', USERS)
  });

  socket.on('user:joined', (id) => {
    USERS.user = id;
    console.log('User Joined:', USERS)
    $('#user').html('Connected')
  });



  socket.on('user:disconnected', (id) => {

    USERS.user = null;
    $('#user').html('Disconnected')
  });

  // Socket.IO event listeners
  socket.on('offer', async (data) => {
    remoteId = data.sender;
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('answer', { sdp: answer, target: remoteId });
  });

  socket.on('answer', async (data) => {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  });

  socket.on('candidate', async (data) => {
    if (data.candidate) {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
  });

  socket.on('callEnded', async () => {
    if (peerConnection) {
      peerConnection.close()
      peerConnection = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    location.reload();
    // alert('The call has been ended by the other user.');
  });

  // Start Call Button Click
  startCallButton.addEventListener('click', async () => {
    remoteId = USERS.user;
    if (!remoteId) return alert('You must enter a remote user ID to start a call.');
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('offer', { sdp: offer, target: remoteId });
  });

  // End Call Button Click
  endCallButton.addEventListener('click', () => {
    // Close the Peer Connection
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    // Stop Local Media Tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    // Notify the Remote Peer
    socket.emit('endCall', { target: remoteId });

    // Reset UI or States as Needed
    location.reload();
  });
});