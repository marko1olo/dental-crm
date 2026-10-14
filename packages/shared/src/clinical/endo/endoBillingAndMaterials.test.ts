import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateEndoBillingAndMaterialsEstimate,
	isRvgBlockingEndoStage,
	safeCanalWorkingLengthRatio,
} from "./endoBillingAndMaterials.js";
import type { EndoCanalData } from "./types.js";

describe("endoBillingAndMaterials — 804n Billing & Warehouse Materials SSOT", () => {
	it("1. Одноканальный резец (зуб 11): расчет сметы и честное списание расходников (Мандаты 8b, 8e)", () => {
		const result = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 11,
			stageStamp: "COMPLETED",
			obturationTechnique: "Гуттаперча + Силер (AH Plus)",
			sealer: "AH Plus",
		});

		assert.equal(result.toothNumber, 11);
		assert.equal(result.canalCount, 1);
		assert.equal(result.stage, "COMPLETED");

		// 804н услуги
		assert.equal(result.services804n.length, 2);
		assert.equal(result.services804n[0]?.code804n, "A16.07.030.001");
		assert.equal(result.services804n[0]?.priceRub, 3500);
		assert.equal(result.services804n[0]?.totalPriceKopecks, 350000);

		assert.equal(result.services804n[1]?.code804n, "A16.07.008.001");
		assert.equal(result.services804n[1]?.priceRub, 4000);
		assert.equal(result.services804n[1]?.totalPriceKopecks, 400000);

		assert.equal(result.totalServicesPriceRub, 7500);
		assert.equal(result.totalServicesPriceKopecks, 750000);

		// Складские материалы
		const niti = result.materials.find((m) => m.itemId === "mat-niti-rotary-file");
		assert.ok(niti);
		assert.equal(niti.quantity, 1);

		const gutta = result.materials.find((m) => m.itemId === "mat-gutta-percha");
		assert.ok(gutta);
		assert.equal(gutta.quantity, 3); // 3 шт на 1 канал

		const paper = result.materials.find((m) => m.itemId === "mat-paper-points");
		assert.ok(paper);
		assert.equal(paper.quantity, 4); // 4 шт на 1 канал

		const sealer = result.materials.find((m) => m.itemId === "mat-endo-sealer-ahplus");
		assert.ok(sealer);
		assert.equal(sealer.quantity, 1);

		const hypo = result.materials.find((m) => m.itemId === "mat-hypochlorite-3");
		assert.ok(hypo);
		assert.equal(hypo.quantity, 5); // 5 мл на 1 канал
	});

	it("2. Многоканальные моляры (16, 46): точный множитель на число каналов (3 и 4 канала)", () => {
		// Зуб 16: 4 канала (MB1, MB2, DB, P)
		const mockCanals4: EndoCanalData[] = [
			{ id: "c1", canalName: "MB1", referencePoint: "MB cusp", workingLengthMm: 21.0, masterApicalFile: "ISO 25", taper: ".06", obturationTechnique: "AH Plus" },
			{ id: "c2", canalName: "MB2", referencePoint: "MB cusp", workingLengthMm: 20.5, masterApicalFile: "ISO 20", taper: ".04", obturationTechnique: "AH Plus" },
			{ id: "c3", canalName: "DB", referencePoint: "DB cusp", workingLengthMm: 20.0, masterApicalFile: "ISO 25", taper: ".06", obturationTechnique: "AH Plus" },
			{ id: "c4", canalName: "P", referencePoint: "P cusp", workingLengthMm: 22.0, masterApicalFile: "ISO 30", taper: ".06", obturationTechnique: "AH Plus" },
		];

		const res4 = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 16,
			canals: mockCanals4,
			stageStamp: "COMPLETED",
		});

		assert.equal(res4.canalCount, 4);
		assert.equal(res4.services804n[0]?.code804n, "A16.07.030.004");
		assert.equal(res4.services804n[0]?.priceRub, 10500);
		assert.equal(res4.services804n[1]?.code804n, "A16.07.008.004");
		assert.equal(res4.services804n[1]?.priceRub, 12000);

		const gutta4 = res4.materials.find((m) => m.itemId === "mat-gutta-percha");
		assert.ok(gutta4);
		assert.equal(gutta4.quantity, 12); // 3 шт * 4 канала = 12 шт

		const paper4 = res4.materials.find((m) => m.itemId === "mat-paper-points");
		assert.ok(paper4);
		assert.equal(paper4.quantity, 16); // 4 шт * 4 канала = 16 шт

		const hypo4 = res4.materials.find((m) => m.itemId === "mat-hypochlorite-3");
		assert.ok(hypo4);
		assert.equal(hypo4.quantity, 20); // 5 мл * 4 канала = 20 мл

		const edta4 = res4.materials.find((m) => m.itemId === "mat-endo-edta-17");
		assert.ok(edta4);
		assert.equal(edta4.quantity, 8); // 2 мл * 4 канала = 8 мл
	});

	it("3. Этап временной обтурации Ca(OH)2 (Calcept / Metapex): начисление лекарственной обработки и списание пасты", () => {
		const resTemp = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 46,
			stageStamp: "TEMP_CAOH2",
		});

		assert.equal(resTemp.stage, "TEMP_CAOH2");
		assert.equal(resTemp.canalCount, 3); // Зуб 46 анатомически 3 канала (MB, ML, D)

		// Услуги: мехобработка + временный кальций (A16.07.091)
		const medService = resTemp.services804n.find((s) => s.code804n === "A16.07.091" || s.code804n === "A16.07.030.002");
		assert.ok(medService);
		assert.equal(medService.quantity, 3);
		assert.equal(medService.totalPriceRub, 2000 * 3);

		// Никакой гуттаперчи на временном этапе
		const gutta = resTemp.materials.find((m) => m.itemId === "mat-gutta-percha");
		assert.equal(gutta, undefined);

		// Списание гидроксида кальция и дентин-пасты
		const calcept = resTemp.materials.find((m) => m.itemId === "mat-calcium-calasept");
		assert.ok(calcept);
		assert.equal(calcept.quantity, 3);

		const bandage = resTemp.materials.find((m) => m.itemId === "mat-dentin-paste");
		assert.ok(bandage);
		assert.equal(bandage.quantity, 1);
	});

	it("4. Биокерамический силер (BioRoot RCS): списание BioRoot вместо эпоксидного AH Plus", () => {
		const resBio = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 21,
			stageStamp: "COMPLETED",
			sealer: "Биокерамика (BioRoot RCS / TotalFill)",
		});

		const bioSealer = resBio.materials.find((m) => m.itemId === "mat-endo-sealer-bioroot");
		assert.ok(bioSealer);
		assert.equal(bioSealer.quantity, 1);
		assert.equal(bioSealer.costPriceRub, 850);

		const ahPlus = resBio.materials.find((m) => m.itemId === "mat-endo-sealer-ahplus");
		assert.equal(ahPlus, undefined);
	});

	it("5. Повторное эндо (ретритмент): начисление распломбирования каналов (A16.07.082)", () => {
		const resRetreat = calculateEndoBillingAndMaterialsEstimate({
			toothNumber: 36,
			stageStamp: "COMPLETED",
			isRetreatment: true,
		});

		const unsealing = resRetreat.services804n.find((s) => s.code804n === "A16.07.082");
		assert.ok(unsealing);
		assert.equal(unsealing.quantity, 3); // 3 канала зуба 36
		assert.equal(unsealing.totalPriceRub, 2500 * 3);
	});

	it("6. Защита от деления на 0 при вычислении рабочей длины (safeCanalWorkingLengthRatio)", () => {
		// Длина 0 или пустая
		const zero = safeCanalWorkingLengthRatio(0, 0);
		assert.deepEqual(zero, { ratio: 0, percent: 0, isMeasured: false });

		// Длина нормальная, но реперная длина 0 (защита от деления на 0)
		const safeDivZero = safeCanalWorkingLengthRatio(21.0, 0);
		assert.equal(safeDivZero.isMeasured, true);
		assert.equal(safeDivZero.ratio, 1);
		assert.equal(safeDivZero.percent, 100);

		// Нечисловые значения (NaN, string undefined)
		const invalidNum = safeCanalWorkingLengthRatio("undefined", "invalid");
		assert.deepEqual(invalidNum, { ratio: 0, percent: 0, isMeasured: false });

		// Штатный замер: 21 мм при репере 21 мм -> 100%
		const exact = safeCanalWorkingLengthRatio(21.0, 21.0);
		assert.equal(exact.percent, 100);
	});

	it("7. Мандат 8e (Врачебная автономия): отсутствие снимка RVG никогда не блокирует этапы", () => {
		assert.equal(isRvgBlockingEndoStage("COMPLETED", false), false);
		assert.equal(isRvgBlockingEndoStage("TEMP_CAOH2", false), false);
		assert.equal(isRvgBlockingEndoStage("DRAFT", false), false);
	});
});
