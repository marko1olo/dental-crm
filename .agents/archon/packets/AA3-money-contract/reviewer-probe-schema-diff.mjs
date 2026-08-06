// Reviewer probe (read-only). DIFFERENT INSTRUMENT than the builder used (rg text counts):
// runtime zod behaviour. Walks every exported schema in the PARENT copy of packages/shared/src/index.ts
// and in the HEAD source, reaches every number leaf, and feeds it real values.
// Then diffs acceptance behaviour leaf-by-leaf. A counter that flipped reject->accept on 3.5 is
// REVERT-grade; this probe is what would find it.
import { z } from "zod";

const HEAD = await import("../../../../packages/shared/src/index.ts");
const PARENT = await import("./parent-shared/index.ts");

const PROBE_VALUES = {
	kopecks: 1500.5,
	thirdKopeck: 1500.505,
	halfCount: 3.5,
	negative: -5000,
	wholeInt: 1500,
};

function unwrap(schema, depth = 0) {
	if (!schema || depth > 12) return null;
	const def = schema._def;
	if (!def) return null;
	const t = def.typeName;
	if (
		t === "ZodOptional" ||
		t === "ZodNullable" ||
		t === "ZodDefault" ||
		t === "ZodCatch" ||
		t === "ZodBranded" ||
		t === "ZodReadonly"
	) {
		return unwrap(def.innerType, depth + 1);
	}
	if (t === "ZodEffects") return unwrap(def.schema, depth + 1);
	if (t === "ZodLazy") {
		try {
			return unwrap(def.getter(), depth + 1);
		} catch {
			return null;
		}
	}
	return schema;
}

// Collect leaf paths -> a probe function that validates that leaf in isolation.
function collectNumberLeaves(schema, path, out, seen, depth = 0) {
	if (depth > 10) return;
	const inner = unwrap(schema);
	if (!inner) return;
	const t = inner._def?.typeName;
	if (t === "ZodNumber" || (t === undefined && false)) {
		out.push({ path, schema });
		return;
	}
	if (t === "ZodObject") {
		if (seen.has(inner)) return;
		seen.add(inner);
		const shape = inner._def.shape();
		for (const key of Object.keys(shape)) {
			collectNumberLeaves(shape[key], `${path}.${key}`, out, seen, depth + 1);
		}
		seen.delete(inner);
		return;
	}
	if (t === "ZodArray") {
		collectNumberLeaves(inner._def.type, `${path}[]`, out, seen, depth + 1);
		return;
	}
	if (t === "ZodRecord") {
		collectNumberLeaves(
			inner._def.valueType,
			`${path}{}`,
			out,
			seen,
			depth + 1,
		);
		return;
	}
	if (t === "ZodTuple") {
		(inner._def.items ?? []).forEach((item, i) =>
			collectNumberLeaves(item, `${path}[${i}]`, out, seen, depth + 1),
		);
		return;
	}
	if (t === "ZodUnion" || t === "ZodDiscriminatedUnion") {
		const opts = inner._def.options
			? Array.isArray(inner._def.options)
				? inner._def.options
				: Array.from(inner._def.options.values())
			: [];
		opts.forEach((opt, i) =>
			collectNumberLeaves(opt, `${path}|${i}`, out, seen, depth + 1),
		);
		return;
	}
	if (t === "ZodIntersection") {
		collectNumberLeaves(inner._def.left, `${path}&L`, out, seen, depth + 1);
		collectNumberLeaves(inner._def.right, `${path}&R`, out, seen, depth + 1);
		return;
	}
}

function behaviour(mod) {
	const leaves = [];
	for (const [name, value] of Object.entries(mod)) {
		if (
			!value ||
			typeof value !== "object" ||
			!value._def ||
			typeof value.safeParse !== "function"
		)
			continue;
		collectNumberLeaves(value, name, leaves, new Set());
	}
	const map = new Map();
	for (const leaf of leaves) {
		// Probe the LEAF schema directly (its own declaration), not the whole object,
		// so sibling-field requirements cannot mask the result.
		const target = leaf.schema;
		const row = {};
		for (const [label, v] of Object.entries(PROBE_VALUES)) {
			row[label] = target.safeParse(v).success;
		}
		if (!map.has(leaf.path)) map.set(leaf.path, row);
	}
	return map;
}

