import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type PatientClinicalSafetyProfile,
	formatSafetyProfileToDiaryText,
	parseSafetyProfileFromText,
} from "../safetyMath.js";

describe("2. formatSafetyProfileToDiaryText & parseSafetyProfileFromText", () => {
	it("2.1. formatSafetyProfileToDiaryText generates legal 043/u text with NSAID ban and Paracetamol recommendation", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasNsaidAllergy: true,
		};

		const text = formatSafetyProfileToDiaryText(profile);
		assert.ok(text.includes("Аллергологический анамнез: Отягощен"));
		assert.ok(
			text.includes("АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)"),
		);
	});

	it("2.2. formatSafetyProfileToDiaryText formats combined penicillin + nsaid + latex allergy cleanly", () => {
		const profile: Partial<PatientClinicalSafetyProfile> = {
			pregnancyTrimester: "none",
			hasPenicillinAllergy: true,
			hasNsaidAllergy: true,
			hasLatexAllergy: true,
		};

		const text = formatSafetyProfileToDiaryText(profile);
		assert.ok(text.includes("Пенициллины (Амоксиклав)"));
		assert.ok(text.includes("Латекс"));
		assert.ok(
			text.includes("АЛЛЕРГИЯ: НПВП (Аспирин, Кеторол, Ибупрофен — противопоказаны, препарат выбора: Парацетамол)"),
		);
	});

	it("2.3. parseSafetyProfileFromText detects NSAID keywords in unstructured text", () => {
		const sample1 = "Пациент сообщает об аллергии на аспирин и кеторол, также не переносит нурофен";
		const profile1 = parseSafetyProfileFromText(sample1);
		assert.strictEqual(profile1.hasNsaidAllergy, true);

		const sample2 = "В анамнезе аспириновая астма и непереносимость НПВП";
		const profile2 = parseSafetyProfileFromText(sample2);
		assert.strictEqual(profile2.hasNsaidAllergy, true);

		const sample3 = "Аллергия на диклофенак, нимесулид и кетонал";
		const profile3 = parseSafetyProfileFromText(sample3);
		assert.strictEqual(profile3.hasNsaidAllergy, true);

		const sampleClean = "Соматически здоров, аллергий нет";
		const profileClean = parseSafetyProfileFromText(sampleClean);
		assert.strictEqual(profileClean.hasNsaidAllergy, false);
	});
});
