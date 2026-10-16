import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DENTAL_14_DOSAGE_FORMS,
	DENTAL_1CLICK_RX_SETS,
	DENTAL_TOP56_MEDICATIONS,
	formatPrescriptionSignature,
	getDentalMedicationById,
	getDentalMedicationsByCategory,
	type DentalMedicationForm,
} from "../clinical/prescriptionCatalog.js";

describe("Prescription Catalog & 1-Click Rx Sets (Top-56 Dental Formulary)", () => {
	it("contains top dental medications", () => {
		assert.ok(
			DENTAL_TOP56_MEDICATIONS.length >= 56,
			`Expected at least 56 medications, received ${DENTAL_TOP56_MEDICATIONS.length}`,
		);
	});

	it("has 100% unique IDs with zero collisions", () => {
		const ids = new Set<string>();
		for (const med of DENTAL_TOP56_MEDICATIONS) {
			assert.ok(
				!ids.has(med.id),
				`Duplicate medication ID detected: ${med.id}`,
			);
			ids.add(med.id);
		}
		assert.equal(ids.size, DENTAL_TOP56_MEDICATIONS.length);
	});

	it("covers all major dental pharmacological groups", () => {
		const categories = new Set(DENTAL_TOP56_MEDICATIONS.map((m) => m.category));
		assert.ok(categories.has("antibiotic"), "Must contain antibiotics");
		assert.ok(categories.has("nsaid"), "Must contain NSAIDs");
		assert.ok(categories.has("antiseptic"), "Must contain antiseptics");
		assert.ok(categories.has("topical_dental"), "Must contain dental gels/pastes");
		assert.ok(categories.has("antihistamine"), "Must contain antihistamines");
		assert.ok(categories.has("anesthetic"), "Must contain local anesthetics");
		assert.ok(categories.has("emergency"), "Must contain emergency kit");
		assert.ok(categories.has("corticosteroid"), "Must contain corticosteroids");
		assert.ok(categories.has("gastroprotective"), "Must contain gastroprotective/probiotics");
	});

	it("contains all critical Russian clinical dental staples", () => {
		const requiredTradeNames = [
			"Амоксиклав",
			"Цифран СТ",
			"Линкомицин",
			"Кларитромицин",
			"Нимесил",
			"Найз",
			"Кеторол",
			"Ибупрофен",
			"Дексалгин",
			"Хлоргексидина биглюконат",
			"Мирамистин",
			"Фурацилин",
			"Ротокан",
			"Стоматофит",
			"Холисал",
			"Метрогил Дента",
			"Солкосерил",
			"Асепта",
			"Супрастин",
			"Зодак",
			"Эриус",
		];

		for (const name of requiredTradeNames) {
			const found = DENTAL_TOP56_MEDICATIONS.some((m) =>
				m.tradeNameRu.toLowerCase().includes(name.toLowerCase()),
			);
			assert.ok(found, `Expected clinical staple '${name}' to be present in catalog`);
		}
	});

	it("defines exactly 14 official dosage forms with Latin patterns", () => {
		assert.equal(DENTAL_14_DOSAGE_FORMS.length, 14);
		const formCodes = new Set<DentalMedicationForm>(DENTAL_14_DOSAGE_FORMS.map((f) => f.code));

		const expectedForms: DentalMedicationForm[] = [
			"tablets",
			"tablets_coated",
			"tablets_dispersible",
			"capsules",
			"sachet_granules",
			"solution_oral_topical",
			"solution_injection",
			"dental_gel",
			"dental_paste",
			"ointment",
			"spray",
			"suspension",
			"varnish",
			"drops",
		];

		for (const expected of expectedForms) {
			assert.ok(formCodes.has(expected), `Missing dosage form: ${expected}`);
		}

		for (const meta of DENTAL_14_DOSAGE_FORMS) {
			assert.ok(meta.nameRu.length > 0);
			assert.ok(meta.nameLatin.length > 0);
			assert.ok(meta.latinAbbr.length > 0);
			assert.ok(meta.dispensePatternLatin.includes("D.t.d."));
			assert.ok(meta.defaultUnitRu.length > 0);
		}
	});

	it("validates all 5 1-click Rx sets and their component drugs", () => {
		assert.ok(DENTAL_1CLICK_RX_SETS.length >= 5);

		for (const set of DENTAL_1CLICK_RX_SETS) {
			assert.ok(set.id.length > 0);
			assert.ok(set.titleRu.length > 0);
			assert.ok(set.clinicalIndicationRu.length > 0);
			assert.ok(set.drugIds.length >= 1, `Rx set ${set.id} must have >= 1 drugs`);
			assert.ok(set.durationDays > 0);

			for (const drugId of set.drugIds) {
				const med = getDentalMedicationById(drugId);
				assert.ok(
					med,
					`Rx set '${set.titleRu}' references unknown drugId: '${drugId}'`,
				);
			}
		}

		// Verify specific required sets:
		const implantSet = DENTAL_1CLICK_RX_SETS.find((s) => s.code === "POST_OP_IMPLANT");
		assert.ok(implantSet, "Must include POST_OP_IMPLANT preset");
		assert.ok(implantSet.drugIds.includes("amoxiclav_875_125"));
		assert.ok(implantSet.drugIds.includes("nimesil_100_sachet"));
		assert.ok(implantSet.drugIds.includes("chlorhexidine_005_sol"));

		const pericoronitisSet = DENTAL_1CLICK_RX_SETS.find((s) => s.code === "PERICORONITIS_PERIODONTITIS");
		assert.ok(pericoronitisSet, "Must include PERICORONITIS_PERIODONTITIS preset");
		assert.ok(pericoronitisSet.drugIds.includes("cyfran_st_500_600"));
		assert.ok(pericoronitisSet.drugIds.includes("cholisal_10_gel"));

		const stomatitisSet = DENTAL_1CLICK_RX_SETS.find((s) => s.code === "STOMATITIS_GINGIVITIS");
		assert.ok(stomatitisSet, "Must include STOMATITIS_GINGIVITIS preset");
		assert.ok(stomatitisSet.drugIds.includes("cholisal_10_gel"));
		assert.ok(stomatitisSet.drugIds.includes("miramistin_001_sol"));
	});

	it("generates statutory Order 1094n Latin prescription signatures", () => {
		const amox = getDentalMedicationById("amoxiclav_875_125");
		assert.ok(amox);

		const signature = formatPrescriptionSignature(amox, { count: 14 });
		assert.ok(signature.latinRp.startsWith("Rp.: Amoxicillini + Acidi clavulanici 875 мг + 125 мг"));
		assert.equal(signature.dispenseLatin, "D.t.d. N 14 in tab.");
		assert.ok(signature.signaRu.startsWith("S. Внутрь"));

		const nimesil = getDentalMedicationById("nimesil_100_sachet");
		assert.ok(nimesil);
		const nimesilSig = formatPrescriptionSignature(nimesil, { count: 9 });
		assert.equal(nimesilSig.dispenseLatin, "D.t.d. N 9 in gran.");

		const cholisal = getDentalMedicationById("cholisal_10_gel");
		assert.ok(cholisal);
		const cholisalSig = formatPrescriptionSignature(cholisal, { count: 1 });
		assert.equal(cholisalSig.dispenseLatin, "D.t.d. N 1 in tuba");
	});

	it("filters medications by category correctly", () => {
		const antibiotics = getDentalMedicationsByCategory("antibiotic");
		assert.ok(antibiotics.length >= 14);

		const nsaids = getDentalMedicationsByCategory("nsaid");
		assert.ok(nsaids.length >= 14);

		const topicals = getDentalMedicationsByCategory("topical_dental");
		assert.ok(topicals.length >= 6);
	});
});
