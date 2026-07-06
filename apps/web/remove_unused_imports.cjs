const { Project } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'C:/Clinic_MVP/dental-crm/apps/web/tsconfig.json'
});

const sourceFile = project.getSourceFile('C:/Clinic_MVP/dental-crm/apps/web/src/App.tsx');
if (!sourceFile) {
  console.log('Could not load App.tsx');
  process.exit(1);
}

// Automatically remove unused imports
sourceFile.fixUnusedIdentifiers();

// Save the file
sourceFile.saveSync();

console.log('Unused imports removed from App.tsx');
