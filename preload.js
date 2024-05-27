const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('sessionAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    sendConnectionRequest: (partnerId) => ipcRenderer.send("send-partner-id", partnerId),
    onSetId: (callback) => ipcRenderer.on('set-id', (_event, value) => callback(value)),
    getIdValue: (value) => ipcRenderer.send('get-id-value', value)
})
