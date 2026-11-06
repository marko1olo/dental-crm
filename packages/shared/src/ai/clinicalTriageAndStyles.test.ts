/**
 * @file packages/shared/src/ai/clinicalTriageAndStyles.test.ts
 * @description Unit test suite for 7-Gates Clinical Triage, doctor communication styles,
 * phonetic brand resolvers, withdrawn drug blacklist, and output sanitization.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	evaluateClinicalTriage,
	sanitizeClinicalAiOutput,
	resolvePhoneticBrand,
	checkWithdrawnOrToxicPractice,
	STYLE_PROMPTS,
	REACTION_TO_CRITIQUE_DIRECTIVE,
	WITHDRAWN_DRUGS_AND_PRACTICES,
	PHONETIC_BRAND_MAP
} from "./index.js";

describe("7-Gates Clinical Triage Engine (evaluateClinicalTriage)", () => {
	it("Gate 1: correctly rejects empty or 1-character input as invalid_or_empty", () => {
		const resultEmpty = evaluateClinicalTriage("");
		assert.equal(resultEmpty.intentCategory, "invalid_or_empty");
		assert.equal(resultEmpty.urgency, "low");

		const resultShort = evaluateClinicalTriage("?");
		assert.equal(resultShort.intentCategory, "invalid_or_empty");
	});

	it("Gate 2: triggers critical emergency SOS upon anaphylaxis or LAST markers", () => {
		const anaphylaxis = evaluateClinicalTriage("У пациента отек Квинке, падает давление, анафилаксия!");
		assert.equal(anaphylaxis.intentCategory, "emergency_sos");
		assert.equal(anaphylaxis.urgency, "critical_emergency");
		assert.ok(anaphylaxis.suggestedTools.includes("chairside_emergency_rescue"));
		assert.ok(anaphylaxis.primaryActionRecommended.includes("anaphylactic_shock"));

		const lastAccident = evaluateClinicalTriage("Судороги после введения 3 карпул ультракаина, подозрение на LAST синдром");
		assert.equal(lastAccident.intentCategory, "emergency_sos");
		assert.equal(lastAccident.urgency, "critical_emergency");
		assert.ok(lastAccident.primaryActionRecommended.includes("local_anesthetic_toxicity"));

		const hypochlorite = evaluateClinicalTriage("Острая гипохлоритовая авария, NaOCl пошел за апекс!");
		assert.equal(hypochlorite.intentCategory, "emergency_sos");
		assert.ok(hypochlorite.primaryActionRecommended.includes("hypochlorite_accident"));
	});

	it("Gate 3: routes direct CRM mutations with FDI tooth extraction", () => {
		const toothMutation = evaluateClinicalTriage("Поставь 46 кариес дентина медиальная поверхность");
		assert.equal(toothMutation.intentCategory, "crm_mutation");
		assert.equal(toothMutation.detectedToothNumber, 46);
		assert.ok(toothMutation.suggestedTools.includes("update_tooth_status"));
		assert.ok(toothMutation.suggestedTools.includes("generate_form_043_entry"));

		const appointmentMutation = evaluateClinicalTriage("Запиши пациента на завтра в 15:00");
		assert.equal(appointmentMutation.intentCategory, "crm_mutation");
		assert.ok(appointmentMutation.suggestedTools.includes("create_appointment"));
	});

	it("Gate 4: routes material and technological inquiries without 'insufficient data' brush-off", () => {
		const bondInquiry = evaluateClinicalTriage("Пересушил дентин при бонде 5 поколения, как восстановить адгезию?");
		assert.equal(bondInquiry.intentCategory, "material_tech_inquiry");
		assert.equal(bondInquiry.urgency, "medium");
		assert.ok(bondInquiry.primaryActionRecommended.includes("EBM-ответ"));

		const sealerInquiry = evaluateClinicalTriage("Какой торк и конусность выбрать для протейпер голд?");
		assert.equal(sealerInquiry.intentCategory, "material_tech_inquiry");
		assert.equal(sealerInquiry.detectedBrandOrMaterial, "ProTaper (Gold / Next / Universal)");
	});

	it("Gate 5: identifies ambiguity and clinical dilemma requiring Scenario A / Scenario B", () => {
		const dilemma = evaluateClinicalTriage("Сомневаюсь: глубокий кариес или пульпит на 26 зубе, ночные боли сомнительны");
		assert.equal(dilemma.intentCategory, "differential_diagnosis");
		assert.ok(dilemma.primaryActionRecommended.includes("Сценарий А / Сценарий Б"));
		assert.ok(dilemma.suggestedTools.includes("multidisciplinary_concilium"));
	});

	it("Gate 6 & 7: delivers clean general clinical consult for standard queries", () => {
		const consult = evaluateClinicalTriage("Опиши протокол ирригации при апикальном периодонтите");
		assert.equal(consult.intentCategory, "general_clinical_consult");
		assert.equal(consult.urgency, "low");
		assert.equal(consult.gateDecisions.length, 7);
	});
});

describe("Doctor Communication Styles & Directives (StomChat SSOT)", () => {
	it("provides all 3 canonical doctor communication styles", () => {
		assert.ok(STYLE_PROMPTS.colleague_friendly.includes("chairside-стиль опытного коллеги"));
		assert.ok(STYLE_PROMPTS.clinical_dry.includes("сухие клинические факты"));
		assert.ok(STYLE_PROMPTS.humor_cynic.includes("ироничный стоматолог-циник"));
	});

	it("includes reaction to critique and disputed findings directive", () => {
		assert.ok(REACTION_TO_CRITIQUE_DIRECTIVE.includes("РЕАКЦИЯ НА КРИТИКУ"));
		assert.ok(REACTION_TO_CRITIQUE_DIRECTIVE.includes("КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО обижаться"));
		assert.ok(REACTION_TO_CRITIQUE_DIRECTIVE.includes("блик полира"));
	});
});

describe("Phonetic Brand Resolver (resolvePhoneticBrand)", () => {
	it("resolves cyrillic transliterations to original brands and clinical descriptions", () => {
		const occlubrush = resolvePhoneticBrand("купил оклюбраш для финишной полировки");
		assert.ok(occlubrush);
		assert.equal(occlubrush?.originalBrand, "Occlubrush");
		assert.equal(occlubrush?.category, "rotary_brush");

		const paracore = resolvePhoneticBrand("паракёр двойного отверждения для культи");
		assert.ok(paracore);
		assert.equal(paracore?.originalBrand, "ParaCore");

		const reciproc = resolvePhoneticBrand("файлы реципрок блу 25");
		assert.ok(reciproc);
		assert.equal(reciproc?.originalBrand, "Reciproc / Reciproc Blue");

		const biodentine = resolvePhoneticBrand("закрыть перфорацию биодентином");
		assert.ok(biodentine);
		assert.equal(biodentine?.originalBrand, "Biodentine");

		const bioCSealer = resolvePhoneticBrand("бисилер для обтурации каналов");
		assert.ok(bioCSealer);
		assert.ok(bioCSealer?.originalBrand.includes("Bio-C Sealer"));
	});

	it("returns null for non-brand regular text", () => {
		const res = resolvePhoneticBrand("обычный стерильный лоток");
		assert.equal(res, null);
	});
});

describe("Withdrawn Drugs and Toxic Iatrogenic Practices Blacklist", () => {
	it("detects withdrawn Solcoseryl and offers modern EBM alternatives", () => {
		const warning = checkWithdrawnOrToxicPractice("назначить солкосерил дентальную пасту на афту");
		assert.ok(warning);
		assert.equal(warning?.status, "withdrawn_from_market");
		assert.ok(warning?.modernAlternativesRu.some((alt) => alt.includes("Асепта")));
		assert.ok(warning?.modernAlternativesRu.some((alt) => alt.includes("Холисал")));
	});

	it("detects forbidden arsenic (мышьяк) and warns about bone necrosis", () => {
		const warning = checkWithdrawnOrToxicPractice("положить мышьяк на сутки");
		assert.ok(warning);
		assert.equal(warning?.status, "toxic_iatrogenic_forbidden");
		assert.ok(warning?.reasonRu.includes("токсический мышьяковистый периодонтит"));
	});

	it("detects resorcinol-formalin method as toxic and carcinogenic", () => {
		const warning = checkWithdrawnOrToxicPractice("запломбировать резорцин-формалиновой пастой");
		assert.ok(warning);
		assert.equal(warning?.status, "toxic_iatrogenic_forbidden");
		assert.ok(warning?.reasonRu.includes("Цитотоксичен"));
	});

	it("detects leaving tooth open ('открытый зуб') as severe iatrogenic mistake", () => {
		const warning = checkWithdrawnOrToxicPractice("оставить открытый зуб для оттока гноя");
		assert.ok(warning);
		assert.equal(warning?.status, "toxic_iatrogenic_forbidden");
		assert.ok(warning?.reasonRu.includes("вторичному инфицированию"));
	});
});

describe("Clinical AI Output Sanitizer (sanitizeClinicalAiOutput)", () => {
	it("removes judicial verdicts and arbiter labels", () => {
		const raw = "⚖️ EBM-Арбитраж: В данной клинической ситуации надежнее восстановить культю.";
		const sanitized = sanitizeClinicalAiOutput(raw);
		assert.equal(sanitized, "В данной клинической ситуации надежнее восстановить культю.");
	});

	it("purges AI fluff and servile apologies", () => {
		const raw = "Конечно! Рад помочь! Протокол обработки канала: NaOCl 3%. Надеюсь, это помогло!";
		const sanitized = sanitizeClinicalAiOutput(raw);
		assert.equal(sanitized, "Протокол обработки канала: NaOCl 3%.");
	});

	it("replaces bureaucratic jargon with clean clinical language (Mandate 8x)", () => {
		const raw = "Заполнить форма 043/у согласно приказ 804н и пробить по 54-ФЗ.";
		const sanitized = sanitizeClinicalAiOutput(raw);
		assert.ok(sanitized.includes("Медицинская карта приёма"));
		assert.ok(sanitized.includes("Прейскурант"));
		assert.ok(sanitized.includes("Касса"));
		assert.ok(!sanitized.includes("043/у"));
		assert.ok(!sanitized.includes("804н"));
		assert.ok(!sanitized.includes("54-ФЗ"));
	});
});
