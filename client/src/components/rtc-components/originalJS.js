//our username 
var name;
var connectedUser;

//connecting to our signaling server
// replace with correct address: 
// var conn = new WebSocket('ws://boiling-gorge-94896.herokuapp.com/');
var conn = new WebSocket('ws://localhost:9091');

conn.onopen = function () {
  console.log("Connected to the signaling server");
};

//when we got a message from a signaling server 
conn.onmessage = function (msg) {
  console.log("Got message", msg.data);
  var data = JSON.parse(msg.data);

  switch (data.type) {
    // remove these for merge --> use existing login route
    case "login":
      handleLogin(data.success);
      break;

    // when we want to call someone
    case "offer":
      handleOffer(data.offer, data.name);
      break;

    // when somebody wants to call us 
    case "answer":
      handleAnswer(data.answer);
      break;

    // when a remote peer sends an ice candidate to us 
    case "candidate":
      handleCandidate(data.candidate);
      break;

    // when ending a call
    case "leave":
      handleLeave();
      break;
    default:
      break;
  }
};

conn.onerror = function (err) {
  console.log("Got error", err);
};

//alias for sending JSON encoded messages 
function send(message) {
  //attach the other peer username to our messages 
  if (connectedUser) {
    message.name = connectedUser;
  }
  conn.send(JSON.stringify(message));
};

//UI selectors block 

// can be removed for integration
var loginPage = document.querySelector('#loginPage');
var usernameInput = document.querySelector('#usernameInput');
var loginBtn = document.querySelector('#loginBtn');
var callPage = document.querySelector('#callPage');
// can be removed for integration --> call btn will be directly linked to another user
var callToUsernameInput = document.querySelector('#callToUsernameInput');
var callBtn = document.querySelector('#callBtn');
var hangUpBtn = document.querySelector('#hangUpBtn');
var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
// alternative audio-only case - replace above two lines with:
// var localAudio = document.querySelector('#localAudio');
// var remoteAudio = document.querySelector('#remoteAudio');

var yourConn;
var stream;

callPage.style.display = "none";

// remove following login handler for integration
// Login when the user clicks the button 
loginBtn.addEventListener("click", function (event) {
  name = usernameInput.value;

  if (name.length > 0) {
    send({
      type: "login",
      name: name
    });
  }
});

// refactored handleLogin & calling / receiving for integration
function handleLogin(success) {
  if (success === false) {
    alert("Ooops...try a different username");
  } else {
    loginPage.style.display = "none";
    callPage.style.display = "block";

    //Starting a peer connection 

    //getting local video stream 
    navigator.mediaDevices.getUserMedia = (navigator.mediaDevices.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia ||
      navigator.msGetUserMedia);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      // for audio only: 
      // navigator.mediaDevices.getUserMedia({ video: false, audio: true })
      .then(function (stream) {
        //displaying local video stream on the page 
        localVideo.srcObject = stream;
        //using Google public stun server 
        var configuration = {
          "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
        };
        yourConn = new RTCPeerConnection(configuration);
        // setup stream listening 
        yourConn.addStream(stream);
        //when a remote user adds stream to the peer connection, we display it 
        yourConn.onaddstream = function (e) {
          remoteVideo.srcObject = e.stream;
          // for audio-only stream:
          // remoteAudio.srcObject = e.stream;
        };
        // Setup ice handling 
        yourConn.onicecandidate = function (event) {
          if (event.candidate) {
            send({
              type: "candidate",
              candidate: event.candidate
            });
          }
        };
      });
  }
};

//initiating a call 
callBtn.addEventListener("click", function () {
  var callToUsername = callToUsernameInput.value;
  // replace this with checking if the username/uuid being called is online -- or only allow calling to online users;
  // also add in a 'accept call' button on recipient side - in 'handleOffer' function below
  if (callToUsername.length > 0) {
    connectedUser = callToUsername;
    // create an offer 
    yourConn.createOffer(function (offer) {
      send({
        type: "offer",
        offer: offer
      });
      yourConn.setLocalDescription(offer);
    }, function (error) {
      alert("Error when creating an offer");
    });
  }
});

//when somebody sends us an offer 
function handleOffer(offer, name) {
  connectedUser = name;
  yourConn.setRemoteDescription(new RTCSessionDescription(offer));
  //create an answer to an offer 
  yourConn.createAnswer(function (answer) {
    yourConn.setLocalDescription(answer);
    send({
      type: "answer",
      answer: answer
    });
  }, function (error) {
    alert("Error when creating an answer");
  });
};

//when we got an answer from a remote user
function handleAnswer(answer) {
  yourConn.setRemoteDescription(new RTCSessionDescription(answer));
};

//when we got an ice candidate from a remote user 
function handleCandidate(candidate) {
  yourConn.addIceCandidate(new RTCIceCandidate(candidate));
};

//hang up 
hangUpBtn.addEventListener("click", function () {
  send({
    type: "leave"
  });
  handleLeave();
});

function handleLeave() {
  connectedUser = null;
  remoteVideo.src = null;
  yourConn.close();
  yourConn.onicecandidate = null;
  yourConn.onaddstream = null;
};