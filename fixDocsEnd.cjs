const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

// Convert buildReleaseJournalEntryForIssue to async
code = code.replace(/export function buildReleaseJournalEntryForIssue/g, 'export async function buildReleaseJournalEntryForIssue');
code = code.replace(/const sourceRequest = findIssuedMedicalCopyRequestForRelease\(document\);/g, 'const sourceRequest = await findIssuedMedicalCopyRequestForRelease(document);');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done updating documents.ts for buildReleaseJournalEntryForIssue');

// Update callers in issue.ts
const issueFile = 'C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents/issue.ts';
let issueCode = fs.readFileSync(issueFile, 'utf8');

if (issueCode.includes('buildReleaseJournalEntryForIssue(')) {
  issueCode = issueCode.replace(/([^a-zA-Z0-9_])buildReleaseJournalEntryForIssue\(/g, '$1await buildReleaseJournalEntryForIssue(');
  fs.writeFileSync(issueFile, issueCode);
  console.log('Updated issue.ts');
}
