const fs = require('fs');
let c = fs.readFileSync('apps/web/src/DocumentsView.tsx', 'utf8');
const importStr = 'import { TreatmentPlanAcceptanceForm } from "./components/documents/forms/TreatmentPlanAcceptanceForm";\n';
const lastImportIdx = c.lastIndexOf('import ');
const nextNewline = c.indexOf('\n', lastImportIdx);
c = c.substring(0, nextNewline + 1) + importStr + c.substring(nextNewline + 1);
fs.writeFileSync('apps/web/src/DocumentsView.tsx', c, 'utf8');