const headMap = behaviour(HEAD);
const parentMap = behaviour(PARENT);

console.log(
	"number leaves reached: HEAD",
	headMap.size,
	"PARENT",
	parentMap.size,
);

const isMoneyName = (p) =>
	/rub(\b|$|[.[|{&])/i.test(p) || /Rub[)\]]?$/.test(p) || /Rub\./.test(p);

const widened = [];
const tightened = [];
const onlyHead = [];
for (const [path, head] of headMap) {
	const parent = parentMap.get(path);
	if (!parent) {
		onlyHead.push(path);
		continue;
	}
	if (!parent.kopecks && head.kopecks) widened.push(path);
	if (parent.kopecks && !head.kopecks) tightened.push(path);
}

console.log(
	"\n=== LEAVES THAT WENT reject(1500.50) -> accept(1500.50) (the migration) ===",
);
console.log("count:", widened.length);
const nonMoneyWidened = widened.filter((p) => !/rub/i.test(p));
for (const p of widened)
	console.log("  ", p, /rub/i.test(p) ? "" : "  <<< NOT MONEY-NAMED");
console.log(
	"NON-MONEY-NAMED widened (mass-conversion evidence if > 0):",
	nonMoneyWidened.length,
	nonMoneyWidened,
);

console.log("\n=== LEAVES THAT WENT accept -> reject on 1500.50 ===");
console.log(tightened.length, tightened);

console.log(
	"\n=== ANY leaf that now accepts 3.5 but did not before (a COUNT widened) ===",
);
const countWidened = [];
for (const [path, head] of headMap) {
	const parent = parentMap.get(path);
	if (!parent) continue;
	if (!parent.halfCount && head.halfCount) countWidened.push(path);
}
console.log(countWidened.length, countWidened);

console.log(
	"\n=== MONEY-NAMED leaves at HEAD that still REJECT 1500.50 (money left integer) ===",
);
const stillInt = [...headMap.entries()]
	.filter(([p, r]) => /rub/i.test(p) && !r.kopecks)
	.map(([p]) => p);
console.log(stillInt.length, stillInt);

console.log(
	"\n=== MONEY-NAMED leaves at HEAD that ACCEPT 1500.505 (no kopeck precision) ===",
);
const loose = [...headMap.entries()]
	.filter(([p, r]) => /rub/i.test(p) && r.thirdKopeck)
	.map(([p]) => p);
console.log(loose.length);
for (const p of loose) console.log("  ", p);

console.log("\n=== MONEY-NAMED leaves at HEAD that ACCEPT -5000 ===");
const neg = [...headMap.entries()]
	.filter(([p, r]) => /rub/i.test(p) && r.negative)
	.map(([p]) => p);
console.log(neg.length);
for (const p of neg) console.log("  ", p);

console.log(
	"\n=== COUNTER SANITY: leaves whose name says count/quantity/version and accept 3.5 at HEAD ===",
);
const badCounters = [...headMap.entries()]
	.filter(
		([p, r]) =>
			/(count|quantity|version|items|documents|minutes|months|year|number|tooth)/i.test(
				p,
			) &&
			!/rub/i.test(p) &&
			r.halfCount,
	)
	.map(([p]) => p);
console.log(badCounters.length, badCounters.slice(0, 40));

console.log(
	"\n=== REVERT PROOF, EMPIRICAL: does the PARENT declaration reject the fixture the new test feeds? ===",
);
const revertTargets = [
	"billingSummarySchema.totalPaidRub",
	"billingSummarySchema.totalDueRub",
	"createDocumentSchema.totalAmountRub",
	"patientSchema.balanceRub",
	"treatmentPlanItemSchema.unitPriceRub",
	"paymentReceiptPayloadSchema.totalPaidRub",
	"dentalPricelistCategorySummarySchema.averagePriceRub",
	"billingSummarySchema.openTreatmentItems",
	"billingSummarySchema.unpaidDocuments",
];
for (const p of revertTargets) {
	const h = headMap.get(p);
	const par = parentMap.get(p);
	console.log(
		`  ${p}: PARENT accepts 1500.50 = ${par?.kopecks}, HEAD accepts 1500.50 = ${h?.kopecks}`,
	);
}
