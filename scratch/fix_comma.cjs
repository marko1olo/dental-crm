const fs = require('fs');
let code = fs.readFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', 'utf8');

code = code.replace('setReleaseThirdPartyDataChecked\r\n    taxDocumentYear,', 'setReleaseThirdPartyDataChecked,\r\n    taxDocumentYear,');
code = code.replace('setReleaseThirdPartyDataChecked\n    taxDocumentYear,', 'setReleaseThirdPartyDataChecked,\n    taxDocumentYear,');

fs.writeFileSync('C:/Clinic_MVP/dental-crm/apps/web/src/DocumentsView.tsx', code);
console.log('Fixed missing comma');
