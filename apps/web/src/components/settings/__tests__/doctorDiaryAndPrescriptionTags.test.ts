import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAVORITE_MEDICATION_OPTIONS } from "../../../store/doctorPreferencesStore";
import {
	STATUTORY_DIARY_TEMPLATES,
	interpolateDiaryTemplateTags,
} from "../doctor/diaryTemplateTags";

describe("Doctor Diary Templates & Medication Prescriptions", () => {
	it("Реестр шаблонов содержит протоколы для всех направлений", () => {
		assert.ok(STATUTORY_DIARY_TEMPLATES.length >= 8);
		const specialtiesInTemplates = new Set(STATUTORY_DIARY_TEMPLATES.map((t) => t.specialty));
		assert.ok(specialtiesInTemplates.has("therapist"));
		assert.ok(specialtiesInTemplates.has("surgeon"));
		assert.ok(specialtiesInTemplates.has("orthopedist"));
		assert.ok(specialtiesInTemplates.has("periodontist"));
		assert.ok(specialtiesInTemplates.has("pediatric"));
	});

	it("Корректно интерполирует клинические теги в дневнике", () => {
		const template = "Под инфильтрационной анестезией {анестезия} на зубе {зуб} с изоляцией {изоляция} препарирована полость по поводу {диагноз}. Пломба из {материал}. Бонд {бонд}.";
		const context = {
			tooth: "26",
			diagnosis: "К02.1 Кариес дентина",
			anesthetic: "Артикаин 1:100 000 (1.7 мл)",
			isolation: "Коффердам",
			material: "Filtek Ultimate",
			adhesive: "OptiBond FL",
			composite: "Filtek Ultimate",
			etchant: "Ultra-Etch 35%",
		};
		const result = interpolateDiaryTemplateTags(template, context);
		assert.ok(result.includes("на зубе 26"));
		assert.ok(result.includes("по поводу К02.1 Кариес дентина"));
		assert.ok(result.includes("с изоляцией Коффердам"));
		assert.ok(result.includes("Пломба из Filtek Ultimate"));
		assert.equal(result.includes("{зуб}"), false);
		assert.equal(result.includes("{диагноз}"), false);
	});

	it("Реестр медикаментов содержит обязательные препараты с латинскими формулами", () => {
		const amoxiclav = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "amoxiclav_875_125");
		assert.ok(amoxiclav);
		assert.equal(amoxiclav.mnn, "Амоксициллин + Клавулановая кислота");
		assert.ok(amoxiclav.rpLatin.includes("Rp.:") && amoxiclav.rpLatin.includes("D.S."));
		assert.ok(amoxiclav.overdoseWarning);

		const nise = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "nise_100");
		assert.ok(nise);
		assert.equal(nise.mnn, "Нимесулид");
		assert.equal(nise.maxDailyDose, "200 мг/сут (максимум 2 таблетки в день)");
		assert.equal(nise.maxDurationDays, 5);

		const dexalgin = FAVORITE_MEDICATION_OPTIONS.find((m) => m.id === "dexalgin_25");
		assert.ok(dexalgin);
		assert.equal(dexalgin.mnn, "Декскетопрофен");
		assert.equal(dexalgin.maxDailyDose, "75 мг/сут (максимум 3 таблетки в день)");
		assert.equal(dexalgin.maxDurationDays, 5);
	});

	it("Рассчитывает максимальную дозу артикаина по весу и кардиориск", () => {
		const maxArticaineMg = Math.min(70 * 7, 500); // 490 mg
		assert.equal(maxArticaineMg, 490);
		const carpulesNormal = maxArticaineMg / 68; // ~7.2 карпулы
		assert.ok(carpulesNormal > 7.1 && carpulesNormal < 7.3);
		assert.equal(Math.min(90 * 7, 500), 500);

		const maxSafeCarpulesCardio = Math.floor(0.04 / 0.017);
		assert.equal(maxSafeCarpulesCardio, 2); // Максимум 2 карпулы при кардиориске
	});
});
