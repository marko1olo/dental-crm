import { buildDenteTelegramOutbox as origGen, patients, payments, appointments, activeVisit } from './apps/api/dist/sampleData.js';
import { buildDenteTelegramOutbox as optGen } from './apps/api/dist/sampleData_opt.js';

// populate with dummy data to make the O(N*M) noticeable
for(let i=0; i<10000; i++) {
    patients.push({ id: `p_${i}`, status: 'active', organizationId: "00000000-0000-0000-0000-000000000000" });
}
for(let i=0; i<1000; i++) {
    payments.push({ id: `pay_${i}`, patientId: `p_${i}`, status: 'paid', organizationId: "00000000-0000-0000-0000-000000000000", createdAt: new Date().toISOString() });
}

const ORG_ID = "00000000-0000-0000-0000-000000000000";
const ITERS = 10; // run multiple times for better measurement

// Warmup
for (let i = 0; i < 2; i++) {
  origGen();
  optGen();
}

let origTotal = 0;
for (let i = 0; i < ITERS; i++) {
  const start = performance.now();
  origGen();
  const end = performance.now();
  origTotal += (end - start);
}

let optTotal = 0;
for (let i = 0; i < ITERS; i++) {
  const start = performance.now();
  optGen();
  const end = performance.now();
  optTotal += (end - start);
}

console.log(`Patients: ${patients.length}, Payments: ${payments.length}`);
console.log(`Original avg duration: ${origTotal / ITERS} ms`);
console.log(`Optimized avg duration: ${optTotal / ITERS} ms`);
console.log(`Improvement: ${((origTotal - optTotal) / origTotal * 100).toFixed(2)}%`);
