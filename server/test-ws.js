const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

const token = jwt.sign({ userId: 'tester' }, 'local_dev_secret_change_in_production_32chars');

const ws = new WebSocket(`wss://collabhub-a5yq.onrender.com/tldraw-sync/r?token=${token}&sessionId=12345`);

ws.on('open', () => {
  console.log('Connected!');
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
});

ws.on('close', (code, reason) => {
  console.log('Disconnected', code, reason.toString());
});

ws.on('error', (err) => {
  console.error('Error:', err);
});
