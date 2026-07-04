const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// 1. findIssuedMedicalCopyRequestForRelease
const oldFindReq = `export function findIssuedMedicalCopyRequestForRelease(document: GeneratedDocument): GeneratedDocument | null {`;
const newFindReq = `export async function findIssuedMedicalCopyRequestForRelease(document: GeneratedDocument): Promise<GeneratedDocument | null> {\n  const orgId = await getDefaultOrganizationId();\n  const allDocuments = await getDocumentsByPatientId(orgId!, document.patientId);`;
code = code.replace(oldFindReq, newFindReq);

// 2. buildDocumentAuditFacts
code = code.replace(/export function buildDocumentAuditFacts/g, 'export async function buildDocumentAuditFacts');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done fixing findIssuedMedicalCopyRequestForRelease and buildDocumentAuditFacts');

// Now update callers of findIssuedMedicalCopyRequestForRelease and buildDocumentAuditFacts
const path = require('path');
const dir = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let changed = false;

  if (content.includes('findIssuedMedicalCopyRequestForRelease(')) {
    content = content.replace(/([^a-zA-Z0-9_])findIssuedMedicalCopyRequestForRelease\(/g, '$1await findIssuedMedicalCopyRequestForRelease(');
    changed = true;
  }
  if (content.includes('buildDocumentAuditFacts(')) {
    content = content.replace(/([^a-zA-Z0-9_])buildDocumentAuditFacts\(/g, '$1await buildDocumentAuditFacts(');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(path.join(dir, file), content);
    console.log(`Updated ${file}`);
  }
}
