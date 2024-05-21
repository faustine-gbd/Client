const { ipcRenderer, contextBridge } = require('electron');
// Expose ipcRenderer au processus de rendu
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer);



ipcRenderer.on('id', (event, ID) => {
    
    const serverIdElement = document.getElementById('ID');
    
    if (serverIdElement) {
      serverIdElement.textContent = ID;
      console.log('ID attribué à l\'élément dans le DOM:', ID);
  } else {
      console.error('Élément avec ID "ID" non trouvé dans le DOM.');
  }
  });

// Ajouter du texte devant le champ d'entrée de l'ID de partenaire
const partnerIdInputElement = document.getElementById('partnerIdInput');
partnerIdInputElement.placeholder = 'Entrez l\'ID de votre partenaire';


// Gestionnaire d'événements pour le clic du bouton "Connecter"
document.getElementById('connectBtn').addEventListener('click', () => {
  const partnerIdInputElement = document.getElementById('partnerIdInput');
  const partnerId = partnerIdInputElement.value;

  // Envoyer une requête de demande de connexion au serveur avec l'ID du partenaire
  ipcRenderer.send('connect', partnerId);
});

