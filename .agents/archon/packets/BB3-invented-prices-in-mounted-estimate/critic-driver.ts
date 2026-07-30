/* Independent driver: my instrument, not the builder's test file. */
import {
	estimatorItemForApi, estimatorIssueMessages, estimatorRowMoney,
	estimatorSaveBlock, estimatorTotals, reconcileAutoSuggestions,
} from "../../../../apps/web/src/components/odontogram/treatmentEstimatorPricing";

const INVENTED = [4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000];
const IDS = ["service_caries_01","service_endo_pulpitis","service_implant_osstem","service_surgery_guide","service_crown_zirconia"];

function show(label: string, v: unknown) { console.log(label, JSON.stringify(v)); }

/* A: EMPTY catalogue — the DEFAULT state per the DB measurement. */
const teeth = [
	{ toothNumber: 11, state: "Caries" }, { toothNumber: 21, state: "Crown" },
	{ toothNumber: 16, state: "Planned_Implant" }, { toothNumber: 36, state: "Pulpitis" },
	{ toothNumber: 71, state: "Caries" },
];
const empty = reconcileAutoSuggestions([], teeth, []).items;
console.log("=== A. EMPTY CATALOGUE (rows=" + empty.length + ") ===");
for (const r of empty) {
	const bad: string[] = [];
	if (r.price !== null) bad.push("price=" + String(r.price));
	if (r.priceId !== null) bad.push("priceId=" + String(r.priceId));
	if (r.price !== null && INVENTED.includes(r.price as number)) bad.push("INVENTED PRICE");
	if (r.priceId && IDS.includes(r.priceId)) bad.push("INVENTED ID");
	console.log(`  tooth ${r.toothNumber} «${r.name}» price=${String(r.price)} priceId=${String(r.priceId)} issue=${r.issue?.kind ?? "-"} ${bad.length ? "*** " + bad.join(",") : "OK"}`);
	if (estimatorItemForApi(r) !== null) console.log("  *** LEAK: row reached API body");
}
const tA = estimatorTotals(empty, null);
show("  totals:", tA);
console.log("  saveBlock message:", estimatorSaveBlock(empty)?.message ?? "NULL (save allowed!)");
show("  issueMessages:", estimatorIssueMessages(empty));

/* B: FILLED catalogue, kopeck fidelity. */
const cat = [{ id: "svc-1", title: "Лечение кариеса", category: "therapy", basePriceRub: 1500.5, active: true }];
const filled = reconcileAutoSuggestions([], [{ toothNumber: 11, state: "Caries" }], cat).items;
console.log("=== B. FILLED CATALOGUE ===");
show("  row:", { name: filled[0]?.name, price: filled[0]?.price, priceId: filled[0]?.priceId });
show("  money:", estimatorRowMoney(filled[0]!, null));
show("  forApi:", estimatorItemForApi(filled[0]!));
show("  totals:", estimatorTotals(filled, null));

/* C: DEACTIVATED service must not be priced in. */
const off = [{ id: "svc-off", title: "Лечение кариеса", category: "therapy", basePriceRub: 3200, active: false }];
const offRows = reconcileAutoSuggestions([], [{ toothNumber: 11, state: "Caries" }], off).items;
console.log("=== C. DEACTIVATED SERVICE ===");
show("  row:", { price: offRows[0]?.price, priceId: offRows[0]?.priceId, issue: offRows[0]?.issue?.kind });

/* D: the candidates[0] regression — «Консультация» first in therapy. */
const amb = [
	{ id: "svc-consult", title: "Консультация", category: "therapy", basePriceRub: 700, active: true },
	{ id: "svc-caries2", title: "Лечение кариеса глубокого", category: "therapy", basePriceRub: 4100, active: true },
];
const ambRows = reconcileAutoSuggestions([], [{ toothNumber: 11, state: "Caries" }], amb).items;
console.log("=== D. «Консультация» FIRST IN CATEGORY ===");
show("  row:", { name: ambRows[0]?.name, price: ambRows[0]?.price, priceId: ambRows[0]?.priceId });

/* E: keyword over-match — «хирург» must not bill an extraction as a guide. */
const surg = [{ id: "svc-ext", title: "Удаление зуба хирургическое", category: "surgery", basePriceRub: 3500, active: true }];
const surgRows = reconcileAutoSuggestions([], [{ toothNumber: 16, state: "Planned_Implant" }], surg).items;
console.log("=== E. «хирург» OVER-MATCH ===");
for (const r of surgRows) show("  row:", { name: r.name, price: r.price, priceId: r.priceId });

/* F: float-money proof with a DIFFERENT method than their suite. */
const three = [300.01, 300.05, 300.07].map((p, i) => reconcileAutoSuggestions([], [{ toothNumber: 11 + i, state: "Caries" }],
	[{ id: "s" + i, title: "Лечение кариеса", category: "therapy", basePriceRub: p, active: true }]).items[0]!);
console.log("=== F. FLOAT vs KOPECK ===");
console.log("  naive float sum:", 300.01 + 300.05 + 300.07);
show("  estimatorTotals:", estimatorTotals(three, null));
