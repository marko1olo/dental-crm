const fs = require('fs');
const path = require('path');

// 1. Add getPaymentsByPatientIdInDb to billingQuery.ts
let bq = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/billingQuery.ts', 'utf8');
if (!bq.includes('export async function getPaymentsByPatientIdInDb')) {
  bq += '\nexport async function getPaymentsByPatientIdInDb(organizationId: string, patientId: string): Promise<import(\'@dental/shared\').Payment[]> {\n  return await db.select().from(schema.payments).where(and(eq(schema.payments.organizationId, organizationId), eq(schema.payments.patientId, patientId)));\n}\n';
  fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/billingQuery.ts', bq);
}

// 2. Fix writeIssuedDocumentSnapshot in documentQuery.ts
let dq = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', 'utf8');
dq = dq.replace(
  /export function writeIssuedDocumentSnapshot[\s\S]*?return \{[\s\S]*?sha256: createHash\('sha256'\)\.update\(html, 'utf8'\)\.digest\('hex'\),[\s\S]*?path: file[\s\S]*?\};\n\}/,
  `export function writeIssuedDocumentSnapshot(documentId: string, html: string): { sha256: string; snapshotPath: string; createdAt: string } {
  const file = documentSnapshotPath(documentId);
  writeFileSync(file, html, 'utf8');
  return {
    sha256: createHash('sha256').update(html, 'utf8').digest('hex'),
    snapshotPath: file,
    createdAt: new Date().toISOString()
  };
}`
);
dq = dq.replace(/import \{ getPatientForBilling \} from "\.\/billingQuery\.js";/, 'import { getPaymentsByPatientIdInDb } from "./billingQuery.js";');
dq = dq.replace(/const billingData = await getPatientForBilling\(organizationId, patientId\);\n\s*payments = billingData\?\.payments \|\| \[\];/, 'payments = await getPaymentsByPatientIdInDb(organizationId, patientId);');
fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', dq);

// 3. Fix imports in sub-routes
const routesDir = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents';
const subFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
for (const f of subFiles) {
  const p = path.join(routesDir, f);
  let sub = fs.readFileSync(p, 'utf8');
  sub = sub.replace(/import \{[\s\S]*?readIssuedDocumentSnapshot[\s\S]*?\} from "\.\.\/\.\.\/sampleData\.js";/g, '');
  sub = sub.replace(/import \{[\s\S]*?\} from "\.\.\/\.\.\/sampleData\.js";/g, ''); 
  if (sub.includes('readIssuedDocumentSnapshot')) {
    sub = 'import { readIssuedDocumentSnapshot } from "../../db/documentQuery.js";\n' + sub;
  }
  if (sub.includes('findIssuedDuplicateTaxCertificate(document)')) {
     sub = sub.replace(/await findIssuedDuplicateTaxCertificate\(document\)/g, 'await findIssuedDuplicateTaxCertificate(document, [])');
  }
  fs.writeFileSync(p, sub);
}

console.log('Fixed DB queries and sub-routes');
