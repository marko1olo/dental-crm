import { generateReviewRequestOutbox, patients, payments } from './apps/api/dist/sampleData.js';

const start = performance.now();
generateReviewRequestOutbox({ organizationId: "00000000-0000-0000-0000-000000000000" });
const end = performance.now();

console.log(`Original duration: ${end - start} ms`);
console.log(`Patients: ${patients.length}, Payments: ${payments.length}`);
