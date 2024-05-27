const setButton = document.getElementById('btn');
const titleInput = document.getElementById('title');
const connectButton = document.getElementById('connect-btn');
const partnerIdInput = document.getElementById('partner-id-input');
const counterElement = document.getElementById('counter');

setButton.addEventListener('click', () => {
    const title = titleInput.value;
    window.sessionAPI.setTitle(title);
});

connectButton.addEventListener('click', () => {
    const partnerId = partnerIdInput.value;
    window.sessionAPI.sendConnectionRequest(partnerId);
});

window.sessionAPI.onSetId((value) => {
    counterElement.innerText = value;
    console.log('value: ', value);
});
