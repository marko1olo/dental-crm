const fs = require('fs');
const content = fs.readFileSync('apps/web/src/App.tsx', 'utf-8');

const match = content.match(/currentView\s*===/g);
console.log("Found currentView references:", match ? match.length : 0);

const lines = content.split('\n');
lines.forEach((line, i) => {
  if (line.includes('currentView ===') || line.includes('currentView ==')) {
    console.log(`Line ${i+1}: ${line.trim()}`);
  }
});
