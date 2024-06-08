const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('sessionAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    sendConnectionRequest: (partnerId) => ipcRenderer.send("send-partner-id", partnerId),
    onSetId: (callback) => ipcRenderer.on('set-id', (_event, value) => callback(value)),
    onConnexionRequestResponse: (callback) => ipcRenderer.on('request-accepted', (_event, value) => callback(value)),


    sendIceCandidate: (candidate) => ipcRenderer.send("ice-candidate", candidate),
    sendAnswer: (answer) => ipcRenderer.send("answer", answer),
    sendOffer: (offer) => ipcRenderer.send("offer", offer),
})
