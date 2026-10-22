import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type ClinicalWriteoffDocument,
	exportClinicalWriteoffToCsv,
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
	statutoryFormType: "0504230",
	status: "confirmed",
	clinicInfo: DEFAULT_CLINIC_LEGAL_INFO,
};

describe("Statutory Acts Generation (0504230, M-11, TORG-16, CSV)", () => {
	it("generateAct0504230Html формирует официальный бланк по ОКУД 0504230", () => {
		const html = generateAct0504230Html(sampleDoc);
		assert.ok(html.includes("0504230"));
		assert.ok(html.includes("АКТ О СПИСАНИИ МАТЕРИАЛЬНЫХ ЗАПАСОВ"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Кузнецов М.С."));
		assert.ok(html.includes("405.00"));
		assert.ok(html.includes("Filtek Ultimate"));
	});

	it("generateFormM11Html формирует Требование-накладную М-11", () => {
		const html = generateFormM11Html(sampleDoc);
		assert.ok(html.includes("0315003"));
		assert.ok(html.includes("ТРЕБОВАНИЕ-НАКЛАДНАЯ"));
		assert.ok(html.includes("Filtek Ultimate"));
	});

	it("generateTorg16Html формирует Акт о списании товаров ТОРГ-16", () => {
		const html = generateTorg16Html(sampleDoc);
		assert.ok(html.includes("0330216"));
		assert.ok(html.includes("АКТ О СПИСАНИИ ТОВАРОВ"));
		assert.ok(html.includes("Filtek Ultimate"));
	});

	it("exportClinicalWriteoffToCsv формирует валидный CSV RFC 4180 с UTF-8 BOM", () => {
		const csv = exportClinicalWriteoffToCsv([sampleDoc]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("№ акта"));
		assert.ok(csv.includes("АКТ-СПИС-2026/08-101"));
		assert.ok(csv.includes("405.00"));
	});
});
