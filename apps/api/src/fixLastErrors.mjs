import fs from 'fs';

let seed = fs.readFileSync('apps/api/src/db/seedData.ts', 'utf8');
const missingVars = `
const defaultClinicTimezone = "Europe/Samara";
const defaultClinicScheduleDefaults = {
  workdayStart: "09:00",
  workdayEnd: "18:00",
  workingDays: [1, 2, 3, 4, 5],
  appointmentBufferMinutes: 10
};
`;
seed = seed.replace(/const nowIso = new Date\(\)\.toISOString\(\);/, 'const nowIso = new Date().toISOString();' + missingVars);
fs.writeFileSync('apps/api/src/db/seedData.ts', seed);

let transient = fs.readFileSync('apps/api/src/services/transientState.ts', 'utf8');
transient = transient.replace(/enabled: true,/g, 'mode: "clinic_owned_bot",\nprivacyMode: "consented_phi_templates",\nversion: 1,\norganizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",\npersistentMenuOverrides: null,\nstaffEscalationChannel: null,');
transient = transient.replace(/annotationsVisible: true,\n    measurementsVisible: true,\n    overlayVisible: true,/g, '');
transient = transient.replace(/referenceLinesVisible: study\.kind === "cbct",/g, 'crosshair: false,');
fs.writeFileSync('apps/api/src/services/transientState.ts', transient);

console.log('Fixed last errors');
