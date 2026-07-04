import fs from 'fs';

let analyzer = fs.readFileSync('apps/api/src/pricelist/analyzer.ts', 'utf8');
analyzer = analyzer.replace(/sampleData\.js/g, 'legacySampleData.js');
fs.writeFileSync('apps/api/src/pricelist/analyzer.ts', analyzer);

let gateway = fs.readFileSync('apps/api/src/speech/gateway.ts', 'utf8');
gateway = gateway.replace(/sampleData\.js/g, 'legacySampleData.js');
fs.writeFileSync('apps/api/src/speech/gateway.ts', gateway);

let transient = fs.readFileSync('apps/api/src/services/transientState.ts', 'utf8');
transient = transient.replace(/visualCardUrls: \{\}/g, 'visualCardUrls: {} as any');
transient = transient.replace(/if \(kind === "photo"\) return "photo_2d";/g, 'if (kind === "photo") return "photo";');
transient = transient.replace(/return "scroll_2d";/g, 'return "two_d";');
fs.writeFileSync('apps/api/src/services/transientState.ts', transient);

console.log('Fixed additional files');
