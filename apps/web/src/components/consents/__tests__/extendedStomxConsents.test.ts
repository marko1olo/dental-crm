import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONSENT_EGISZ_REFUSAL,
	CONSENT_HEALTH_QUESTIONNAIRE,
	CONSENT_PHOTOPROTOCOL,
	CONSENT_SEDATION,
	CONSENT_TREATMENT_REFUSAL,
	CONSENT_WARRANTY_PASSPORT,
	CONSENT_WARRANTY_POLICY,
	getAllAvailableConsentTemplates,
	getAllConsentTemplates,
	getConsentTemplate,
	renderConsentTemplate,
	TEMPLATE_SHORT_TITLES,
	type ConsentTemplateKey,
} from "../consentTemplates.js";

describe("Extended StomX Statutory & Legal Templates Suite (All 16 Templates)", () => {
	it("returns 9 templates by default for backward compatibility and 16 when extended", () => {
		const standard = getAllConsentTemplates();
		assert.equal(standard.length, 9, "Standard call must return 9 core statutory templates");

		const extended = getAllConsentTemplates(true);
		assert.equal(extended.length, 16, "Extended call must return 16 templates");

		const available = getAllAvailableConsentTemplates();
		assert.equal(available.length, 16, "getAllAvailableConsentTemplates must return 16 templates");
	});

	it("TEMPLATE_SHORT_TITLES covers all 16 template keys with ergonomic titles", () => {
		const all16 = getAllConsentTemplates(true);
		for (const tpl of all16) {
			const shortTitle = TEMPLATE_SHORT_TITLES[tpl.key];
			assert.ok(shortTitle, `TEMPLATE_SHORT_TITLES must contain entry for ${tpl.key}`);
			assert.ok(shortTitle.trim().length > 3, `Short title for ${tpl.key} must be descriptive`);
		}
	});

	it("validates all 7 new legal documents with statutory compliance and zero emojis", () => {
		const newKeys: ConsentTemplateKey[] = [
			"CONSENT_EGISZ_REFUSAL",
			"CONSENT_TREATMENT_REFUSAL",
			"CONSENT_WARRANTY_PASSPORT",
			"CONSENT_WARRANTY_POLICY",
			"CONSENT_SEDATION",
			"CONSENT_PHOTOPROTOCOL",
			"CONSENT_HEALTH_QUESTIONNAIRE",
		];

		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

		for (const key of newKeys) {
			const tpl = getConsentTemplate(key);
			assert.ok(tpl, `Template ${key} must exist via getConsentTemplate`);
			assert.equal(tpl.key, key);
			assert.ok(tpl.code.length >= 5, `Code for ${key} must be valid`);
			assert.ok(tpl.title.length > 10, `Title for ${key} must be non-empty`);
			assert.ok(tpl.subtitle.length > 15, `Subtitle for ${key} must be descriptive`);
			assert.ok(tpl.statutoryBasis.length > 10, `Statutory basis for ${key} must be defined`);
			assert.ok(tpl.sections.length >= 2, `Template ${key} must have >= 2 sections`);

			// Mandate 8d pt 7: Strict zero emojis
			const fullJson = JSON.stringify(tpl);
			assert.ok(!emojiRegex.test(fullJson), `Template ${key} must not contain any cartoon emojis`);
			assert.ok(!fullJson.includes("TODO"), `Template ${key} must not have TODO stubs`);
			assert.ok(!fullJson.includes("FIXME"), `Template ${key} must not have FIXME stubs`);
			assert.ok(!fullJson.includes("заглушк"), `Template ${key} must not contain placeholders`);
		}
	});

	it("renders all 7 new templates with patient context and produces non-empty output", () => {
		const context = {
			patientName: "Сидорова Елена Павловна",
			birthDate: "04.11.1990",
			passport: "4511 № 654321",
			doctorName: "Кузнецов Артем Борисович",
			clinicName: "ООО Стоматологическая клиника ДЕНТЕ",
			clinicAddress: "г. Москва, ул. Арбат, д. 20",
			diagnosisIcd: "K05.3 Хронический пародонтит",
			toothNumbers: "3.6, 3.7",
			date: "29.09.2026",
			snils: "111-222-333 44",
		};

		const newTemplates = [
			CONSENT_EGISZ_REFUSAL,
			CONSENT_TREATMENT_REFUSAL,
			CONSENT_WARRANTY_PASSPORT,
			CONSENT_WARRANTY_POLICY,
			CONSENT_SEDATION,
			CONSENT_PHOTOPROTOCOL,
			CONSENT_HEALTH_QUESTIONNAIRE,
		];

		for (const tpl of newTemplates) {
			const rendered = renderConsentTemplate(tpl, context);
			assert.ok(rendered.fullTextContent.length > 200, `Rendered text for ${tpl.key} must be substantial`);
			assert.ok(rendered.renderedSections.length === tpl.sections.length);

			if (tpl.mandatoryPlaceholders.includes("{{PATIENT_NAME}}")) {
				assert.ok(
					rendered.fullTextContent.includes("Сидорова Елена Павловна"),
					`Rendered text for ${tpl.key} must include patient name`,
				);
			}
			if (tpl.mandatoryPlaceholders.includes("{{CLINIC_NAME}}")) {
				assert.ok(
					rendered.fullTextContent.includes("ООО Стоматологическая клиника ДЕНТЕ"),
					`Rendered text for ${tpl.key} must include clinic name`,
				);
			}
		}
	});

	it("StomX #80 EGISZ refusal protects medical secrecy under 323-FZ art. 13", () => {
		const rendered = renderConsentTemplate(CONSENT_EGISZ_REFUSAL, {
			patientName: "Иванов И.И.",
			snils: "123-456-789 00",
		});
		assert.ok(rendered.fullTextContent.includes("323-ФЗ"));
		assert.ok(rendered.fullTextContent.includes("врачебную тайну") || rendered.fullTextContent.includes("врачебная тайна"));
		assert.ok(rendered.fullTextContent.includes("ЕГИСЗ"));
	});

	it("StomX #54 Warranty passport guarantees clear operational conditions and 6-month checks", () => {
		const rendered = renderConsentTemplate(CONSENT_WARRANTY_PASSPORT, {
			patientName: "Петров П.П.",
			doctorName: "Доктор Д.Д.",
			clinicName: "Клиника ДЕНТЕ",
		});
		assert.ok(rendered.fullTextContent.includes("Закон РФ"));
		assert.ok(rendered.fullTextContent.includes("2300-1"));
		assert.ok(rendered.fullTextContent.includes("6 месяцев"));
	});
});
