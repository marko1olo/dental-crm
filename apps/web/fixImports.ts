import { Project } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
});

const appConstants = project.getSourceFile("src/AppConstants.ts");
if (!appConstants) throw new Error("Could not find AppConstants.ts");

const exportedNames = new Set<string>();
for (const [name] of appConstants.getExportedDeclarations()) {
  exportedNames.add(name);
}
console.log(`Found ${exportedNames.size} exports in AppConstants.ts`);

const sourceFiles = project.getSourceFiles("src/**/*.{ts,tsx}");
let updatedFilesCount = 0;

for (const sf of sourceFiles) {
  let hasChanges = false;
  if (sf.getFilePath().endsWith("AppConstants.ts")) continue;

  const imports = sf.getImportDeclarations();
  for (const imp of imports) {
    const moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.endsWith("AppHelpers")) {
      const namedImports = imp.getNamedImports();
      const movedNames: string[] = [];
      
      for (const namedImport of namedImports) {
        if (exportedNames.has(namedImport.getName())) {
          movedNames.push(namedImport.getName());
          namedImport.remove();
          hasChanges = true;
        }
      }

      if (movedNames.length > 0) {
        if (imp.getNamedImports().length === 0) {
          imp.remove();
        }
        
        const newModuleSpecifier = moduleSpecifier.replace("AppHelpers", "AppConstants");
        sf.addImportDeclaration({
          moduleSpecifier: newModuleSpecifier,
          namedImports: movedNames,
        });
      }
    }
  }
  if (hasChanges) {
    updatedFilesCount++;
  }
}

console.log(`Updated ${updatedFilesCount} files.`);
project.saveSync();
console.log("Done!");
