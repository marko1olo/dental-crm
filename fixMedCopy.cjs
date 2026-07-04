const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// Make hasIssuedMedicalCopyRequestForRelease async
code = code.replace(
  /export function hasIssuedMedicalCopyRequestForRelease\(document: GeneratedDocument\): boolean \{\s*return Boolean\(findIssuedMedicalCopyRequestForRelease\(document\)\);\s*\}/,
  `export async function hasIssuedMedicalCopyRequestForRelease(document: GeneratedDocument): Promise<boolean> {\n  return Boolean(await findIssuedMedicalCopyRequestForRelease(document));\n}`
);

// Update caller inside documentIssueChainBlockReason
code = code.replace(
  /if \(!hasIssuedMedicalCopyRequestForRelease\(document\)\)/g,
  'if (!(await hasIssuedMedicalCopyRequestForRelease(document)))'
);

// Make sure getDocumentsByPatientId is imported in documents.ts
if (!code.includes('getDocumentsByPatientId')) {
  code = code.replace(
    /import \{\s*getDefaultOrganizationId,/,
    'import {\n  getDefaultOrganizationId,\n  getDocumentsByPatientId,'
  );
}

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done fixing hasIssuedMedicalCopyRequestForRelease');

// Update callers in sub-routes
const path = require('path');
const dir = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents';
for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.ts'))) {
  let c = fs.readFileSync(path.join(dir, file), 'utf8');
  if (c.includes('hasIssuedMedicalCopyRequestForRelease(') && !c.includes('await hasIssuedMedicalCopyRequestForRelease(')) {
    c = c.replace(/([^w])hasIssuedMedicalCopyRequestForRelease\(/g, '$1await hasIssuedMedicalCopyRequestForRelease(');
    fs.writeFileSync(path.join(dir, file), c);
    console.log('updated', file);
  }
}
