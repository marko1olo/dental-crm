import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [
  'void.ts', 'create.ts', 'html.ts', 'issue.ts', 'pdf.ts', 'taxXml.ts', 'auditFacts.ts'
];
for (const file of files) {
  const p = join('apps/api/src/routes/documents', file);
  let content = readFileSync(p, 'utf8');
  content = content.replace(/import\s*\{[^}]*\}\s*from\s*"..\/..\/sampleData.js";/g, 'import { getDocumentById, getAllDocuments, createGeneratedDocument, issueGeneratedDocument, voidGeneratedDocument, storeTaxXmlSnapshot, readIssuedDocumentSnapshot } from "../../services/documents.js";');
  
  // replace `documents.find` with `await getAllDocuments().then(docs => docs.find(...))` for a quick fix if it's used inside a map or something, or just `await getDocumentById`
  // Actually, let's just do a blanket regex replacement for `documents.find((candidate) => candidate.id === id)` with `await getDocumentById(id)`
  content = content.replace(/documents\.find\(\(?[a-zA-Z]+\)?\s*=>\s*[a-zA-Z]+\.id\s*===\s*([a-zA-Z]+)\)/g, '(await getDocumentById($1))');
  // for correctionDocumentId:
  content = content.replace(/documents\.find\(\(?[a-zA-Z]+\)?\s*=>\s*[a-zA-Z]+\.id\s*===\s*([a-zA-Z]+Id)\)/g, '(await getDocumentById($1))');
  
  writeFileSync(p, content);
}
