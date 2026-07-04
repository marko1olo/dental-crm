import fs from 'fs';
let transient = fs.readFileSync('apps/api/src/services/transientState.ts', 'utf8');
transient = transient.replace(/  token: "mock-token",\n/g, '');
transient = transient.replace(/  botUsername: "mock_dente_bot",\n/g, '');
transient = transient.replace(/  webhookSecretToken: null,\n/g, '');
transient = transient.replace(/  webhookUrl: null,\n/g, '');
transient = transient.replace(/zoomLevel: 1/g, 'zoom: 1');
fs.writeFileSync('apps/api/src/services/transientState.ts', transient);
console.log('Fixed final2 errors');
