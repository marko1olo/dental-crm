import fs from 'fs';
let transient = fs.readFileSync('apps/api/src/services/transientState.ts', 'utf8');
transient = transient.replace(/persistentMenuOverrides: null,\n/g, '');
transient = transient.replace(/scrollPosition: 0,\n/g, '');
fs.writeFileSync('apps/api/src/services/transientState.ts', transient);
console.log('Fixed final errors');
