// R4: is the `Math.abs(diff) > 0.01` tolerance in documents/guards.ts:657 and :671
// a stable one-kopeck check? Pure arithmetic, no DB.
console.log(
	"A one-kopeck discrepancy between declared total and sum of lines.",
);
console.log(
	"guards.ts:657/:671 catch it only when Math.abs(diff) > 0.01 is true.\n",
);
console.log("total        declared   diff (float)              caught?");
let caught = 0;
let missed = 0;
for (const base of [
	1, 10, 100, 1000, 5400, 10000, 14800, 26500, 100000, 999999,
]) {
	const lines = base + 0.0;
	const declared = base + 0.01; // exactly one kopeck more
	const diff = Math.abs(lines - declared);
	const isCaught = diff > 0.01;
	if (isCaught) caught++;
	else missed++;
	console.log(
		`${String(lines.toFixed(2)).padEnd(12)} ${String(declared.toFixed(2)).padEnd(10)} ${String(diff).padEnd(25)} ${isCaught ? "caught" : "MISSED — 1 kopeck accepted"}`,
	);
}
console.log(
	`\ncaught ${caught}, MISSED ${missed} of 10 — the same one-kopeck error, different magnitudes.`,
);

console.log(
	"\n--- and guards.ts:684 uses strict !== on the same kind of value ---",
);
for (const [a, b] of [
	[600.6, 600.5999999999999],
	[10101, 10101.000000000002],
	[1111, 1110.9999999999995],
]) {
	console.log(`  ${a} !== ${b}  ->  ${a !== b}  (blocks the document)`);
}
