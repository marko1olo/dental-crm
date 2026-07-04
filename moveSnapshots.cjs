const fs = require('fs');
let c = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', 'utf8');

c = c.replace(
  /import \{ writeIssuedDocumentSnapshot \} from \"\.\.\/sampleData\.js\"; \/\/ or reimplement here, but keep sampleData logic for now/,
  `import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

function documentSnapshotPath(documentId: string): string {
  const dir = path.join(process.cwd(), '.dente-data', 'documents');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return path.join(dir, \`\${documentId}.html\`);
}

export function writeIssuedDocumentSnapshot(documentId: string, html: string): { sha256: string; path: string } {
  const file = documentSnapshotPath(documentId);
  writeFileSync(file, html, 'utf8');
  return {
    sha256: createHash('sha256').update(html, 'utf8').digest('hex'),
    path: file
  };
}

export function readIssuedDocumentSnapshot(document: import('@dental/shared').GeneratedDocument): string | null {
  if (document.status !== 'issued' && document.status !== 'voided') return null;
  if (!document.issuedSnapshotSha256) return null;
  const snapshotPath = document.storagePath || documentSnapshotPath(document.id);
  if (!existsSync(snapshotPath)) return null;
  const html = readFileSync(snapshotPath, 'utf8');
  const actualHash = createHash('sha256').update(html, 'utf8').digest('hex');
  if (actualHash !== document.issuedSnapshotSha256) return null;
  return html;
}`
);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/db/documentQuery.ts', c);
console.log('Moved read/write document snapshot to documentQuery.ts');
