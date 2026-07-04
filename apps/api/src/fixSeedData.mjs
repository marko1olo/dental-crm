import fs from 'fs';

let code = fs.readFileSync('apps/api/src/db/seedData.ts', 'utf8');

const constants = `
const organizationId = "4a3420d1-6ffb-4459-bd8f-7f7087f5e191";
const doctorUserId = "8356141b-7cfa-4221-95f7-70f47e7344b1";
const assistantUserId = "f365da0c-7094-4f80-b52d-59b7b1254791";
const chairId = "b5450677-b0fc-4228-9672-56b27062783f";
const marinaPatientId = "3ebb4567-7777-4f19-8c23-2a78c9962796";
const alexeyPatientId = "fe736762-aef9-46c2-94d8-0ba5ea1bd11a";
const elmiraPatientId = "46c7b2cb-f4db-49e8-ac4e-ad6b1ecdf1ba";
const activeAppointmentId = "b82038a1-a97f-4f67-8450-c109562f0fd8";
const activeVisitId = "af94df45-a669-4cae-b400-6e4f020f9120";
const nowIso = new Date().toISOString();
type UiPreferences = any;
`;

code = code.replace('import type {', constants + '\nimport type {');
fs.writeFileSync('apps/api/src/db/seedData.ts', code);
console.log('Fixed seedData.ts');
