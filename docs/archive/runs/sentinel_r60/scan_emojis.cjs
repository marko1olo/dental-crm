const fs = require('fs');
const files = [
  'apps/web/src/DocumentsView.tsx',
  'apps/web/src/PatientsView.tsx',
  'apps/web/src/components/schedule/AppointmentCard.tsx',
  'apps/web/src/components/schedule/ScheduleGrid.tsx',
  'apps/web/src/PaymentCapture.tsx'
];

const emojiRegex = /(\p{Extended_Pictographic})/gu;

let totalMatches = 0;
files.forEach(file => {
  if (!fs.existsSync(file)) {
    console.log('NOT FOUND:', file);
    return;
  }
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    // Exclude comments or inspect everything
    const matches = line.match(emojiRegex);
    if (matches) {
      totalMatches += matches.length;
      console.log(`${file}:${idx+1} [${matches.join(', ')}] -> ${line.trim()}`);
    }
  });
});
console.log('Total emojis found:', totalMatches);
