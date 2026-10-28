import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type ClinicalWriteoffDocument,
	exportClinicalWriteoffToCsv,
	generateMaterialWriteoffActHtml,
	generateMaterialWaybillHtml,
	generateDisposalActHtml,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
} from "../writeoff/clinicalWriteoffEngine.js";
import { DEFAULT_CLINIC_LEGAL_INFO } from "../writeoff/clinicalWriteoffPresets.js";

const sampleDoc: ClinicalWriteoffDocument = {
	id: "doc-test-1",
	actNumber: "АКТ-СПИС-2026/08-101",
	actDate: "2026-08-22",
	patientId: "PAT-001",
	patientName: "Иванов Иван Иванович",
	doctorFullName: "Д-р Кузнецов М.С.",
	doctorSpecialty: "Врач-стоматолог терапевт",
	cabinetId: "cab_01_therapy",
	cabinetNameRu: "Кабинет №1 (Терапия)",
	completedServices: [{ serviceCode: "A16.07.002.001", toothNumber: 16 }],
	lines: [
		{
			id: "l1",
			serviceCode: "A16.07.002.001",
			serviceTitle: "Лечение кариеса",
			toothNumber: 16,
			materialId: "mat_filtek_ultimate",
			sku: "COMP-FILT-ULT",
			nameRu: "Композит Filtek Ultimate",
			category: "composite",
			unit: "г",
			okeiCode: "166",
			standardQuantity: 0.3,
			actualQuantity: 0.3,
			discrepancyQuantity: 0,
			discrepancyReasonCode: "standard_consumption",
			isExpiringSoon: false,
			isExpired: false,
			stockAvailable: 10,
			criticalThreshold: 2,
			stockStatus: "ok",
			unitCostKopecks: 135000,
			totalCostKopecks: 40500,
			isMandatory: true,
			requiresLotTracking: false,
			requiresSerialNumber: false,
		},
	],
	totals: {
		totalServicesCount: 1,
		totalMaterialsCount: 1,
		totalMaterialsQuantity: 0.3,
		totalCostKopecks: 40500,
		totalCostFormatted: "405,00 ₽",
		totalCostRubles: 405,
		totalDiscrepancyCostKopecks: 0,
		totalDiscrepancyCostFormatted: "0,00 ₽",
		totalDiscrepancyCostRubles: 0,
		expiringBatchesCount: 0,
		expiredBatchesCount: 0,
		deficitItemsCount: 0,
		hasDeficit: false,
		hasExpiringLots: false,
		hasExpiredLots: false,
	},
	statutoryFormType: "material_writeoff",
	status: "confirmed",
	clinicInfo: DEFAULT_CLINIC_LEGAL_INFO,
};

describe("Commercial Clean Print Forms (Акт списания материалов, Накладная прихода, CSV)", () => {
	it("generateMaterialWriteoffActHtml формирует понятный Акт списания материалов", () => {
		const html = generateMaterialWriteoffActHtml(sampleDoc);
		assert.ok(html.includes("АКТ СПИСАНИЯ МАТЕРИАЛОВ"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Кузнецов М.С."));
		assert.ok(html.includes("405.00"));
		assert.ok(html.includes("Filtek Ultimate"));
		// Проверяем алиас обратной совместимости
		const aliasHtml = generateAct0504230Html(sampleDoc);
		assert.equal(aliasHtml, html);
	});

	it("generateMaterialWaybillHtml формирует понятную Накладную прихода и перемещения", () => {
		const html = generateMaterialWaybillHtml(sampleDoc);
		assert.ok(html.includes("НАКЛАДНАЯ ПРИХОДА И ПЕРЕМЕЩЕНИЯ МАТЕРИАЛОВ"));
		assert.ok(html.includes("Filtek Ultimate"));
		assert.ok(html.includes("405.00"));
		// Проверяем алиас обратной совместимости
		const aliasHtml = generateFormM11Html(sampleDoc);
		assert.ok(aliasHtml.includes("Filtek Ultimate"));
		assert.ok(aliasHtml.includes("405.00"));
	});

	it("generateDisposalActHtml формирует канонический Акт списания материалов", () => {
		const html = generateDisposalActHtml(sampleDoc);
		assert.ok(html.includes("АКТ СПИСАНИЯ МАТЕРИАЛОВ"));
		assert.ok(html.includes("Filtek Ultimate"));
		assert.ok(html.includes("405.00"));
		// Проверяем алиас обратной совместимости
		const aliasHtml = generateTorg16Html(sampleDoc);
		assert.equal(aliasHtml, html);
	});

	it("exportClinicalWriteoffToCsv формирует валидный CSV RFC 4180 с UTF-8 BOM", () => {
		const csv = exportClinicalWriteoffToCsv([sampleDoc]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("№ акта"));
		assert.ok(csv.includes("АКТ-СПИС-2026/08-101"));
		assert.ok(csv.includes("405.00"));
	});
});
