import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	InformedConsentTemplateEngine,
	type ConsentData,
} from "./InformedConsentTemplateEngine.js";

describe("InformedConsentTemplateEngine — Feature #246 Multi-Language IDS Generator", () => {
	const data: ConsentData = {
		patientFullName: "Иван Иванов",
		patientDob: "1990-01-01",
		toothNumbers: ["16", "17"],
		plannedMaterials: ["Имплантаты Straumann SLActive"],
		risks: ["Отек мягких тканей", "Временная парестезия"],
	};

	test("1. Generates Russian 1051n compliant consent", () => {
		const ruConsent = InformedConsentTemplateEngine.generate("implant", "ru", data);
		assert.ok(ruConsent.includes("Иван Иванов"));
		assert.ok(ruConsent.includes("Информированное добровольное согласие на имплантацию"));
		assert.ok(ruConsent.includes("Отек мягких тканей"));
	});

	test("2. Generates English consent for medical tourism", () => {
		const enConsent = InformedConsentTemplateEngine.generate("implant", "en", data);
		assert.ok(enConsent.includes("Informed Consent for Dental Implantation"));
		assert.ok(enConsent.includes("Иван Иванов"));
	});
});
