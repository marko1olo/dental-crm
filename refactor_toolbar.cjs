const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps/web/src');
const files = [
  'ctPlanningArtifactPanel.tsx',
  'ctPlanningExportPanel.tsx',
  'ctPlanningExportScenarioPanel.tsx',
  'ctPlanningGeometryGridPanel.tsx',
  'ctPlanningImplantFitPanel.tsx',
  'ctPlanningImplantLibraryPanel.tsx',
  'ctPlanningImplantModelPanel.tsx',
  'ctPlanningMeasurementPanel.tsx',
  'ctPlanningMetricGridPanel.tsx',
  'ctPlanningPlanBoardPanel.tsx',
  'ctPlanningQuickActionsPanel.tsx',
  'ctPlanningReconstructionPanel.tsx',
  'ctPlanningTaskBoardPanel.tsx',
  'ctPlanningToolGridPanel.tsx',
  'ctPlanningValidationPanel.tsx',
  'ctPlanningWorkflowPanel.tsx'
];

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
const outPath = path.join(srcDir, 'CtPlanningToolbar.tsx');
fs.writeFileSync(outPath, Array.from(imports).join('\n') + '\n\n' + body.join('\n'));

// Now update all imports in the project
const walkSync = function(dir, filelist) {
  const fsFiles = fs.readdirSync(dir);
  filelist = filelist || [];
  fsFiles.forEach(function(file) {
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

  for (const panel of files) {
    const base = path.basename(panel, '.tsx');
    const regex = new RegExp(`from\\s+['"]([^'"]*?)${base}['"]`, 'g');
    if (regex.test(content)) {
      const relative = path.relative(path.dirname(f), path.join(srcDir, 'CtPlanningToolbar')).replace(/\\/g, '/');
      const replacement = relative.startsWith('.') ? relative : './' + relative;
      content = content.replace(regex, `from "${replacement}"`);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(f, content);
  }
}

// Delete old files
for (const f of files) {
  const fullPath = path.join(srcDir, f);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

console.log("Toolbar refactoring complete.");
