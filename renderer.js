const setButton = document.getElementById("btn");
const titleInput = document.getElementById("title");
const connectButton = document.getElementById("connect-btn");
const partnerIdInput = document.getElementById("partner-id-input");
const counterElement = document.getElementById("counter");
//const { ipcRenderer } = require('electron');
//const robot = require('robotjs');

let peerConnection;
let isController = false;

setButton.addEventListener("click", () => {
  const title = titleInput.value;
  window.sessionAPI.setTitle(title);
});

connectButton.addEventListener("click", () => {
  const partnerId = partnerIdInput.value;
  console.log("partnerId :", partnerId);
  window.sessionAPI.sendConnectionRequest(partnerId);
});

window.sessionAPI.onSetId((value) => {
  counterElement.innerText = value;
  console.log("value: ", value);
});
/*
document.getElementById('toggleRole').addEventListener('click', () => {
    isController = !isController;
    ipcRenderer.send('message', { type: 'toggle-role', data: isController });
    if (isController) {
      createPeerConnection();
    }
  });

  ipcRenderer.on('message', (event, data) => {
    if (data.type === 'offer') {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.data));
      peerConnection.createAnswer().then((answer) => {
        peerConnection.setLocalDescription(answer);
        ipcRenderer.send('message', { type: 'answer', data: answer });
      });
    } else if (data.type === 'answer') {
      peerConnection.setRemoteDescription(new RTCSessionDescription(data.data));
    } else if (data.type === 'ice-candidate') {
      peerConnection.addIceCandidate(new RTCIceCandidate(data.data));
    } else if (data.type === 'control') {
      handleControl(data.data);
    }
  });

  function createPeerConnection() {
    peerConnection = new RTCPeerConnection();

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        ipcRenderer.send('message', { type: 'ice-candidate', data: event.candidate });
      }
    };

    peerConnection.createOffer().then((offer) => {
      peerConnection.setLocalDescription(offer);
      ipcRenderer.send('message', { type: 'offer', data: offer });
    });
  }

  function handleControl(data) {
    if (!isController) {
      if (data.type === 'mousemove') {
        robot.moveMouse(data.x, data.y);
      } else if (data.type === 'mouseclick') {
        robot.mouseClick();
      } else if (data.type === 'keypress') {
        robot.keyTap(data.key);
      }
    }
  }*/

  // Capture mouse and keyboard events and send them as control messages
  // You'll need to implement this based on your specific requirements


/*const setButton = document.getElementById('btn');
const titleInput = document.getElementById('title');
 const connectButton = document.getElementById('connect-btn');
 const partnerIdInput = document.getElementById('partner-id-input');
  const counterElement = document.getElementById('counter');
  setButton.addEventListener('click', () => {
    const title = titleInput.value;
    window.sessionAPI.setTitle(title); });
     connectButton.addEventListener('click', () => {
          const partnerId = partnerIdInput.value;
          window.sessionAPI.sendConnectionRequest(partnerId); });
           window.sessionAPI.onSetId((value) => {
            counterElement.innerText = value;
            console.log('value: ', value); });*/
