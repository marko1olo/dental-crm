const fs = require('fs');

// We will modify documents.ts to make the functions async and fetch documents from db
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// findIssuedDuplicateTaxCertificate
code = code.replace(/export function findIssuedDuplicateTaxCertificate\(document: GeneratedDocument, allDocuments: GeneratedDocument\[\]\): GeneratedDocument \| null \{/, 
  'export async function findIssuedDuplicateTaxCertificate(document: GeneratedDocument): Promise<GeneratedDocument | null> {\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);');

// hasIssuedTaxApplicationForCertificate
code = code.replace(/export function hasIssuedTaxApplicationForCertificate\(document: GeneratedDocument, allDocuments: GeneratedDocument\[\]\): boolean \{/, 
  'export async function hasIssuedTaxApplicationForCertificate(document: GeneratedDocument): Promise<boolean> {\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);');

// sourceReleaseRequestIssued
code = code.replace(/export function sourceReleaseRequestIssued\(document: GeneratedDocument, allDocuments: GeneratedDocument\[\]\): GeneratedDocument \| null \{/, 
  'export async function sourceReleaseRequestIssued(document: GeneratedDocument): Promise<GeneratedDocument | null> {\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);');

// completedWorksActMatchesIssuedContract
code = code.replace(/export function completedWorksActMatchesIssuedContract\(document: GeneratedDocument, allDocuments: GeneratedDocument\[\]\): boolean \{/, 
  'export async function completedWorksActMatchesIssuedContract(document: GeneratedDocument): Promise<boolean> {\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);');

// documentIssueBlockReason
code = code.replace(/export function documentIssueBlockReason\(document: GeneratedDocument, patient: Patient, renderContext: DocumentRenderContext, allDocuments: GeneratedDocument\[\]\): string \| null \{/, 
  'export async function documentIssueBlockReason(document: GeneratedDocument, patient: Patient, renderContext: DocumentRenderContext): Promise<string | null> {');
code = code.replace(/findIssuedDuplicateTaxCertificate\(document, allDocuments\)/g, 'await findIssuedDuplicateTaxCertificate(document)');
code = code.replace(/hasIssuedTaxApplicationForCertificate\(document, allDocuments\)/g, 'await hasIssuedTaxApplicationForCertificate(document)');
code = code.replace(/sourceReleaseRequestIssued\(document, allDocuments\)/g, 'await sourceReleaseRequestIssued(document)');
code = code.replace(/completedWorksActMatchesIssuedContract\(document, allDocuments\)/g, 'await completedWorksActMatchesIssuedContract(document)');

// documentIssueChainBlockReason
code = code.replace(/export function documentIssueChainBlockReason\(document: GeneratedDocument, allDocuments: GeneratedDocument\[\]\): string \| null \{/, 
  'export async function documentIssueChainBlockReason(document: GeneratedDocument): Promise<string | null> {\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);');

// taxFiscalDocumentBlockReason uses hasIssuedTaxApplicationForCertificate
code = code.replace(/export function taxFiscalDocumentBlockReason\(document: GeneratedDocument\): string \| null \{/, 
  'export async function taxFiscalDocumentBlockReason(document: GeneratedDocument): Promise<string | null> {');
code = code.replace(/!hasIssuedTaxApplicationForCertificate\(document\)/g, '!(await hasIssuedTaxApplicationForCertificate(document))');

// publicGeneratedDocument (inside documents.ts line 245)
code = code.replace(/const issueBlockReason =\s*document\.status === "draft" \? documentIssueBlockReason\(document, patient, renderContext\) \?\? documentIssueChainBlockReason\(document\) : null;/g,
  `const issueBlockReason = document.status === "draft" ? (await documentIssueBlockReason(document, patient, renderContext)) ?? (await documentIssueChainBlockReason(document)) : null;`);
code = code.replace(/export function publicGeneratedDocument/g, 'export async function publicGeneratedDocument');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('documents.ts updated to async');

// Now we need to update the callers in routes/documents/*.ts
const path = require('path');
const dir = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  let content = fs.readFileSync(path.join(dir, file), 'utf8');
  let changed = false;

  // Add await to calls
  if (content.includes('documentIssueBlockReason(')) {
    content = content.replace(/([^a-zA-Z0-9_])documentIssueBlockReason\(/g, '$1await documentIssueBlockReason(');
    changed = true;
  }
  if (content.includes('findIssuedDuplicateTaxCertificate(')) {
    content = content.replace(/([^a-zA-Z0-9_])findIssuedDuplicateTaxCertificate\(/g, '$1await findIssuedDuplicateTaxCertificate(');
    changed = true;
  }
  if (content.includes('documentIssueChainBlockReason(')) {
    content = content.replace(/([^a-zA-Z0-9_])documentIssueChainBlockReason\(/g, '$1await documentIssueChainBlockReason(');
    changed = true;
  }
  if (content.includes('publicGeneratedDocument(')) {
    content = content.replace(/([^a-zA-Z0-9_])publicGeneratedDocument\(/g, '$1await publicGeneratedDocument(');
    changed = true;
  }
  if (content.includes('taxFiscalDocumentBlockReason(')) {
    content = content.replace(/([^a-zA-Z0-9_])taxFiscalDocumentBlockReason\(/g, '$1await taxFiscalDocumentBlockReason(');
    changed = true;
  }

  // Update getDocumentById imports if they use sampleData (we might have missed some)
  if (content.includes('getDocumentById') && content.includes('../sampleData.js')) {
    content = content.replace(/getDocumentById,?/g, '');
    content = `import { getDocumentById } from "../db/documentQuery.js";\n` + content;
    content = content.replace(/const document = getDocumentById/g, 'const document = await getDocumentById');
    changed = true;
  }

  // Same for other db functions if used
  if (content.includes('const document = documents.find')) {
    content = content.replace(/const document = documents\.find\(\(candidate\) => candidate\.id === documentId\);/g,
      `const orgId = await getDefaultOrganizationId();\nconst document = await getDocumentById(orgId!, documentId);`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(path.join(dir, file), content);
    console.log(`Updated ${file}`);
  }
}


