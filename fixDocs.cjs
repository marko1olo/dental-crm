const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', 'utf8');

const queryImport = `import {
  getDefaultOrganizationId,
  getDocumentsByPatientId,
  getDocumentById,
  createGeneratedDocumentInDb,
  issueGeneratedDocumentInDb,
  voidGeneratedDocumentInDb,
  storeTaxXmlSnapshotInDb
} from "../db/documentQuery.js";\n`;

code = code.replace(/import \{([^}]+)\} from "\.\.\/sampleData\.js";/, (match, p1) => {
  let modified = p1
    .replace(/\bcreateGeneratedDocument\b,?/g, '')
    .replace(/\bdocuments\b,?/g, '')
    .replace(/\bissueGeneratedDocument\b,?/g, '')
    .replace(/\bstoreTaxXmlSnapshot\b,?/g, '')
    .replace(/\bvoidGeneratedDocument\b,?/g, '')
    .replace(/,\s*,/g, ',')
    .replace(/\{\s*,/g, '{')
    .replace(/,\s*\}/g, '}');
  return queryImport + `import {${modified}} from "../sampleData.js";`;
});

// Update createGeneratedDocument -> createGeneratedDocumentInDb(orgId, ...)
code = code.replace(/createGeneratedDocument\(\{/g, 'await createGeneratedDocumentInDb(orgId, {');

// Update issueGeneratedDocument -> issueGeneratedDocumentInDb(orgId, ...)
code = code.replace(/issueGeneratedDocument\(/g, 'await issueGeneratedDocumentInDb(orgId, ');

// Update voidGeneratedDocument -> voidGeneratedDocumentInDb(orgId, ...)
code = code.replace(/voidGeneratedDocument\(/g, 'await voidGeneratedDocumentInDb(orgId, ');

// Update storeTaxXmlSnapshot -> storeTaxXmlSnapshotInDb(orgId, ...)
code = code.replace(/storeTaxXmlSnapshot\(/g, 'await storeTaxXmlSnapshotInDb(orgId, ');

// Fix GET /api/documents (patientId)
code = code.replace(/const patientDocuments = documents\.filter\(\(doc\) => doc\.patientId === patientId\);/g,
  `const orgId = await getDefaultOrganizationId();
      if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
      const patientDocuments = await getDocumentsByPatientId(orgId, patientId);`);

// For any route looking up `const doc = documents.find(...)`
code = code.replace(/const doc = documents\.find\(\(candidate\) => candidate\.id === documentId\);/g, 
  `const orgId = await getDefaultOrganizationId();
      if (!orgId) return reply.code(500).send({ ok: false, message: "No default organization found" });
      const doc = await getDocumentById(orgId, documentId);`);

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/api/src/routes/documents.ts', code);
console.log('done');
