const { generateReviewRequestOutbox: origGen, patients, payments } = require('./apps/api/dist/sampleData.js');
const { generateReviewRequestOutbox: optGen } = require('./apps/api/dist/sampleData_opt.js');

const ORG_ID = "00000000-0000-0000-0000-000000000000";
const ITERS = 100; // run multiple times for better measurement

let origTotal = 0;
for (let i = 0; i < ITERS; i++) {
  const start = performance.now();
  origGen({ organizationId: ORG_ID });
  const end = performance.now();
  origTotal += (end - start);
}

let optTotal = 0;
for (let i = 0; i < ITERS; i++) {
  const start = performance.now();
  optGen({ organizationId: ORG_ID });
  const end = performance.now();
  optTotal += (end - start);
}

console.log(`Patients: ${patients.length}, Payments: ${payments.length}`);
console.log(`Original avg duration: ${origTotal / ITERS} ms`);
console.log(`Optimized avg duration: ${optTotal / ITERS} ms`);
console.log(`Improvement: ${((origTotal - optTotal) / origTotal * 100).toFixed(2)}%`);
