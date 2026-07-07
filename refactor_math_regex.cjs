const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps/web/src');
const mathFiles = ['ctPlanningMath.ts', 'mprControlMath.ts', 'mprMath.ts', 'utils/dicom/curvedMprMath.ts'];
const geomFiles = ['ctPlanningGeometry.ts', 'utils/toothGeometry.ts', 'utils/dicom/toothCrownGeometry.ts'];

function combine(files, outName) {
  let imports = new Set();
  let body = [];
  
  for (const f of files) {
    const fullPath = path.join(srcDir, f);
    if (!fs.existsSync(fullPath)) continue;
    
    const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
    let inImport = false;
    let importBuffer = '';
    
    for (const line of lines) {
      if (line.startsWith('import ')) {
        if (line.includes(';')) {
          imports.add(line);
        } else {
          inImport = true;
          importBuffer = line + '\n';
        }
      } else if (inImport) {
        importBuffer += line + '\n';
        if (line.includes(';')) {
          inImport = false;
          imports.add(importBuffer.trim());
          importBuffer = '';
        }
      } else {
        body.push(line);
      }
    }
  }

  // Write out
  const outPath = path.join(srcDir, 'utils/math', outName);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Array.from(imports).join('\n') + '\n\n' + body.join('\n'));
}

combine(mathFiles, 'mprMath.ts');
combine(geomFiles, 'toothGeometry.ts');

// Now update all imports in the project
const walkSync = function(dir, filelist) {
  const files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(dir + '/' + file).isDirectory()) {
      filelist = walkSync(dir + '/' + file, filelist);
    }
    else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        filelist.push(dir + '/' + file);
      }
    }
  });
  return filelist;
};

const allFiles = walkSync(srcDir);

for (const f of allFiles) {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;

  for (const mathF of mathFiles) {
    const base = path.basename(mathF, '.ts');
    const regex = new RegExp(`from\\s+['"]([^'"]*?)${base}['"]`, 'g');
    if (regex.test(content)) {
      const relative = path.relative(path.dirname(f), path.join(srcDir, 'utils/math/mprMath')).replace(/\\/g, '/');
      const replacement = relative.startsWith('.') ? relative : './' + relative;
      content = content.replace(regex, `from "${replacement}"`);
      changed = true;
    }
  }

  for (const geomF of geomFiles) {
    const base = path.basename(geomF, '.ts');
    // careful with toothGeometry vs toothCrownGeometry
    if (base === 'toothGeometry') {
       const regex = new RegExp(`from\\s+['"]([^'"]*?)(?<!Crown)toothGeometry['"]`, 'g');
       if (regex.test(content)) {
         const relative = path.relative(path.dirname(f), path.join(srcDir, 'utils/math/toothGeometry')).replace(/\\/g, '/');
         const replacement = relative.startsWith('.') ? relative : './' + relative;
         content = content.replace(regex, `from "${replacement}"`);
         changed = true;
       }
    } else {
       const regex = new RegExp(`from\\s+['"]([^'"]*?)${base}['"]`, 'g');
       if (regex.test(content)) {
         const relative = path.relative(path.dirname(f), path.join(srcDir, 'utils/math/toothGeometry')).replace(/\\/g, '/');
         const replacement = relative.startsWith('.') ? relative : './' + relative;
         content = content.replace(regex, `from "${replacement}"`);
         changed = true;
       }
    }
  }

  if (changed) {
    fs.writeFileSync(f, content);
  }
}

// Delete old files
for (const f of [...mathFiles, ...geomFiles]) {
  const fullPath = path.join(srcDir, f);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

console.log("Refactoring complete.");
