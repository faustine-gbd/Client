const { app, BrowserWindow, ipcMain } = require('electron');
const os = require('os');
const http = require('http');
const path = require('path');
const net = require('net');
const ipcRenderer = require('electron').ipcRenderer;

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // Autoriser l'accès à des modules Node.js spécifiques
      preload: path.join(__dirname, 'renderer.js'), // Préchargement du script pour l'exposition d'objets
    },
  });

  win.loadFile('index.html');

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Récupérer l'adresse IP et le nom du PC
  const networkInterfaces = os.networkInterfaces();
  const wiFiInterface = networkInterfaces['Wi-Fi']; // Recherche de l'interface Wi-Fi
  let ipAddress = '';
  if (wiFiInterface) {
    const matchingInterface = wiFiInterface.find(
      (iface) => iface.family === 'IPv4' && iface.address !== '127.0.0.1'
    );
    if (matchingInterface) {
      ipAddress = matchingInterface.address;
    } else {
      console.error("Aucune interface Wi-Fi correspondante n'a été trouvée.");
    }
  } else {
    console.error("L'interface Wi-Fi n'est pas disponible.");
  }
  
  const nomPC = os.hostname();

  // Afficher le nom de l'ordinateur et l'adresse IP dans le terminal
  console.log("Nom de l'ordinateur:", nomPC);
  console.log("Adresse IP:", ipAddress);

  // Envoyer une requête de demande d'identification au serveur 
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/demande-identifiants',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      res.on('data', (chunk) => {
        // Désérialiser la réponse JSON du serveur
        const responseData = JSON.parse(chunk);
        const ID = responseData.ID;

        // Afficher l'ID reçu du serveur dans la console
        console.log('ID reçu du serveur:', ID);

        // Envoyer l'ID de session au processus de rendu
        
        ipcRenderer.send('id', { data: 'ID' });
        console.log('ID envoyé au processus de rendu :', ID);
      });
    } else {
      console.error('Erreur de connexion:', res.statusCode);
    }
  });

  req.on('error', (err) => {
    console.error("Erreur lors de l'envoi de la demande:", err);
  });

  // Envoyer l'adresse IP et le nom du PC dans le corps de la requête
  req.write(`{"clientInfo": { "nomPc": "${nomPC}", "ipAddress": "${ipAddress}" } }`);
  req.end();
});


//pour recevoir demande de connexion du partenaire
//const electronPort = 8080; // Port prédéfini pour les connexions avec le serveur Express

//const server = net.createServer((socket) => {
 // console.log('Connexion entrante du serveur Express.');




// Exemple avec WebSocket
//const WebSocket = require('ws');
//const wss = new WebSocket.Server({ port: electronPort });

//wss.on('connection', (ws) => {
 // console.log('Nouvelle connexion WebSocket établie');
  // Ajoutez votre logique pour gérer les messages et les actions à effectuer lors de la connexion
//});


app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});
