const setButton = document.getElementById("btn");
const titleInput = document.getElementById("title");
const connectButton = document.getElementById("connect-btn");
const partnerIdInput = document.getElementById("partner-id-input");
const counterElement = document.getElementById("counter");
const connexionRequestContainerElement = document.getElementById("connexion-request-container");
const connexionRequestResponseContainerElement = document.getElementById("connexion-request-response-container");
const connexionRequestResponseTextElement = document.getElementById("connexion-request-response-text");
const controlButton = document.getElementById("control-btn");

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

controlButton.addEventListener('click', () => {
    createPeerConnection();
});

window.sessionAPI.onSetId((value) => {
  console.log("onSetId: ", value);
  counterElement.innerText = value;
  console.log("onSetId 1: ", value);
});

window.sessionAPI.onConnexionRequestResponse((value) => {
  if(value) {
    connexionRequestContainerElement.style.display = "none"
    connexionRequestResponseTextElement.innerText = "Connexion établie avec succès!"
    controlButton.style.visibility = "visible"
  } else  {
    connexionRequestResponseTextElement.innerText = "Echèc de l'établissement de la connexion : accès refusé!"
  }
})

function createPeerConnection() {
  peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      window.sessionAPI.sendIceCandidate(event.candidate);
    }
  };

  peerConnection.createOffer().then((offer) => {
    peerConnection.setLocalDescription(offer);
    window.sessionAPI.sendOffer(offer);
  });
}

function handleControl(data) {
  if (!isController) {
    if (data.type === 'mousemove') {
      window.robot.moveMouse(data.x, data.y);
    } else if (data.type === 'mouseclick') {
      window.robot.mouseClick();
    } else if (data.type === 'keypress') {
      window.robot.keyTap(data.key);
    }
  }
}

// Capture mouse and keyboard events and send them as control messages
document.addEventListener('mousemove', (event) => {
  if (isController) {
    window.sessionAPI.sendControl({
      type: 'mousemove',
      x: event.clientX,
      y: event.clientY
    });
  }
});

document.addEventListener('click', () => {
  if (isController) {
    window.sessionAPI.sendControl({
      type: 'mouseclick'
    });
  }
});


document.addEventListener('keydown', (event) => {
  if (isController) {
    window.sessionAPI.sendControl({
      type: 'keypress',
      key: event.key
    });
  }
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
