const { contextBridge, ipcRenderer } = require('electron/renderer')
const robot = require('robotjs');
contextBridge.exposeInMainWorld('sessionAPI', {
    setTitle: (title) => ipcRenderer.send('set-title', title),
    sendConnectionRequest: (partnerId) => ipcRenderer.send("send-partner-id", partnerId),
    onSetId: (callback) => ipcRenderer.on('set-id', (_event, value) => callback(value)),
    onConnexionRequestResponse: (callback) => ipcRenderer.on('request-accepted', (_event, value) => callback(value)),

/*
    sendIceCandidate: (candidate) => ipcRenderer.send("ice-candidate", candidate),
    sendAnswer: (answer) => ipcRenderer.send("answer", answer),
    sendOffer: (offer) => ipcRenderer.send("offer", offer),
*/

    sendOffer: (offer) => {
        console.log("send offer")
        ipcRenderer.send('offer', offer);
    },
    onOfferReceived: (callback) => {
        console.log("receive offer")
        ipcRenderer.on('offer', (event, offer) => {
            callback(offer);
        });
    },
    sendAnswer: (answer) => {
        console.log("send answer")
        ipcRenderer.send('answer', answer);
    },
    onAnswerReceived: (callback) => {
        console.log("receive answer")
        ipcRenderer.on('answer', (event, answer) => {
            callback(answer);
        });
    },
    sendIceCandidate: (candidate) => {
        console.log("send candidate")
        ipcRenderer.send('ice-candidate', candidate);
    },
    onIceCandidateReceived: (callback) => {
        console.log("receive candidate")
        ipcRenderer.on('ice-candidate', (event, candidate) => {
            callback(candidate);
        });
    },
    sendControl: (data) => {
        console.log("send control")
        ipcRenderer.send('control', data);
    },
    onControlReceived: (callback) => {
        console.log("receive control")
        ipcRenderer.on('control', (event, data) => {
            callback(data);
        });
    },
    /*
    sendConnexionRequest: (data) => {
        ipcRenderer.send('connexion-request-to-server', data);
    },
    onConnexionRequestReceived: (callback) => {
        ipcRenderer.on('connexion-request-to-client', (event, data) => {
            callback(data);
        });
    },
    sendConnexionResponse: (data) => {
        ipcRenderer.send('connexion-request-response-to-server', data);
    },
    onConnexionResponseReceived: (callback) => {
        ipcRenderer.on('connexion-request-response-to-client', (event, data) => {
            callback(data);
        });
    }*/
})


contextBridge.exposeInMainWorld('robot', {
    moveMouse: (x, y) => {
        robot.moveMouse(x, y);
    },
    mouseClick: () => {
        robot.mouseClick();
    },
    keyTap: (key) => {
        robot.keyTap(key);
    }
});
