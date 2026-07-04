import fs from 'fs';
import path from 'path';

const code = fs.readFileSync('apps/api/src/sampleData.ts', 'utf8');

const regex = /(export const (?:patients|appointments|activeVisit|documents|payments|serviceCatalog|treatmentPlanItems|treatmentPlanScenarios|clinicalRules|imagingStudies|staffMembers|chairs|clinicProfile)[^=]*=[\s\S]*?(?=\nexport (?:const|function|class|let)))/g;
let match;
let seedData = 'import type { Patient, Appointment, Visit, GeneratedDocument, Payment, ServiceCatalogItem, TreatmentPlanItem, TreatmentPlanScenario, ClinicalRule, ImagingStudy, StaffMember, Chair, ClinicProfile } from "@dental/shared";\n\n';

while ((match = regex.exec(code)) !== null) {
  seedData += match[0] + '\n';
}

fs.writeFileSync('apps/api/src/db/seedData.ts', seedData);
console.log('Extracted seed data: ' + fs.statSync('apps/api/src/db/seedData.ts').size + ' bytes');
