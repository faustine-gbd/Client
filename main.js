const { app, BrowserWindow, ipcMain } = require('electron/main');
const os = require('os');
const http = require('http');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // Préchargement du script pour l'exposition d'objets
    },
  });

  ipcMain.on('set-title', (event, title) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    win.setTitle(title);
  });

  ipcMain.on('send-partner-id', (event, partnerId) => {
    sendConnectionRequest(partnerId);
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Récupérer l'adresse IP et le nom de l'ordinateur
  const networkInterfaces = os.networkInterfaces();
  let wiFiInterface;
  if (os.platform() === 'win32') {
    wiFiInterface = networkInterfaces['Wi-Fi'];
  } else if (os.platform() === 'darwin') {
    wiFiInterface = networkInterfaces['en0'] || networkInterfaces['en1'];
  }

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

  console.log('IP Address: ', ipAddress);
  const nomPC = os.hostname();
  console.log("Nom de l'ordinateur:", nomPC);
  console.log("Adresse IP:", ipAddress);

  // Envoyer une requête de demande d'identification au serveur
  sendIdentificationRequest(nomPC, ipAddress);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function sendIdentificationRequest(nomPC, ipAddress) {
  const options = {
    hostname: '192.168.1.27',
    port: 8000,
    path: '/demande-identifiants',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      res.on('data', (chunk) => {
        const responseData = JSON.parse(chunk);
        const ID = responseData.ID;
        console.log('ID reçu du serveur:', ID);
        mainWindow.webContents.send('set-id', ID);
      });
    } else {
      console.error('Erreur de connexion:', res.statusCode);
    }
  });

  req.on('error', (err) => {
    console.error("Erreur lors de l'envoi de la demande:", err);
  });

  req.write(JSON.stringify({ clientInfo: { nomPc: nomPC, ipAddress } }));
  req.end();
}

function sendConnectionRequest(partnerId) {
  const options = {
    hostname: '192.168.1.27',
    port: 8000,
    path: '/connexion',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      res.on('data', (chunk) => {
        const responseData = JSON.parse(chunk);
        console.log('Réponse du serveur:', responseData.message);
      });
    } else {
      console.error('Erreur de connexion:', res.statusCode);
    }
  });

  req.on('error', (err) => {
    console.error('Erreur lors de l\'envoi de la demande:', err);
  });

  req.write(JSON.stringify({ ID: partnerId }));
  req.end();
}
