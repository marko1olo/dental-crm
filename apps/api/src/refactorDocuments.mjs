import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const p = join('apps/api/src/routes/documents.ts');
let content = readFileSync(p, 'utf8');

// Replace imports
content = content.replace(
  /import\s*\{\s*appointments,\s*createGeneratedDocument,\s*clinicProfile,\s*documents,\s*findVisitById,\s*issueGeneratedDocument,\s*patients,\s*payments,\s*readIssuedDocumentSnapshot,\s*serviceCatalog,\s*storeTaxXmlSnapshot,\s*treatmentPlanItems,\s*voidGeneratedDocument\s*\}\s*from\s*"..\/sampleData.js";/g,
  `import { db } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema.js";
import { 
  createGeneratedDocument, 
  issueGeneratedDocument, 
  voidGeneratedDocument, 
  storeTaxXmlSnapshot, 
  readIssuedDocumentSnapshot,
  getAllDocuments,
  getDocumentById 
} from "../services/documents.js";
import { clinicProfile, serviceCatalog, treatmentPlanItems } from "../services/aiMocks.js";`
);

// Specifically replace the known array method usages
content = content.replace(
  /documents\.find\(\(candidate\) => \{\s*return candidate\.id === documentId;\s*\}\)/g,
  `(await getDocumentById(documentId))`
);

content = content.replace(
  /documents\.some\(\(candidate\) => \{\s*return candidate\.id === correctionDocumentId && candidate\.status !== "voided";\s*\}\)/g,
  `((await getDocumentById(correctionDocumentId))?.status !== "voided")`
);

content = content.replace(
  /documents\.find\(\(candidate\) => \{\s*return candidate\.id === correctionDocumentId;\s*\}\)/g,
  `(await getDocumentById(correctionDocumentId))`
);

content = content.replace(
  /documents\.some\(\(candidate\) => \{\s*return candidate\.id === receiptDocumentId && candidate\.status !== "voided";\s*\}\)/g,
  `((await getDocumentById(receiptDocumentId))?.status !== "voided")`
);

content = content.replace(
  /appointments\.find\(\(candidate\) => candidate\.id === visit\.appointmentId\)/g,
  `(await db.select().from(schema.appointments).where(eq(schema.appointments.id, visit.appointmentId)).then(res => res[0]))`
);

// We also need to fix `patients`, `payments` usages if they are used as arrays.
// Let's replace the whole file content.
writeFileSync(p, content);
console.log("Refactored documents.ts");
