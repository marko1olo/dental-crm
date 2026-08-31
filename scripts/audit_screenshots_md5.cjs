const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      getFiles(full, files);
    } else if (/\.(png|jpg|jpeg|webp)$/i.test(file)) {
      files.push({ full, rel: path.relative('C:\\Clinic_MVP\\dental-crm', full).replace(/\\/g, '/'), size: stat.size, mtime: stat.mtime });
    }
  }
  return files;
}

const screenshotsDir = path.resolve(__dirname, '..', 'docs', 'screenshots');
const files = getFiles(screenshotsDir);

const md5Map = new Map();
const duplicates = [];
const smallFiles = [];

for (const f of files) {
  const buf = fs.readFileSync(f.full);
  const hash = crypto.createHash('md5').update(buf).digest('hex');
  f.md5 = hash;
  
  if (f.size < 40 * 1024) {
    smallFiles.push(f);
  }
  
  if (md5Map.has(hash)) {
    duplicates.push({ original: md5Map.get(hash), duplicate: f, hash });
  } else {
    md5Map.set(hash, f);
  }
}

console.log('=== SCREENSHOT MD5 AUDIT SUMMARY ===');
console.log('Total screenshot files:', files.length);
console.log('Unique MD5 hashes:', md5Map.size);
console.log('Duplicates found:', duplicates.length);
console.log('Files < 40KB found:', smallFiles.length);

if (duplicates.length > 0) {
  console.log('\n--- DUPLICATES ---');
  duplicates.forEach((d, i) => {
    console.log(`[${i+1}] Hash: ${d.hash}`);
    console.log(`    File 1: ${d.original.rel} (${d.original.size} bytes)`);
    console.log(`    File 2: ${d.duplicate.rel} (${d.duplicate.size} bytes)`);
  });
}

if (smallFiles.length > 0) {
  console.log('\n--- FILES < 40KB (Potential Clones / Blank Screens) ---');
  smallFiles.forEach((s, i) => {
    console.log(`[${i+1}] ${s.rel} (${s.size} bytes, ${(s.size/1024).toFixed(1)} KB)`);
  });
}
