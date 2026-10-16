import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	DENTAL_CANONICAL_SSOT_MEDICATIONS,
	DENTAL_DRUG_ID_ALIASES,
	getDentalSsotMedicationById,
	getDentalSsotMedicationsByCategory,
	searchDentalSsotMedications,
	checkMedicationSafetyContraindications,
	formatPrescriptionSignatureSsot,
	type DentalSsotMedicationItem,
} from "../clinical/prescriptionCatalogSsot.js";
import { getDentalMedicationById } from "../clinical/prescriptionCatalog.js";

describe("Dental Prescription & Rx Formulary SSOT Engine", () => {
	it("contains all 18 canonical outpatient dental medications with unique IDs", () => {
		assert.equal(DENTAL_CANONICAL_SSOT_MEDICATIONS.length, 18);
		const ids = new Set<string>();
		for (const med of DENTAL_CANONICAL_SSOT_MEDICATIONS) {
			assert.ok(med.id, "Drug must have an id");
			assert.ok(!ids.has(med.id), `Duplicate ID detected: ${med.id}`);
			ids.add(med.id);
		}
	});

	it("covers all 5 essential dental outpatient groups + gastroprotection", () => {
		const categories = new Set(DENTAL_CANONICAL_SSOT_MEDICATIONS.map((m) => m.category));
		assert.ok(categories.has("antibiotic"), "Must contain antibiotics");
		assert.ok(categories.has("nsaid"), "Must contain analgesics / NSAIDs");
		assert.ok(categories.has("antiseptic"), "Must contain antiseptics & rinses");
		assert.ok(categories.has("antihistamine"), "Must contain antihistamines");
		assert.ok(categories.has("topical_dental"), "Must contain wound healing / topical gels");
		assert.ok(categories.has("gastroprotective"), "Must contain gastroprotection (omeprazole)");

		const abx = getDentalSsotMedicationsByCategory("antibiotic");
		assert.equal(abx.length, 5, "5 essential dental antibiotics expected");
		const nsaids = getDentalSsotMedicationsByCategory("nsaid");
		assert.equal(nsaids.length, 4, "4 essential dental NSAIDs expected (including pediatric suspension)");
		const antiseptics = getDentalSsotMedicationsByCategory("antiseptic");
		assert.equal(antiseptics.length, 3, "3 essential rinses expected");
		const antihistamines = getDentalSsotMedicationsByCategory("antihistamine");
		assert.equal(antihistamines.length, 2, "2 essential antihistamines expected");
		const topicals = getDentalSsotMedicationsByCategory("topical_dental");
		assert.equal(topicals.length, 3, "3 topical dental gels expected");
		const gastro = getDentalSsotMedicationsByCategory("gastroprotective");
		assert.equal(gastro.length, 1, "1 gastroprotection drug expected");
	});

	it("enforces statutory Order 1094n Latin signatures and Russian instructions", () => {
		for (const med of DENTAL_CANONICAL_SSOT_MEDICATIONS) {
			// Latin prescription header Rp.:
			assert.ok(
				med.latinRp.startsWith("Rp.:"),
				`Medication ${med.id} latinRp must start with 'Rp.:', got: ${med.latinRp}`,
			);
			// Dispense instruction D.t.d. or D.S.
			assert.ok(
				med.dispenseLatin.startsWith("D.t.d.") || med.dispenseLatin.startsWith("D.S."),
				`Medication ${med.id} dispenseLatin must start with 'D.t.d.' or 'D.S.', got: ${med.dispenseLatin}`,
			);
			// Signa instruction S.
			assert.ok(
				med.signaRu.startsWith("S."),
				`Medication ${med.id} signaRu must start with 'S.', got: ${med.signaRu}`,
			);
			// Adult and pediatric dosage rules
			assert.ok(med.adultDosageRu.length > 5, `Medication ${med.id} missing adult dosage`);
			assert.ok(med.pediatricDosageRu.length > 5, `Medication ${med.id} missing pediatric dosage`);
			assert.ok(med.courseDaysRu.length > 0, `Medication ${med.id} missing course duration`);
			// Clinical safety data
			assert.ok(med.contraindicationsRu.length > 0, `Medication ${med.id} missing contraindications`);
			assert.ok(med.criticalIncompatibilitiesRu.length > 0, `Medication ${med.id} missing incompatibilities`);
		}
	});

	it("resolves legacy and shorthand drug ID aliases transparently", () => {
		// Shorthand aliases to SSOT IDs
		assert.equal(getDentalSsotMedicationById("nimesulide_100")?.id, "nimesil_100_sachet");
		assert.equal(getDentalSsotMedicationById("ibuprofen_400")?.id, "ibuprofen_400_tab");
		assert.equal(getDentalSsotMedicationById("ketorolac_10")?.id, "ketorol_10_tab");
		assert.equal(getDentalSsotMedicationById("cholisal_gel")?.id, "cholisal_10_gel");
		assert.equal(getDentalSsotMedicationById("metrogyl_denta")?.id, "metrogyl_denta_20_gel");
		assert.equal(getDentalSsotMedicationById("metrogyl_denta_gel")?.id, "metrogyl_denta_20_gel");
		assert.equal(getDentalSsotMedicationById("miramistin_001")?.id, "miramistin_001_sol");
		assert.equal(getDentalSsotMedicationById("chlorhexidine_005")?.id, "chlorhexidine_005_sol");

		// Facade alias lookup
		const facadeResolved = getDentalMedicationById("nimesulide_100");
		assert.ok(facadeResolved);
		assert.equal(facadeResolved?.id, "nimesil_100_sachet");
	});

	it("accurately detects patient contraindications and severe drug conflicts", () => {
		// Amoxiclav + penicillin allergy
		const abxConflict = checkMedicationSafetyContraindications("amoxiclav_875_125", [
			"Пенициллины",
			"Сахарный диабет",
		]);
		assert.equal(abxConflict.hasConflict, true);
		assert.ok(abxConflict.warnings.some((w) => w.toLowerCase().includes("пенициллин")));

		// Cifran ST + QT prolongation
		const cifranConflict = checkMedicationSafetyContraindications("cifran_st_tab", [
			"удлинение интервала QT",
		]);
		assert.equal(cifranConflict.hasConflict, true);
		assert.ok(cifranConflict.warnings.some((w) => w.toLowerCase().includes("удлинение интервала qt")));

		// Nimesil + peptic ulcer
		const nimesilConflict = checkMedicationSafetyContraindications("nimesil_100_sachet", [
			"язвенная болезнь желудка",
		]);
		assert.equal(nimesilConflict.hasConflict, true);
		assert.ok(nimesilConflict.warnings.some((w) => w.toLowerCase().includes("язв")));

		// Safe patient scenario
		const safeCheck = checkMedicationSafetyContraindications("chlorhexidine_005_sol", [
			"Сахарный диабет 2 типа",
		]);
		assert.equal(safeCheck.hasConflict, false);
		assert.equal(safeCheck.warnings.length, 0);
	});

	it("supports search across trade name, active substance, INN Latin, and prescription header", () => {
		const searchNimesil = searchDentalSsotMedications("Нимесил");
		assert.ok(searchNimesil.length >= 1);
		assert.equal(searchNimesil[0]?.id, "nimesil_100_sachet");

		const searchLatin = searchDentalSsotMedications("Amoxicillini");
		assert.ok(searchLatin.length >= 1);
		assert.equal(searchLatin[0]?.id, "amoxiclav_875_125");

		const searchCategory = searchDentalSsotMedications("Антибактериальные");
		assert.ok(searchCategory.length >= 5);
	});

	it("formats statutory prescription signatures according to Order 1094n", () => {
		const item = getDentalSsotMedicationById("amoxiclav_875_125")!;
		assert.ok(item);
		const formatted = formatPrescriptionSignatureSsot(item, { count: 28 });
		assert.equal(formatted.latinRp, "Rp.: Amoxicillini 875 mg + Acidi clavulanici 125 mg");
		assert.ok(formatted.dispenseLatin.includes("D.t.d."));
		assert.ok(formatted.signaRu.startsWith("S. Внутрь по 1 таблетке"));

		const customFormatted = formatPrescriptionSignatureSsot(item, {
			customSigna: "S. По 1 таб. строго после еды 5 дней.",
		});
		assert.equal(customFormatted.signaRu, "S. По 1 таб. строго после еды 5 дней.");
	});
});
