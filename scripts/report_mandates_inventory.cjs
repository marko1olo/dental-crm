const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/mandates_inventory.json', 'utf8'));
const byFile = {};
data.forEach(item => {
  if (!byFile[item.file]) byFile[item.file] = [];
  byFile[item.file].push(item);
});
for (const [file, items] of Object.entries(byFile)) {
  console.log(`\n[${file}] (${items.length} items):`);
  items.forEach(i => console.log(`  L${i.line}: ${i.text.slice(0, 120)}`));
}
