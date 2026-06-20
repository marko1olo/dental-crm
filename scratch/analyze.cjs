const fs = require('fs');
const lines = fs.readFileSync('apps/web/src/SettingsView.tsx', 'utf8').split(/\r?\n/);

let forms = 0;
let inputs = 0;
let sections = 0;
let divs = 0;

for(let line of lines) {
  if (line.includes('<form')) forms++;
  if (line.includes('<input')) inputs++;
  if (line.includes('<section')) sections++;
  if (line.includes('<div')) divs++;
}

console.log('Forms:', forms, 'Inputs:', inputs, 'Sections:', sections, 'Divs:', divs);

let currentBlock = null;
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('export function SettingsView')) break;
  if (lines[i].startsWith('function ')) {
    console.log('Helper:', lines[i].trim());
  }
}
