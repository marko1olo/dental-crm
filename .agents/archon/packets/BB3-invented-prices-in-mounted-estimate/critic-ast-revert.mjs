import { readFileSync } from "node:fs";
import { parse } from "@babel/parser";

const INVENTED_SERVICE_IDS = [
	"service_caries_01",
	"service_endo_pulpitis",
	"service_implant_osstem",
	"service_surgery_guide",
	"service_crown_zirconia",
];
const INVENTED_TITLES = [
	"Коронка из диоксида циркония",
	"Коронка детская стандартная",
	"Эндодонтическое лечение (Пульпит)",
];

function* astNodes(node) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const c of node) yield* astNodes(c);
		return;
	}
	const r = node;
	if (typeof r.type === "string") yield r;
	for (const [k, v] of Object.entries(r)) {
		if (
			k === "loc" ||
			k === "comments" ||
			k === "leadingComments" ||
			k === "trailingComments" ||
			k === "innerComments"
		)
			continue;
		yield* astNodes(v);
	}
}
function nodesOf(path) {
	const src = readFileSync(new URL(path, import.meta.url), "utf8");
	return [
		...astNodes(
			parse(src, { sourceType: "module", plugins: ["typescript", "jsx"] }),
		),
	];
}
for (const [label, path] of [
	["PARENT e29a8791a", "./parent_TreatmentEstimator.tsx.txt"],
	["HEAD a094f1268", "./head_TreatmentEstimator.tsx.txt"],
]) {
	const nodes = nodesOf(path);
	const strings = nodes
		.filter((n) => n.type === "StringLiteral")
		.map((n) => String(n.value));
	const idHits = INVENTED_SERVICE_IDS.filter((id) => strings.includes(id));
	const titleHits = INVENTED_TITLES.filter((t) => strings.includes(t));
	const moneyProps = new Set(["price", "priceRub", "basePriceRub"]);
	const offenders = [];
	for (const n of nodes) {
		if (n.type !== "ObjectProperty") continue;
		const key = n.key;
		const name = key && typeof key.name === "string" ? key.name : null;
		if (!name) continue;
		if (name === "priceRub") offenders.push("priceRub");
		if (!moneyProps.has(name)) continue;
		const v = n.value;
		if (v && v.type === "NumericLiteral")
			offenders.push(`${name}: ${String(v.value)}`);
	}
	console.log(`\n--- ${label} ---`);
	console.log(
		"TEST A (no invented service id):",
		idHits.length === 0 && titleHits.length === 0
			? "PASS"
			: `FAIL -> ids=${JSON.stringify(idHits)} titles=${JSON.stringify(titleHits)}`,
	);
	console.log(
		"TEST B (no numeric money literal):",
		offenders.length === 0 ? "PASS" : `FAIL -> ${offenders.join(", ")}`,
	);
}
