const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

const getDocs = `\n  const allDocuments = await getDocumentsByPatientId(document.organizationId, document.patientId);`;

code = code.replace(/export function findIssuedDuplicateTaxCertificate\(document: GeneratedDocument\): GeneratedDocument \| null \{/, 
  `export async function findIssuedDuplicateTaxCertificate(document: GeneratedDocument): Promise<GeneratedDocument | null> {${getDocs}`);

code = code.replace(/export function hasIssuedTaxApplicationForCertificate\(document: GeneratedDocument\): boolean \{/, 
  `export async function hasIssuedTaxApplicationForCertificate(document: GeneratedDocument): Promise<boolean> {${getDocs}`);

code = code.replace(/export function sourceReleaseRequestIssued\(document: GeneratedDocument\): GeneratedDocument \| null \{/, 
  `export async function sourceReleaseRequestIssued(document: GeneratedDocument): Promise<GeneratedDocument | null> {${getDocs}`);

code = code.replace(/export function completedWorksActMatchesIssuedContract\(document: GeneratedDocument\): boolean \{/, 
  `export async function completedWorksActMatchesIssuedContract(document: GeneratedDocument): Promise<boolean> {${getDocs}`);

// The error TS1308 on line 877: `taxFiscalDocumentBlockReason` and `publicGeneratedDocument` are not async.
code = code.replace(/export function taxFiscalDocumentBlockReason/g, 'export async function taxFiscalDocumentBlockReason');
code = code.replace(/export function publicGeneratedDocument/g, 'export async function publicGeneratedDocument');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done applying async fixes');
