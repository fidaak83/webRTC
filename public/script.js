const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const startCallButton = document.getElementById('startCall');
const users_ids = document.getElementById('users');

const socket = io();
const peerConnection = new RTCPeerConnection();

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

socket.on('your:id', (data) => {
  console.log('users', data)
});

socket.on('user:joined', (id) => {
  USERS.user = id;
  console.log('users', USERS)
});

socket.on('users', (users) => {
  USERS.you = users[1]
  USERS.user = users[0]

  users_ids.innerHTML = JSON.stringify(USERS)
  // your_id.innerHTML = users[0]
  // user_id.innerHTML = users[1]
  console.log(USERS)
})

socket.on('user:disconnected', (id) => {

  USERS.user = null;
  console.log('users', USERS)
  console.log("user:disconnected", id)
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

// Start Call Button Click
startCallButton.addEventListener('click', async () => {
  remoteId = USERS.user;
  if (!remoteId) return alert('You must enter a remote user ID to start a call.');
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit('offer', { sdp: offer, target: remoteId });
});