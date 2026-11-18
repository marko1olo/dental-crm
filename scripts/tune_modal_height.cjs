const fs = require('fs');
const path = 'C:/Clinic_MVP/dental-crm/apps/web/src/components/anesthesia/AnesthesiaStudioModal.tsx';
let c = fs.readFileSync(path, 'utf8');

c = c.replace(
  'max-h-[90vh] sm:max-h-[88vh] overflow-hidden',
  'max-h-[92vh] sm:max-h-[94vh] overflow-hidden'
);
c = c.replace(
  '<main className="p-3.5 sm:p-5 space-y-2.5 overflow-y-auto min-h-0 flex-1">',
  '<main className="p-3 sm:p-4 space-y-2 overflow-y-auto min-h-0 flex-1">'
);

fs.writeFileSync(path + '.tmp', c, 'utf8');
fs.copyFileSync(path + '.tmp', path);
fs.unlinkSync(path + '.tmp');
console.log('Tuned modal max-height and padding');
