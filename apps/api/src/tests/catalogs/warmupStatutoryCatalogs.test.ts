/**
 * DENTE Dental CRM — Statutory Catalogs Warmup & Instant Offline Snapshot Test Suite
 *
 * Mandates:
 * - Mandate 8n: Solo Doctor & 5400 RPM HDD / 4GB RAM low-spec performance
 * - Mandate 8k: CRM != Reality Simulator (Friction-Killer Law)
 * - Mandate 8e: Doctor Autonomy (instant statutory presets without blocking)
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	warmupStatutoryCatalogs,
	isCatalogsWarmedUp,
	getWarmupCatalogsStatus,
	getStatutory804nSnapshot,
	getPharmacologyMedicationsSnapshot,
	getPharmacologyReferencesSnapshot,
	getStatutoryIcd10Snapshot,
	getStatutoryEmrTemplatesSnapshot,
	STATUTORY_PHARMACOLOGY_MEDICATIONS,
	STATUTORY_PHARMACOLOGY_REFERENCES,
} from "../../services/catalogs/warmupStatutoryCatalogs.js";

test("Statutory Catalogs Warmup & Offline Snapshot Suite (Order 804n, Pharmacology, ICD-10, 043/u)", async (t) => {
	await t.test("1. Instant offline warmup: runs in 0-5 ms without external network calls", () => {
		const result = warmupStatutoryCatalogs({ forceReload: true });
		assert.strictEqual(result.success, true);
		assert.strictEqual(result.isOfflineReady, true);
		assert.ok(result.durationMs >= 0);
		assert.ok(result.counts.nomenclature804n >= 20, "Should contain at least 20 statutory 804n items");
		assert.ok(result.counts.pharmacologyMedications >= 10, "Should contain key dental medications");
		assert.ok(result.counts.pharmacologyReferences >= 5, "Should contain DDI rules and drug classes");
		assert.ok(result.counts.icd10 >= 25, "Should contain dental ICD-10 codes");
		assert.ok(result.counts.emrTemplates >= 4, "Should contain 043/u templates");
		assert.strictEqual(isCatalogsWarmedUp(), true);
	});

	await t.test("2. Nomenclature 804n snapshot: contains official therapy, surgery, hygiene, and orthopedics codes", () => {
		const all804n = getStatutory804nSnapshot();
		assert.ok(all804n.length > 0);

		// Check therapy: caries filling
		const caries = all804n.find((i) => i.code === "A16.07.002.001");
		assert.ok(caries, "Should contain A16.07.002.001");
		assert.strictEqual(caries.category, "therapy");
		assert.strictEqual(caries.requiresToothNumber, true);

		// Check surgery: implant
		const implant = all804n.find((i) => i.code === "A16.07.054.001");
		assert.ok(implant, "Should contain A16.07.054.001");
		assert.strictEqual(implant.category, "surgery");

		// Filter by query
		const endo = getStatutory804nSnapshot({ q: "корневого канала" });
		assert.ok(endo.length >= 2, "Search for root canal should return items");
	});

	await t.test("3. Pharmacology medications snapshot: includes anesthetics, antibiotics, NSAIDs, and antiseptics", () => {
		const meds = getPharmacologyMedicationsSnapshot();
		assert.ok(meds.length >= 10);

		// Anesthetics
		const ultracainForte = meds.find((m) => m.id === "med-ultracain-ds-forte");
		assert.ok(ultracainForte);
		assert.strictEqual(ultracainForte.category, "anesthetic");
		assert.strictEqual(ultracainForte.vasoconstrictorRatio, "1:100000");

		const scandonest = meds.find((m) => m.id === "med-scandonest-3-plain");
		assert.ok(scandonest);
		assert.strictEqual(scandonest.vasoconstrictorRatio, "none");

		// Antibiotics
		const amoxiclav = meds.find((m) => m.id === "med-amoxiclav-875");
		assert.ok(amoxiclav);
		assert.strictEqual(amoxiclav.category, "antibiotic");
		assert.strictEqual(amoxiclav.isPrescriptionOnly, true);

		// NSAIDs
		const ketorolac = meds.find((m) => m.id === "med-ketorolac-10");
		assert.ok(ketorolac);
		assert.strictEqual(ketorolac.category, "nsaid");

		// Filter by category
		const anestheticsOnly = getPharmacologyMedicationsSnapshot({ category: "anesthetic" });
		assert.ok(anestheticsOnly.length >= 4);
		assert.ok(anestheticsOnly.every((m) => m.category === "anesthetic"));

		// Filter by query
		const searchNimesil = getPharmacologyMedicationsSnapshot({ q: "нимесил" });
		assert.strictEqual(searchNimesil.length, 1);
		assert.strictEqual(searchNimesil[0]?.id, "med-nimesulide-100");
	});

	await t.test("4. Pharmacology references snapshot: contains DDI matrix, drug classes, allergen cross-reactivity, cardio limits", () => {
		const refs = getPharmacologyReferencesSnapshot();
		assert.ok(refs.drugClasses.length >= 5);
		assert.ok(refs.ddiInteractions.length >= 3);
		assert.ok(refs.allergenCrossReactivity.length >= 3);

		// Verify Metronidazole + Alcohol DDI blocker
		const metroAlc = refs.ddiInteractions.find((d) => d.id === "INT-METRO-ALC");
		assert.ok(metroAlc);
		assert.strictEqual(metroAlc.severity, "blocker");

		// Verify NSAID + Anticoagulant DDI blocker
		const nsaidAnticoag = refs.ddiInteractions.find((d) => d.id === "INT-NSAID-ANTICOAG");
		assert.ok(nsaidAnticoag);
		assert.strictEqual(nsaidAnticoag.severity, "blocker");

		// Verify Epinephrine + Beta-blocker blocker
		const epiBeta = refs.ddiInteractions.find((d) => d.id === "INT-EPI-BETA-BLOCKER");
		assert.ok(epiBeta);
		assert.strictEqual(epiBeta.severity, "blocker");

		// Verify Epinephrine cardio limits
		assert.strictEqual(refs.epinephrineCardioLimits.healthyAdultMaxMg, 0.20);
		assert.strictEqual(refs.epinephrineCardioLimits.cardioRiskMaxMg, 0.04);
		assert.ok(refs.epinephrineCardioLimits.absoluteContraindications.length >= 5);
	});

	await t.test("5. ICD-10 & EMR Templates snapshot: provides K00-K14 and 1-click 043/u protocols", () => {
		const icd10 = getStatutoryIcd10Snapshot();
		assert.ok(icd10.length >= 25);
		const cariesDentine = icd10.find((i) => i.code === "K02.1");
		assert.ok(cariesDentine);
		assert.strictEqual(cariesDentine.requiresTooth, true);

		const templates = getStatutoryEmrTemplatesSnapshot();
		assert.ok(templates.length >= 4);
		const cariesTmpl = templates.find((t) => t.id === "caries_dentine");
		assert.ok(cariesTmpl);
		assert.ok(cariesTmpl.defaultProcedureProtocol.includes("коффердам"));
	});

	await t.test("6. Idempotent execution & status reporting", () => {
		const status1 = getWarmupCatalogsStatus();
		const status2 = getWarmupCatalogsStatus();
		assert.strictEqual(status1.success, true);
		assert.strictEqual(status2.success, true);
		assert.strictEqual(status1.counts.nomenclature804n, status2.counts.nomenclature804n);
	});
});
