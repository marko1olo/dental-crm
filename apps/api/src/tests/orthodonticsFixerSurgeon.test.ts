import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { generateUuidV7 } from "@dental/shared";
import { parseOrthoData, extractOrthoRecord, calculateNextDate } from "../routes/orthodontics/helpers.js";
import {
	archwireChangePayloadSchema,
	issueAlignerSetSchema,
	stageAdvanceSchema,
	type OrthodonticProgressRecord,
} from "../routes/orthodontics/types.js";
import { ORTHODONTIC_BOM_LINKS } from "@dental/shared";
import { resolveOrthoServicePrice, resolveOrthoMaterialCost } from "../routes/orthodontics/orthoPricelistResolver.js";

describe("Domain 3 Red Team Fixer Surgeon: Orthodontics & Bite Persistence", () => {
	it("1. Парсер и экстрактор орто-прогресса восстанавливают все параметры прикуса (Bite Hydration)", () => {
		const rawProfileData = {
			angleClass: "class_2_div_1",
			verticalBite: "deep",
			overjetMm: 5.5,
			overbitePercent: 60,
			anbAngle: 5.2,
			skeletalClass: "II",
			treatmentPlanId: generateUuidV7(),
			upperArchwire: "CuNiTi 17x25 (ВЧ)",
			lowerArchwire: "CuNiTi 17x25 (НЧ)",
			archwire: "CuNiTi 17x25 (ВЧ) / CuNiTi 17x25 (НЧ)",
			currentStage: 3,
			applianceCategory: "brackets",
			applianceName: "Damon Q2 (Металл, .022)",
		};

		const parsed = parseOrthoData(rawProfileData);
		assert.ok(parsed, "parseOrthoData обязан вернуть объект прогресса");
		assert.equal(parsed.angleClass, "class_2_div_1");
		assert.equal(parsed.verticalBite, "deep");
		assert.equal(parsed.overjetMm, 5.5);
		assert.equal(parsed.overbitePercent, 60);
		assert.equal(parsed.anbAngle, 5.2);
		assert.equal(parsed.skeletalClass, "II");
		assert.equal(parsed.treatmentPlanId, rawProfileData.treatmentPlanId);

		// Проверка алиаса extractOrthoRecord
		const extracted = extractOrthoRecord(rawProfileData);
		assert.deepEqual(extracted, parsed, "extractOrthoRecord обязан быть строго эквивалентен parseOrthoData");
	});

	it("2. Zod-схемы валидируют параметры прикуса и treatmentPlanId", () => {
		const planId = generateUuidV7();

		// archwireChangePayloadSchema
		const validWireChange = archwireChangePayloadSchema.safeParse({
			material: "CuNiTi",
			section: "17x25",
			arch: "both",
			isWireChange: true,
			angleClass: "class_1",
			verticalBite: "normal",
			overjetMm: 2.0,
			overbitePercent: 30,
			anbAngle: 2.5,
			skeletalClass: "I",
			treatmentPlanId: planId,
		});
		assert.ok(validWireChange.success, "Схема смены дуги обязана принимать валидные параметры прикуса");
		assert.equal(validWireChange.data.treatmentPlanId, planId);

		// issueAlignerSetSchema
		const validAlignerSet = issueAlignerSetSchema.safeParse({
			alignerCount: 2,
			wearDaysPerAligner: 14,
			totalAligners: 24,
			angleClass: "class_2_div_2",
			verticalBite: "deep",
			overjetMm: 1.5,
			overbitePercent: 70,
			treatmentPlanId: planId,
		});
		assert.ok(validAlignerSet.success, "Схема выдачи сета элайнеров обязана принимать параметры прикуса");
		assert.equal(validAlignerSet.data.angleClass, "class_2_div_2");

		// stageAdvanceSchema
		const validStageAdvance = stageAdvanceSchema.safeParse({
			nextStage: 4,
			stageTitle: "Рабочий этап торка",
			angleClass: "class_3",
			verticalBite: "cross",
			treatmentPlanId: planId,
		});
		assert.ok(validStageAdvance.success, "Схема перехода этапа обязана принимать параметры прикуса");
		assert.equal(validStageAdvance.data.verticalBite, "cross");
	});

	it("3. Исправление кода Минздрава 804н в технологической карте BOM для Damon Q2", () => {
		const damonBom = ORTHODONTIC_BOM_LINKS.find((b) => b.id === "def-link-ortho-brackets-damon");
		assert.ok(damonBom, "Шаблон BOM def-link-ortho-brackets-damon обязан присутствовать в каталоге");
		assert.equal(
			damonBom.service804nCode,
			"A16.07.047",
			"Код 804н для фиксации брекет-системы Damon Q2 обязан быть A16.07.047 (ортодонтическая коррекция съемным/несъемным аппаратом)",
		);
	});

	it("4. Расчет планового перехода и длительности ношения элайнеров (calculateNextDate)", () => {
		const nextDate = calculateNextDate(28);
		assert.ok(nextDate, "Дата следующего визита обязана рассчитываться");
		assert.match(nextDate, /^\d{4}-\d{2}-\d{2}$/, "Формат даты обязан быть YYYY-MM-DD (ISO)");
	});

	it("5. Резолвер цен прейскуранта возвращает копейки BIGINT без потери точности (Мандат 8bm)", async () => {
		const resolvedPrice = await resolveOrthoServicePrice({
			organizationId: generateUuidV7(),
			serviceCode: "A16.07.048.001",
			defaultServiceName: "Активация брекет-системы и замена ортодонтических дуг (ВЧ + НЧ)",
			fallbackPriceRub: 4000,
		});

		assert.equal(resolvedPrice.serviceCode, "A16.07.048.001");
		assert.equal(resolvedPrice.priceRub, 4000);
		assert.equal(resolvedPrice.priceKopecks, 400000n, "4000 руб обязаны транслироваться в 400 000 копеек (bigint)");

		const resolvedMaterial = await resolveOrthoMaterialCost({
			organizationId: generateUuidV7(),
			itemNamePattern: "CuNiTi",
			fallbackCostRub: 1200,
		});

		assert.equal(resolvedMaterial.unitCostRub, 1200);
		assert.equal(resolvedMaterial.unitCostKopecks, 120000n, "1200 руб себестоимости обязаны транслироваться в 120 000 копеек (bigint)");
	});
});
