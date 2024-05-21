const { contextBridge } = require('electron');
const ipcRenderer = require('electron').ipcRenderer;

// Exposer l'objet ipcRenderer au processus de rendu
contextBridge.exposeInMain('ipcRenderer', ipcRenderer);
