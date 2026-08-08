import fs from 'fs';
const data = JSON.parse(fs.readFileSync('eslint_out.json', 'utf8'));

data.forEach(file => {
  const issues = file.messages.filter(m => m.message.includes('change on every render'));
  if (issues.length > 0) {
    console.log(file.filePath);
    issues.forEach(i => console.log(`  Line ${i.line}: ${i.message}`));
  }
});
