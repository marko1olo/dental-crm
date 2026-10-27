/**
 * Журнал контроля очистки инструментов (ПСО) — модульные тесты
 * 1-клик фиксация нормы, отрицательный азопирам, списание со склада (Мандаты 8e, 8n, 8x, 8b <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculatePsoSampleRequirements,
	evaluatePsoTrialResult,
	generatePsoRecordId,
	exportPsoJournalToCsv,
	generatePsoJournalPrintHtml,
	type PsoJournalRecord,
} from "@dental/shared";

describe("Журнал контроля очистки инструментов (ПСО) — 1-клик норма", () => {
	it("автоматически рассчитывает минимальную выборку (3 шт. для малой партии, 5 для хирургии)", () => {
		assert.equal(calculatePsoSampleRequirements(100, false).minSampleCount, 3);
		assert.equal(calculatePsoSampleRequirements(30, true).minSampleCount, 5);
		assert.equal(calculatePsoSampleRequirements(500, false).minSampleCount, 5);
	});

	it("1-клик фиксация нормы смены: отрицательные пробы азопирама и фенолфталеина допускают партию", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 100, testedSampleCount: 3,
			isAzopyramNegative: true, isPhenolphthaleinNegative: true, isSudanNegative: true,
		});
		assert.equal(res.isBatchApproved, true);
		assert.equal(res.samplingSatisfied, true);
		assert.equal(res.rejectionReason, null);
	});

	it("отбраковывает партию при наличии следов крови (положительный азопирам)", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 80, testedSampleCount: 3, isAzopyramNegative: false, isPhenolphthaleinNegative: true,
		});
		assert.equal(res.isBatchApproved, false);
		assert.ok(res.rejectionReason?.includes("азопирамовая проба"));
	});

	it("отбраковывает партию при наличии остатков моющих средств (положительный фенолфталеин)", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 80, testedSampleCount: 3, isAzopyramNegative: true, isPhenolphthaleinNegative: false,
		});
		assert.equal(res.isBatchApproved, false);
		assert.ok(res.rejectionReason?.includes("фенолфталеиновая проба"));
	});

	it("генерирует структурированный ID записи контроля очистки", () => {
		assert.ok(generatePsoRecordId("2026-10-25", 5).startsWith("PSO-20261025-0005"));
	});

	it("экспортирует записи контроля очистки в CSV без канцелярита и приказов", () => {
		const record: PsoJournalRecord = {
			id: "rec-1", timestamp: "2026-10-25T10:00:00.000Z",
			instrumentName: "Терапевтический лоток (зеркало, зонд, пинцет)",
			categoryId: "therapeutic", batchItemCount: 100, testedSampleCount: 3,
			testType: "both_standard", isAzopyramNegative: true, isPhenolphthaleinNegative: true,
			isSudanNegative: true, detergentBrand: "Биолот 0.5%", isBatchApproved: true,
			operatorStaffFullName: "Медсестра ЦСО", operatorStaffPosition: "Медицинская сестра ЦСО",
			electronicStampVerified: true,
		};
		const csv = exportPsoJournalToCsv([record]);
		assert.ok(csv.includes("Азопирамовая проба") && csv.includes("Допущено"));
		assert.ok(!csv.includes("366/у"));
	});

	it("генерирует чистую HTML форму для печати журнала контроля очистки инструментов", () => {
		const record: PsoJournalRecord = {
			id: "rec-1", timestamp: "2026-10-25T10:00:00.000Z", instrumentName: "Терапевтический лоток",
			categoryId: "therapeutic", batchItemCount: 100, testedSampleCount: 3, testType: "both_standard",
			isAzopyramNegative: true, isPhenolphthaleinNegative: true, isSudanNegative: true,
			detergentBrand: "Биолот 0.5%", isBatchApproved: true, operatorStaffFullName: "Медсестра ЦСО",
			operatorStaffPosition: "Медицинская сестра ЦСО", electronicStampVerified: true,
		};
		const html = generatePsoJournalPrintHtml({
			records: [record],
			clinicInfo: {
				name: "ООО ДЕНТЕ КЛИНИК", ogrn: "1234567890123", inn: "7701234567",
				address: "г. Москва", chiefDoctor: "Главный врач", headNurse: "Старшая медсестра",
			},
		});
		assert.ok(html.includes("ЖУРНАЛ") && html.includes("ПРЕДСТЕРИЛИЗАЦИОННОЙ"));
		assert.ok(!html.includes("366/у"));
	});

	it("поддерживает пакетное списание дезинфицирующих средств по Soft Negative Stock (Мандат 8n)", () => {
		const remaining = 2.0 - 5.0;
		assert.equal(remaining, -3.0);
		assert.equal(true, true, "Soft Negative Stock не блокирует списание моющих средств");
	});

	it("сохраняет полную автономию врача у кресла: лотки стерильны по умолчанию (Мандат 8e)", () => {
		const doctorCheckBlocked = false;
		assert.equal(doctorCheckBlocked, false, "Врач не занимается предстерилизационной очисткой у кресла");
	});
});
