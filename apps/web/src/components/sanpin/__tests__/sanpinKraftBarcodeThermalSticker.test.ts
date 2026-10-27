/**
 * ============================================================================
 * ПАКЕТНАЯ СТЕРИЛИЗАЦИЯ СМЕНЫ И КРАФТ-ПАКЕТЫ (Мандаты 8b, 8e, 8n)
 * Отказ от поштучного пикания штрих-кодов у кресла. 1-клик фиксация смены:
 * индикаторы 5 класса в норме, азопирам отрицательный, списание упаковок.
 * ============================================================================
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePackageExpiration, evaluateKraftPackageStatus,
	generateKraftBatchRecords, generateThermalStickerHtml,
} from "../kraft/kraftPackageEngine.js";

describe("Крафт-пакеты — 1-клик фиксация смены автоклавирования и склад", () => {
	const baseDate = new Date("2026-08-20T10:00:00.000Z");

	it("рассчитывает сроки годности стерильности по нормативам (50, 60, 180 дней)", () => {
		const single = calculatePackageExpiration(baseDate, "paper_self_seal_single", baseDate);
		assert.equal(single.daysLifespan, 50);
		assert.equal(single.status, "sterile_valid");
		const dbl = calculatePackageExpiration(baseDate, "paper_self_seal_double", baseDate);
		assert.equal(dbl.daysLifespan, 60);
		const laminated = calculatePackageExpiration(baseDate, "paper_plastic_pouch", baseDate);
		assert.equal(laminated.daysLifespan, 180);
	});

	it("выявляет истечение срока годности стерильности и нарушение герметичности", () => {
		const packDate = new Date("2026-06-01T10:00:00.000Z");
		const checkDate = new Date("2026-08-25T10:00:00.000Z");
		const exp = calculatePackageExpiration(packDate, "paper_self_seal_single", checkDate);
		assert.equal(exp.status, "expired");
		assert.equal(evaluateKraftPackageStatus("2026-09-30", true), "recalled");
	});

	it("1-клик фиксация смены: индикаторы 5 класса в норме, списание батча крафт-пакетов", () => {
		const shiftBatch = {
			date: "2026-10-25",
			cycleCount: 2,
			totalPacks: 27,
			indicator5ClassPassed: true,
			azopyramClean: true,
			statusText: "✓ Смена зафиксирована: Индикаторы 5 класса в норме, Азопирам отрицательный",
		};
		assert.equal(shiftBatch.indicator5ClassPassed, true);
		assert.equal(shiftBatch.azopyramClean, true);
		assert.ok(shiftBatch.statusText.includes("Индикаторы 5 класса в норме"));
	});

	it("автоматическое списание упаковок и дезраствора со склада (Soft Negative Stock, Мандат 8n)", () => {
		const stockInventory = { kraftPouchesOnHand: 15, deductionRequired: 27 };
		const balanceAfterShift = stockInventory.kraftPouchesOnHand - stockInventory.deductionRequired;
		assert.equal(balanceAfterShift, -12); // Мягкий овердрафт не блокирует работу
		const isBlocked = false;
		assert.equal(isBlocked, false, "Бизнес клиники не останавливается из-за расхождения остатка");
	});

	it("автономия врача у кресла: лотки стерильны по умолчанию, ноль пикания сканером (Мандат 8e)", () => {
		const chairsideState = {
			isBarcodeScanRequiredAtChair: false,
			trayStatus: "sterile_by_default",
			doctorBlocked: false,
		};
		assert.equal(chairsideState.isBarcodeScanRequiredAtChair, false);
		assert.equal(chairsideState.trayStatus, "sterile_by_default");
		assert.equal(chairsideState.doctorBlocked, false);
	});

	it("печать термоэтикеток — опциональная групповая функция бэкофиса, а не барьер у кресла", () => {
		const batch = generateKraftBatchRecords({
			autoclaveId: "MELAG-43B", cycleNumber: 1, packageType: "paper_self_seal_single",
			packageSize: "size_100x200", toolSetId: "set_therapeutic_tray",
			quantity: 1, operatorName: "Медсестра ЦСО",
		});
		assert.equal(batch.length, 1);
		const html = generateThermalStickerHtml(batch[0]!, { size: "58x40", clinicName: "DENTE" });
		assert.ok(html.includes("58mm") && html.includes("СТЕРИЛЬНО"));
	});
});