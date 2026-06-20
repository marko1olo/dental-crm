const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/documentLogic.ts', 'utf8');

code = code.replace(
  'import { DocumentPayload, GeneratedDocument } from "@dental/shared";',
  'import { DocumentPayload, GeneratedDocument } from "@dental/shared";\nimport { isDateInputValue, isDateTimeLocalInputValue, fromDateTimeLocalValue, structuredPayloadDocumentKinds } from "./AppHelpers";\nimport { normalizeRubAmountInput, rubAmountInputMissingStep } from "./rubAmountInput";'
);

code = code.replace(/\(payment\) =>/g, '(payment: any) =>');
code = code.replace(/releaseChannel,/g, 'releaseChannel: state.releaseChannel,');
code = code.replace(/refundMethod,/g, 'refundMethod: state.refundMethod,');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/documentLogic.ts', code);
console.log('Patched documentLogic.ts');
