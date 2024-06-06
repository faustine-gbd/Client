const { app, BrowserWindow, ipcMain } = require("electron/main");
const { dialog, desktopCapturer } = require("electron");
const os = require("os");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

let mainWindow;
let ws;
let nomPc;
let peerConnection;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"), // Préchargement du script pour l'exposition d'objets
    },
  });

  ipcMain.on("set-title", (event, title) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.setTitle(title);
  });

  ipcMain.on("send-partner-id", (event, partnerId) => {
    sendConnectionRequest(partnerId);
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Récupérer l'adresse IP et le nom de l'ordinateur
  const networkInterfaces = os.networkInterfaces();
  let wiFiInterface;
  if (os.platform() === "win32") {
    wiFiInterface = networkInterfaces["Wi-Fi"];
  } else if (os.platform() === "darwin") {
    wiFiInterface = networkInterfaces["en0"] || networkInterfaces["en1"];
  }

  let ipAddress = "";
  if (wiFiInterface) {
    const matchingInterface = wiFiInterface.find(
      (iface) => iface.family === "IPv4" && iface.address !== "192.168.1.27"
    );
    if (matchingInterface) {
      ipAddress = matchingInterface.address;
    } else {
      console.error("Aucune interface Wi-Fi correspondante n'a été trouvée.");
    }
  } else {
    console.error("L'interface Wi-Fi n'est pas disponible.");
  }

  console.log("IP Address: ", ipAddress);
  nomPc = os.hostname();
  console.log("Nom de l'ordinateur:", nomPc);

  // Envoyer une requête de demande d'identification au serveur
  sendIdentificationRequest(nomPc);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

function sendIdentificationRequest(nomPc) {
  const options = {
    hostname: "192.168.1.27",
    port: 8000,
    path: "/demande-identifiants",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      res.on("data", (chunk) => {
        const responseData = JSON.parse(chunk);
        const randomId = responseData.random_id;
        console.log("ID reçu du serveur:", randomId);
        mainWindow.webContents.send("set-id", randomId);
        // Établir la connexion WebSocket avec le serveur
        ws = new WebSocket(`ws://192.168.1.27:8081`);

        ws.on("open", () => {
          ws.send(JSON.stringify({ type: "register", nomPc }));
          console.log("Connexion WebSocket établie");
        });

        ws.on("message", (message) => {
          try {
            const data = JSON.parse(message);

            switch (data.type) {
              case "connexion-request-to-receiver":
                const { receiverName, senderName } = data.data;
                console.log(
                  "receiverName : ",
                  receiverName,
                  "senderName :",
                  senderName
                );
                if (receiverName === nomPc) {
                  handleConnexionDialog(senderName);
                }
                break;
              case "offer":
                peerConnection.setRemoteDescription(
                  new RTCSessionDescription(message.data)
                );
                peerConnection.createAnswer().then((answer) => {
                  peerConnection.setLocalDescription(answer);
                  ws.send(JSON.stringify({ type: "answer", data: answer }));
                });
                break;
              case "answer":
                peerConnection.setRemoteDescription(
                  new RTCSessionDescription(message.data)
                );
                break;
              case "ice-candidate":
                peerConnection.addIceCandidate(
                  new RTCIceCandidate(message.data)
                );
                break;
              case "control":
                handleControl(message.data);
                break;

              default:
                console.log("Message type non reconnu:", message.type);
            }
          } catch (error) {
            console.error(`Erreur lors du traitement du message: ${error}`);
          }
        });

        ipcMain.on("toggle-role", () => {
          isController = !isController;
          if (isController) {
            createPeerConnection();
          }
        });

        ipcMain.on("control", (event, data) => {
          if (isController) {
            ws.send(JSON.stringify({ type: "control", data: data }));
          }
        });

        function createPeerConnection() {
          peerConnection = new RTCPeerConnection();

          peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
              ws.send(
                JSON.stringify({ type: "ice-candidate", data: event.candidate })
              );
            }
          };

          peerConnection.createOffer().then((offer) => {
            peerConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({ type: "offer", data: offer }));
          });
        }

        function handleControl(data) {
          if (!isController) {
            if (data.type === "mousemove") {
              robot.moveMouse(data.x, data.y);
            } else if (data.type === "mouseclick") {
              robot.mouseClick();
            } else if (data.type === "keypress") {
              robot.keyTap(data.key);
            }
          }
        }

        ws.on("close", () => {
          console.log("Connexion WebSocket fermée");
        });

        ws.on("error", (error) => {
          console.error("Erreur de connexion WebSocket:", error);
        });
      });
    } else {
      console.error("Erreur de connexion:", res.statusCode);
    }
  });

  req.on("error", (err) => {
    console.error("Erreur lors de l'envoi de la demande:", err);
  });

  req.write(JSON.stringify({ clientInfo: { nom_pc: nomPc } }));
  req.end();
}

