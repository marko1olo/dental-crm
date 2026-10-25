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

describe("Журнал контроля предстерилизационной очистки — 1-клик качество", () => {
	it("автоматически рассчитывает минимальную выборку (3 шт. для малой партии, 5 для хирургии)", () => {
		const smallBatch = calculatePsoSampleRequirements(100, false);
		assert.equal(smallBatch.minSampleCount, 3);

		const surgicalBatch = calculatePsoSampleRequirements(30, true);
		assert.equal(surgicalBatch.minSampleCount, 5);

		const largeBatch = calculatePsoSampleRequirements(500, false);
		assert.equal(largeBatch.minSampleCount, 5);
	});

	it("1-клик фиксация нормы смены: отрицательные пробы азопирама и фенолфталеина допускают партию", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 100,
			testedSampleCount: 3,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
		});
		assert.equal(res.isBatchApproved, true);
		assert.equal(res.samplingSatisfied, true);
		assert.equal(res.rejectionReason, null);
	});

	it("отбраковывает партию при наличии следов крови (положительный азопирам)", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 80,
			testedSampleCount: 3,
			isAzopyramNegative: false,
			isPhenolphthaleinNegative: true,
		});
		assert.equal(res.isBatchApproved, false);
		assert.ok(res.rejectionReason?.includes("азопирамовая проба"));
	});

	it("отбраковывает партию при наличии остатков моющих средств (положительный фенолфталеин)", () => {
		const res = evaluatePsoTrialResult({
			batchCount: 80,
			testedSampleCount: 3,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: false,
		});
		assert.equal(res.isBatchApproved, false);
		assert.ok(res.rejectionReason?.includes("фенолфталеиновая проба"));
	});

	it("генерирует структурированный ID записи контроля очистки", () => {
		const recId = generatePsoRecordId("2026-10-25", 5);
		assert.ok(recId.startsWith("PSO-20261025-0005"));
	});

	it("экспортирует записи контроля очистки в CSV с понятными русскими колонками", () => {
		const record: PsoJournalRecord = {
			id: "rec-1",
			timestamp: "2026-10-25T10:00:00.000Z",
			instrumentName: "Терапевтический лоток (зеркало, зонд, пинцет)",
			categoryId: "therapeutic",
			batchItemCount: 100,
			testedSampleCount: 3,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Биолот 0.5%",
			isBatchApproved: true,
			operatorStaffFullName: "Медсестра ЦСО",
			operatorStaffPosition: "Медицинская сестра ЦСО",
			electronicStampVerified: true,
		};
		const csv = exportPsoJournalToCsv([record]);
		assert.ok(csv.includes("Азопирамовая проба") && csv.includes("Допущено"));
	});

	it("генерирует чистую HTML форму для печати журнала контроля предстерилизационной очистки", () => {
		const record: PsoJournalRecord = {
			id: "rec-1",
			timestamp: "2026-10-25T10:00:00.000Z",
			instrumentName: "Терапевтический лоток",
			categoryId: "therapeutic",
			batchItemCount: 100,
			testedSampleCount: 3,
			testType: "both_standard",
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isSudanNegative: true,
			detergentBrand: "Биолот 0.5%",
			isBatchApproved: true,
			operatorStaffFullName: "Медсестра ЦСО",
			operatorStaffPosition: "Медицинская сестра ЦСО",
			electronicStampVerified: true,
		};
		const html = generatePsoJournalPrintHtml({
			records: [record],
			clinicInfo: {
				name: "ООО ДЕНТЕ КЛИНИК",
				ogrn: "1234567890123",
				inn: "7701234567",
				address: "г. Москва",
				chiefDoctor: "Д-р Марков",
				headNurse: "Ковалева О.С.",
			},
		});
		assert.ok(html.includes("ЖУРНАЛ") && html.includes("ПРЕДСТЕРИЛИЗАЦИОННОЙ"));
		assert.ok(html.includes("ООО ДЕНТЕ КЛИНИК"));
	});
});
