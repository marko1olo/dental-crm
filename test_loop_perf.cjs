const ts = require('typescript');
const fs = require('fs');

const tsFilePath = 'apps/api/src/sampleData.ts';
let code = fs.readFileSync(tsFilePath, 'utf8');

// The issue states:
// Inside the `for (const payment of paidMilestones)` loop, there is a `patients.find` and `findVisitById`.
// `paidMilestones` is an array of payments. Doing a linear search on patients for every payment is O(P * M) where P is patients and M is paid milestones. Moving patients into a Map by ID before the loop fixes this.
// `patients.find` is currently done inline.

// Let's modify the code inline using a string replace
const newCode = code.replace(
  /for \(const payment of paidMilestones\) {/,
  `const activePatientsMap = new Map(patients.filter(p => p.status === "active").map(p => [p.id, p]));
  for (const payment of paidMilestones) {`
).replace(
  /const patient = patients\.find\(\(candidate\) => candidate\.id === payment\.patientId && candidate\.status === "active"\) \?\? null;/,
  `const patient = activePatientsMap.get(payment.patientId) ?? null;`
);

fs.writeFileSync('apps/api/src/sampleData_opt.ts', newCode);
console.log("Optimized file created: apps/api/src/sampleData_opt.ts");
