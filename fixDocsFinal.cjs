const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// 1. Convert documentIssueChainBlockReason to async
code = code.replace(/export function documentIssueChainBlockReason\(document: GeneratedDocument\): string \| null \{/,
  'export async function documentIssueChainBlockReason(document: GeneratedDocument): Promise<string | null> {\n  const orgId = await getDefaultOrganizationId();\n  const allDocuments = await getDocumentsByPatientId(orgId!, document.patientId);');

// 2. Fix the error: src/routes/documents.ts(875,129): error TS1308: 'await' expressions are only allowed within async functions and at the top levels of modules.
// This is inside `publicGeneratedDocument`. My previous script did:
// code = code.replace(/export function publicGeneratedDocument/g, 'export async function publicGeneratedDocument');
// Let's check if it's really async. If not, make it async.
code = code.replace(/export function publicGeneratedDocument\(/g, 'export async function publicGeneratedDocument(');

// 3. Fix missing 'documents' variables. Lines 307, 667, 706, 728
// Line 307 is inside findIssuedDuplicateTaxCertificate. Wait, we made findIssuedDuplicateTaxCertificate async and added `allDocuments` inside it, but didn't replace `documents` with `allDocuments`.
code = code.replace(/for \(const candidate of documents\)/g, 'for (const candidate of allDocuments)');
code = code.replace(/documents\.some\(/g, 'allDocuments.some(');
code = code.replace(/documents\.find\(/g, 'allDocuments.find(');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done fixing documents.ts async issues');
