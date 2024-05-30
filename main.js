const { app, BrowserWindow, ipcMain } = require("electron/main");
const { dialog } = require('electron')
const os = require("os");
const http = require("http");
const path = require("path");
const WebSocket = require("ws");

let mainWindow;
let ws;
let nomPc;
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

  mainWindow.loadFile("index.html");
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
      (iface) => iface.family === "IPv4" && iface.address !== "127.0.0.1"
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
    hostname: "192.168.1.24",
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
        ws = new WebSocket(`ws://192.168.1.24:8081`);

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
                console.log("receiverName : ", receiverName, "senderName :", senderName)
                if(receiverName === nomPc) {
                  handleConnexionDialog()
                }
                break;
              case "connectionResponse":
                // Gérer la réponse du destinataire à la demande de connexion
                handleConnectionResponse(data.initiateurName, data.accepted);
                break;
              case "screenShareRequest":
                // Gérer la demande de partage d'écran
                handleScreenShareRequest(clientName, data.ID);
                break;
                // Ajoutez d'autres types de messages si nécessaire
              default:
                console.error(`Type de message inconnu: ${data.type}`);
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

function sendConnectionRequest(receiverId) {
  ws.send(JSON.stringify({ type: "connexion-request-from-sender",
  data :{
    receiverId,
    senderName: nomPc
  } }));
  console.log("Connexion WebSocket établie");
  /*const options = {
    hostname: "192.168.1.24",
    port: 8000,
    path: "/connexion",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  };
  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      res.on("data", (chunk) => {
        const responseData = JSON.parse(chunk);
        console.log("Réponse du serveur:", responseData.message);
      });
    } else {
      console.error("Erreur de connexion:", res.statusCode);
    }
  });
  req.on("error", (err) => {
    console.error("Erreur lors de l'envoi de la demande:", err);
  });
  req.write(JSON.stringify({ random_id: partnerId }));
  req.end();*/
}

function handleConnexionDialog() {
    // Afficher une boîte de dialogue pour l'utilisateur

    dialog.showMessageBox(mainWindow, {
      type: "question",
      buttons: ["Accepter", "Refuser"],
      title: "Demande de connexion",
      message: "Voulez-vous accepter la demande de connexion ?",
    }).then(result => {
      if (result.response === 0) {
        console.log("Refuse")
        // L'utilisateur a accepté la demande de connexion
        /*startScreenSharing(parsedMessage.partnerId);
        ws.send(JSON.stringify({ type: "connectionResponse", accepted: true }));*/
      } else {
        console.log("Accept")
        // L'utilisateur a refusé la demande de connexion
        //ws.send(JSON.stringify({ type: "connectionResponse", accepted: false }));
      }
    });
}

function startScreenSharing(partnerId) {
  desktopCapturer.getSources({ types: ['screen'] }).then(async sources => {
    for (const source of sources) {
      if (source.name === 'Entire Screen' || source.name === 'Screen 1') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720,
              }
            }
          });

          peer = new Peer({
            initiator: true,
            trickle: false,
            stream: stream
          });

          peer.on('signal', data => {
            ws.send(JSON.stringify({ type: 'peerSignal', signal: data, partnerId }));
          });

          peer.on('error', err => console.error('Erreur WebRTC:', err));

          peer.on('connect', () => console.log('Connexion WebRTC établie'));

          peer.on('close', () => console.log('Connexion WebRTC fermée'));

        } catch (e) {
          console.error('Erreur lors de la capture d\'écran:', e);
        }
        return;
      }
    }
  });
}