function sendConnectionRequest(receiverId) {
  ws.send(
    JSON.stringify({
      type: "connexion-request-from-sender",
      data: {
        receiverId,
        senderName: nomPc,
      },
    })
  );
  console.log("Connexion WebSocket établie");
}

function handleConnexionDialog(senderName) {
  // Afficher une boîte de dialogue pour l'utilisateur

  dialog
    .showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Refuser", "Accepter"],
      title: "Demande de connexion",
      message: "Voulez-vous accepter la demande de connexion ?",
    })
    .then((result) => {
      if (result.response === 0) {
        console.log("Refuse");
        // L'utilisateur a accepté la demande de connexion
        /*startScreenSharing(parsedMessage.partnerId);
        ws.send(JSON.stringify({ type: "connectionResponse", accepted: true }));*/
      } else {
        console.log("Accept");
        ws.send(
          JSON.stringify({
            type: "connectionResponse",
            accepted: true,
            initiateurName: senderName,
          })
        );
        // L'utilisateur a refusé la demande de connexion
        //ws.send(JSON.stringify({ type: "connectionResponse", accepted: false }));
      }
    });
}

async function startScreenSharing(receiverName) {
  peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(
        JSON.stringify({
          type: "iceCandidate",
          candidate: event.candidate,
          receiverName,
        })
      );
    }
  };

  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
  stream.getTracks().forEach((track) => peerConnection.addTrack(track, stream));

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  ws.send(
    JSON.stringify({ type: "screenShareOffer", offer, senderName: "client1" })
  );
}

async function handleScreenShareOffer(offer, senderName) {
  peerConnection = new RTCPeerConnection();

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(
        JSON.stringify({
          type: "iceCandidate",
          candidate: event.candidate,
          receiverName: senderName,
        })
      );
    }
  };

  peerConnection.ontrack = (event) => {
    const video = document.getElementById("remoteVideo");
    video.srcObject = event.streams[0];
  };

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  ws.send(
    JSON.stringify({
      type: "screenShareAnswer",
      answer,
      receiverName: senderName,
    })
  );
}

async function handleScreenShareAnswer(answer) {
  await peerConnection.setRemoteDescription(answer);
}

async function handleIceCandidate(candidate) {
  await peerConnection.addIceCandidate(candidate);
}

/*
// Fonction pour démarrer le partage d'écran
async function startScreenSharing(receiverName) {
  const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
  const selectedSource = sources[0];

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: selectedSource.id,
      },
    },
  });

  peerConnection = new RTCPeerConnection();

  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  ws.send(JSON.stringify({
    type: 'screenShareOffer',
    offer: offer,
    receiverName: receiverName,
  }));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'iceCandidate',
        candidate: event.candidate,
        receiverName: receiverName,
      }));
    }
  };
}

// Fonction pour gérer l'offre de partage d'écran reçue
async function handleScreenShareOffer(offer, senderName) {
  peerConnection = new RTCPeerConnection();

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = event.streams[0];
  };

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  ws.send(JSON.stringify({
    type: 'screenShareAnswer',
    answer: answer,
    senderName: senderName,
  }));

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'iceCandidate',
        candidate: event.candidate,
        senderName: senderName,
      }));
    }
  };
}

// Fonction pour gérer la réponse de partage d'écran reçue
async function handleScreenShareAnswer(answer) {
  await peerConnection.setRemoteDescription(answer);
}

// Fonction pour gérer les candidats ICE reçus
async function handleIceCandidate(candidate) {
  await peerConnection.addIceCandidate(candidate);
}

// IPC pour démarrer le partage d'écran
ipcMain.on('start-screen-share', (event, receiverName) => {
  startScreenSharing(receiverName);
});*/
/*
function startScreenSharing(partnerId) {
  desktopCapturer.getSources({ types: ["screen"] }).then(async (sources) => {
    for (const source of sources) {
      if (source.name === "Entire Screen" || source.name === "Screen 1") {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720,
              },
            },
          });

          peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
          });

          peer.on("signal", (data) => {
            ws.send(
              JSON.stringify({ type: "peerSignal", signal: data, partnerId })
            );
          });

          peer.on("error", (err) => console.error("Erreur WebRTC:", err));

          peer.on("connect", () => console.log("Connexion WebRTC établie"));

          peer.on("close", () => console.log("Connexion WebRTC fermée"));
        } catch (e) {
          console.error("Erreur lors de la capture d'écran:", e);
        }
        return;
      }
    }
  });
}
*/
