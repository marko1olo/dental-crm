import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateComprehensiveAnesthesiaSafety as calculateAnesthesiaSafety,
	screenPatientContraindications,
} from "@dental/shared";

/**
 * Somatic Screening & Contraindications (Mandates 8e, 8b <= 120 lines).
 */

describe("shared anesthesia safety — 4. Somatic Screening & Contraindications", () => {
	it("blocks epinephrine for patients taking MAO Inhibitors (ИМАО)", () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 70, takesMaoInhibitors: true },
			"articaine_4_epi_100k",
		);

		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, "mepivacaine_3_plain");
		assert.ok(screening.blockingContraindications.some((b) => b.includes("ингибиторы МАО")));

		const calc = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 1,
			takesMaoInhibitors: true,
		});
		assert.equal(calc.isBlocked, true);
		assert.equal(calc.safetyZone, "overdose_danger");
	});

	it("blocks high-dose epinephrine 1:100k for Tricyclic Antidepressants (ТЦА)", () => {
		const screening100k = screenPatientContraindications(
			{ patientWeightKg: 70, takesTricyclicAntidepressants: true },
			"articaine_4_epi_100k",
		);
		assert.equal(screening100k.isBlocked, true);
		assert.ok(screening100k.blockingContraindications.some((b) => b.includes("трициклические антидепрессанты")));

		const screening200k = screenPatientContraindications(
			{ patientWeightKg: 70, takesTricyclicAntidepressants: true },
			"articaine_4_epi_200k",
		);
		assert.equal(screening200k.isBlocked, false);
		assert.ok(screening200k.warnings.some((w) => w.includes("ТЦА")));
	});

	it("blocks epinephrine for patients with Thyrotoxicosis and Arrhythmias", () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 65, hasThyrotoxicosis: true },
			"articaine_4_epi_100k",
		);
		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, "mepivacaine_3_plain");
		assert.ok(screening.blockingContraindications.some((b) => b.includes("тиреотоксикоз")));

		const arrScreening = screenPatientContraindications(
			{ patientWeightKg: 70, hasCardiacArrhythmia: true },
			"articaine_4_epi_100k",
		);
		assert.equal(arrScreening.isBlocked, true);
		assert.ok(arrScreening.blockingContraindications.some((b) => b.includes("нарушения ритма сердца")));
	});

	it("blocks sulfite-containing anesthetics for Sulfite Allergy & Bronchial Asthma", () => {
		const screening = screenPatientContraindications(
			{ patientWeightKg: 70, hasSulfiteAllergy: true, hasBronchialAsthma: true },
			"articaine_4_epi_100k",
		);
		assert.equal(screening.isBlocked, true);
		assert.equal(screening.recommendedAlternativeId, "mepivacaine_3_plain");
		assert.ok(screening.blockingContraindications.some((b) => b.includes("метабисульфит натрия")));
	});

	it("safely accepts Mepivacaine 3% (Scandonest) for all blocked categories", () => {
		const screening = screenPatientContraindications(
			{
				patientWeightKg: 70,
				takesMaoInhibitors: true,
				hasThyrotoxicosis: true,
				hasSulfiteAllergy: true,
				hasBronchialAsthma: true,
				hasCardiacArrhythmia: true,
			},
			"mepivacaine_3_plain",
		);
		assert.equal(screening.isBlocked, false);
		assert.equal(screening.blockingContraindications.length, 0);

		const calc = calculateAnesthesiaSafety({
			drugId: "mepivacaine_3_plain",
			patientWeightKg: 70,
			carpulesCount: 2,
			takesMaoInhibitors: true,
			hasThyrotoxicosis: true,
			hasSulfiteAllergy: true,
			hasBronchialAsthma: true,
		});
		assert.equal(calc.isBlocked, false);
		assert.equal(calc.safetyZone, "safe");
	});

	it("preserves Doctor Autonomy (Mandate 8e) with objective warnings", () => {
		const res = calculateAnesthesiaSafety({
			drugId: "articaine_4_epi_100k",
			patientWeightKg: 70,
			carpulesCount: 3,
			hasCardiovascularRisk: true,
		});
		assert.equal(res.maxSafeEpinephrineMg, 0.04);
		assert.equal(res.isEpinephrineOverdose, true);
		assert.equal(res.safetyZone, "overdose_danger");
	});
});
