import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	EXPRESS_PRESET_ZIRCONIA_CROWN,
	EXPRESS_PRESET_PMMA_TEMPORARY,
	EXPRESS_PRESET_PFM_DUCERAM,
	EXPRESS_PRESET_IMPLANT_SCREW_RETAINED,
	CANONICAL_EXPRESS_LAB_PRESETS,
	EXPRESS_LAB_PRESETS,
} from "../labMath";
import {
	checkDentalLabFinancialGate,
	createDoctorClinicalOverride,
} from "../dentalLabFinancialGateEngine";
import { rublesToKopecks } from "@dental/shared";
describe("DentalLabOrderModal — 4 Canonical 1-Click Prosthetics Presets (Mandates 8e, 8k)", () => {
	test("Пресет 1: «Циркониевая коронка на свой зуб (Prettau / Katana) — стандарт» (5 дней, 24 000 ₽ / 7 500 ₽)", () => {
		const p = EXPRESS_PRESET_ZIRCONIA_CROWN;
		assert.equal(p.materialId, "zirconia_multilayer");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 30);
		assert.equal(p.contactTightness, "normal");
		assert.equal(p.occlusalScheme, "mutually_protected");
		assert.equal(p.surfaceTexture, "natural_anatomy");
		assert.equal(p.impressionType, "a_silicone");
		assert.equal(p.workingDays, 5);
		assert.equal(p.priceRub, 24000);
		assert.equal(p.labCostRub, 7500);
	});
	test("Пресет 2: «Временная фрезерованная коронка PMMA (1 клик)» (2 дня, 3 500 ₽ / 1 200 ₽)", () => {
		const p = EXPRESS_PRESET_PMMA_TEMPORARY;
		assert.equal(p.materialId, "pmma_temporary");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 40);
		assert.equal(p.contactTightness, "normal");
		assert.equal(p.workingDays, 2);
		assert.equal(p.priceRub, 3500);
		assert.equal(p.labCostRub, 1200);
	});
	test("Пресет 3: «Металлокерамическая коронка (Duceram Plus) — классика» (7 дней, 15 000 ₽ / 5 000 ₽)", () => {
		const p = EXPRESS_PRESET_PFM_DUCERAM;
		assert.equal(p.materialId, "pfm_cocr");
		assert.equal(p.constructionType, "single_crown");
		assert.equal(p.colorVita, "A2");
		assert.equal(p.cementGapMicrons, 40);
		assert.equal(p.contactTightness, "normal");
		assert.equal(p.workingDays, 7);
		assert.equal(p.priceRub, 15000);
		assert.equal(p.labCostRub, 5000);
	});
	test("Пресет 4: «Коронка на имплантате с винтовой фиксацией (Multi-unit / титановое основание)» (7 дней, 38 000 ₽ / 13 000 ₽)", () => {
		const p = EXPRESS_PRESET_IMPLANT_SCREW_RETAINED;
		assert.equal(p.materialId, "titanium_custom_abutment");
		assert.equal(p.constructionType, "implant_abutment");
		assert.equal(p.cementGapMicrons, 30);
		assert.equal(p.workingDays, 7);
		assert.equal(p.priceRub, 38000);
		assert.equal(p.labCostRub, 13000);
		assert.ok(p.abutmentType?.includes("Ti-Base"));
	});
	test("CANONICAL_EXPRESS_LAB_PRESETS и EXPRESS_LAB_PRESETS содержат все 4 пресета первыми в списке", () => {
		const canonicalIds = CANONICAL_EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.equal(canonicalIds[0], "zirconia_crown_express");
		assert.equal(canonicalIds[1], "pmma_temporary_express");
		assert.equal(canonicalIds[2], "pfm_duceram_express");
		assert.equal(canonicalIds[3], "implant_screw_retained_express");
		const expressIds = EXPRESS_LAB_PRESETS.map((p) => p.id);
		assert.ok(expressIds.includes("zirconia_crown_express"));
		assert.ok(expressIds.includes("pmma_temporary_express"));
		assert.ok(expressIds.includes("pfm_duceram_express"));
		assert.ok(expressIds.includes("implant_screw_retained_express"));
	});
});
describe("DentalLabOrderModal — Doctor Autonomy & Mandates 8e, 8n (No Block on 30-Day Expired Plans)", () => {
	test("Мандат 8e п. 7: Истечение 30 дней плана лечения НЕ БЛОКИРУЕТ создание и отправку нарядов ЗТЛ", () => {
		const resExpired = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(24000),
			paidKopecks: rublesToKopecks(24000),
			treatmentPlanAgeDays: 45,
			isPlanExpired: true,
		});
		assert.equal(resExpired.isGatePassed, true);
		assert.ok(resExpired.isPlanExpiredNotice);
		assert.ok(resExpired.isPlanExpiredNotice.includes("НЕ БЛОКИРУЕТ"));
	});
	test("Мандат 8e & 8n: Лечащий врач вправе отправить наряд под свою клиническую ответственность без мастер-паролей начмеда", () => {
		const blockedRes = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(38000),
			paidKopecks: rublesToKopecks(0),
		});
		assert.equal(blockedRes.isGatePassed, false);
		const doctorOverride = createDoctorClinicalOverride(
			"Др. Сидоров А. П.",
			"Срочное изготовление временного моста перед командировкой пациента",
		);
		assert.equal(doctorOverride.authorized, true);
		assert.equal(doctorOverride.doctorName, "Др. Сидоров А. П.");
		const clearedWithOverride = checkDentalLabFinancialGate({
			stageTotalKopecks: rublesToKopecks(38000),
			paidKopecks: rublesToKopecks(0),
			doctorOverride,
		});
		assert.equal(clearedWithOverride.isGatePassed, true);
		assert.equal(clearedWithOverride.gateStatus, "DOCTOR_OVERRIDE");
		assert.equal(clearedWithOverride.overrideMeta?.doctorName, "Др. Сидоров А. П.");
	});
});
