const { app, BrowserWindow, ipcMain, session } = require("electron/main");
const { dialog, desktopCapturer } = require("electron");
const os = require("os");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

let mainWindow;
let ws;
let nomPc;
//let peerConnection;
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
      (iface) => iface.family === "IPv4" && iface.address !== "192.168.1.28"
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
    hostname: "192.168.1.28",
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
        ws = new WebSocket(`ws://192.168.1.28:8081`);

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
                session.defaultSession.cookies.set({
                  url: 'http://localhost',
                  name: 'session',
                  value: JSON.stringify({ receiverName, senderName }) ,
                }).then(() => {
                  console.log('Cookie enregistré avec succès');
                }).catch((error) => {
                  console.error("Erreur lors de l'enregistrement du cookie:", error);
                });
                if (receiverName === nomPc) {
                  handleConnexionDialog(receiverName, senderName);
                }
                break;
              case "connexion-request-response-to-client":
                handleConnexionRequestResponse(data.data)
                break;
              case "offer":
                console.log("ws offer");
                mainWindow.webContents.send('offer', data);
                break;
              case "answer":
                console.log("ws answer");
                mainWindow.webContents.send('answer', data);
                break;
              case "ice-candidate":
                console.log("ws ice-candidate");
                mainWindow.webContents.send('ice-candidate', data);
                break;
              case "control":
                console.log("ws control");
                mainWindow.webContents.send('control', data);
                break;
              default:
                console.log("Message type non reconnu:", message.type);
            }
          } catch (error) {
            console.error(`Erreur lors du traitement du message: ${error}`);
          }
        });

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

ipcMain.on('offer', async (event, data) => {

  try {
    const sessionCookie = await session.defaultSession.cookies.get({url: 'http://localhost', name: 'session'});
    const sessionCookieValue = JSON.parse(sessionCookie?.[0]?.value);
    if(sessionCookieValue) {
      const senderName = nomPc === sessionCookieValue.senderName ? sessionCookieValue.senderName :sessionCookieValue.receiverName;
      const receiverName = nomPc !== sessionCookieValue.senderName ? sessionCookieValue.senderName :sessionCookieValue.receiverName;
    ws.send(JSON.stringify({type: 'offer', data: {sdp: data?.sdp, senderName, receiverName }}));}
  } catch (e) {
    return undefined
  }
});

ipcMain.on('answer', (event, data) => {
  console.log("ipcMain.on answer")
  ws.send(JSON.stringify({ type: 'answer', data: data }));
});

ipcMain.on('ice-candidate', (event, data) => {
  console.log("ipcMain.on ice-candidate")
  ws.send(JSON.stringify({ type: 'ice-candidate', data: data }));
});

ipcMain.on('control', (event, data) => {
  console.log("ipcMain.on control")
  ws.send(JSON.stringify({ type: 'control', data: data }));
});

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

function handleConnexionDialog(receiverName, senderName) {
  // Afficher une boîte de dialogue pour l'utilisateur
  dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Refuser", "Accepter"],
      title: "Demande de connexion",
      message: "Voulez-vous accepter la demande de connexion ?",
    }).then((result) => {
      if (result.response === 0) {
        ws.send(
            JSON.stringify({
              type: "connexion-request-response",
              data: {receiverName, senderName, requestAccepted : false},
            })
        );
      } else {
        ws.send(
          JSON.stringify({
            type: "connexion-request-response",
            data: {receiverName, senderName, requestAccepted : true},
          })
        );
      }
    });
}

function handleConnexionRequestResponse(data){
  const { receiverName, senderName, requestAccepted } = data;
  console.log({ receiverName, senderName, requestAccepted } )
  if (receiverName === nomPc || senderName === nomPc ) {
    console.log("yes")
    mainWindow.webContents.send("request-accepted", Boolean(requestAccepted));
  }
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

