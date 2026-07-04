const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// findIssuedDuplicateTaxCertificate
code = code.replace(/export function findIssuedDuplicateTaxCertificate\(document: GeneratedDocument\): GeneratedDocument \| null \{/, 
  'export function findIssuedDuplicateTaxCertificate(document: GeneratedDocument, allDocuments: GeneratedDocument[]): GeneratedDocument | null {');
code = code.replace(/for \(const candidate of documents\) \{/g, 'for (const candidate of allDocuments) {');

// hasIssuedTaxApplicationForCertificate
code = code.replace(/export function hasIssuedTaxApplicationForCertificate\(document: GeneratedDocument\): boolean \{/, 
  'export function hasIssuedTaxApplicationForCertificate(document: GeneratedDocument, allDocuments: GeneratedDocument[]): boolean {');
code = code.replace(/return documents\.some\(\(candidate\)/g, 'return allDocuments.some((candidate)');

// sourceReleaseRequestIssued
code = code.replace(/export function sourceReleaseRequestIssued\(document: GeneratedDocument\): GeneratedDocument \| null \{/, 
  'export function sourceReleaseRequestIssued(document: GeneratedDocument, allDocuments: GeneratedDocument[]): GeneratedDocument | null {');
code = code.replace(/documents\.find\(\(candidate\)/g, 'allDocuments.find((candidate)');

// completedWorksActMatchesIssuedContract
code = code.replace(/export function completedWorksActMatchesIssuedContract\(document: GeneratedDocument\): boolean \{/, 
  'export function completedWorksActMatchesIssuedContract(document: GeneratedDocument, allDocuments: GeneratedDocument[]): boolean {');
code = code.replace(/return documents\.some\(\(candidate\)/g, 'return allDocuments.some((candidate)');

// documentIssueBlockReason
code = code.replace(/export function documentIssueBlockReason\(document: GeneratedDocument, patient: Patient, renderContext: DocumentRenderContext\): string \| null \{/, 
  'export function documentIssueBlockReason(document: GeneratedDocument, patient: Patient, renderContext: DocumentRenderContext, allDocuments: GeneratedDocument[]): string | null {');
code = code.replace(/findIssuedDuplicateTaxCertificate\(document\)/g, 'findIssuedDuplicateTaxCertificate(document, allDocuments)');
code = code.replace(/hasIssuedTaxApplicationForCertificate\(document\)/g, 'hasIssuedTaxApplicationForCertificate(document, allDocuments)');
code = code.replace(/sourceReleaseRequestIssued\(document\)/g, 'sourceReleaseRequestIssued(document, allDocuments)');
code = code.replace(/completedWorksActMatchesIssuedContract\(document\)/g, 'completedWorksActMatchesIssuedContract(document, allDocuments)');

// documentIssueChainBlockReason
code = code.replace(/export function documentIssueChainBlockReason\(document: GeneratedDocument\): string \| null \{/, 
  'export function documentIssueChainBlockReason(document: GeneratedDocument, allDocuments: GeneratedDocument[]): string | null {');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done fixing documents.ts');
