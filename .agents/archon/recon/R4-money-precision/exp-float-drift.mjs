// R4: does the float reduce in renderDocument.ts:1261 actually drift, on realistic
// Russian dental prices with kopecks? Pure arithmetic, no DB, no writes.
const cases = [
	["3 fillings with kopecks", [100.1, 200.2, 300.3]],
	["hygiene + implant stage", [4500.1, 32000.2, 1200.7]],
	["4 x 0.07 (min kopeck test)", [0.07, 0.07, 0.07, 0.07]],
	["real prices from live DB + kopecks", [5400.5, 7200.25, 14800.75]],
	["installment thirds of 14800.00", [4933.34, 4933.33, 4933.33]],
	["ten 1010.10 lines", Array.from({ length: 10 }, () => 1010.1)],
	["20 x 55.55", Array.from({ length: 20 }, () => 55.55)],
];

console.log(
	"=== renderDocument.ts:1261  actualTotalRub = parts.reduce((t,p)=>t+p, 0) ===",
);
console.log(
	"=== then :1262  if (actualTotalRub !== payload.totalPaidRub) -> BLOCK ===\n",
);

let driftCount = 0;
for (const [label, parts] of cases) {
	const floatSum = parts.reduce((t, p) => t + p, 0);
	// the exact answer, via integer kopecks (what money.ts would give)
	const exactKopecks = parts.reduce((t, p) => t + Math.round(p * 100), 0);
	const exact = exactKopecks / 100;
	const drifted = floatSum !== exact;
	if (drifted) driftCount++;
	console.log(`${label}`);
	console.log(
		`  parts        : ${parts.length} values, exact total ${exact.toFixed(2)}`,
	);
	console.log(`  float reduce : ${floatSum}`);
	console.log(`  exact kopecks: ${exactKopecks} kop = ${exact}`);
	console.log(
		`  float === exact ? ${!drifted}${drifted ? "   <-- :1262 STRICT !== FIRES, DOCUMENT BLOCKED" : ""}`,
	);
	if (drifted) {
		console.log(`  message the user would read at :1263 ->`);
		console.log(
			`    "сумма ${exact} руб. не совпадает с выбранными оплатами ${floatSum} руб."`,
		);
	}
	console.log("");
}
console.log(`cases that drift: ${driftCount} of ${cases.length}`);

console.log(
	"\n=== and the other half of the trap: payload.totalPaidRub is z.number().int() ===",
);
for (const v of [5400.5, 10801.0, 600.6]) {
	console.log(
		`  Number.isInteger(${v}) = ${Number.isInteger(v)}  -> ${Number.isInteger(v) ? "passes .int()" : "REJECTED by z.number().int() before it ever reaches :1262"}`,
	);
}
