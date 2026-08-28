/**
 * clinical804nWriteoff.test.ts — Тесты клинического автосписания материалов
 * по Приказу Минздрава РФ № 804н, алгоритма FEFO, учета расхождений и актов 0504230/М-11/ТОРГ-16.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type CabinetStockBatch,
	type ClinicalWriteoffDocument,
	type CompletedClinicalService,
	aggregateWriteoffFromServices,
	calculateClinicalWriteoffTotals,
	calculateLineCostKopecks,
	exportClinicalWriteoffToCsv,
	findBestBatchFefo,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
	getDaysUntilExpiration,
	kopecksToRubles,
	updateLineActualQuantity,
	validateWriteoffDocument,
} from "../writeoff/clinicalWriteoffEngine.js";
import {
	CLINICAL_MATERIALS_CATALOG,
	DEFAULT_CLINIC_LEGAL_INFO,
	DENTAL_CABINET_STOCK_PRESETS,
	DISCREPANCY_REASONS,
	ORDER_804N_SERVICE_NORMS,
	getDiscrepancyReason,
	getOrder804nServiceNorm,
} from "../writeoff/clinicalWriteoffPresets.js";
import { ClinicalWriteoffModal } from "../writeoff/ClinicalWriteoffModal.js";

describe("Order 804n Clinical Service Norms & BOM Specifications", () => {
	it("Спецификация A16.07.002.001 (пломбирование зуба) включает полный комплект: анестетик, коффердам, матрицу, боры и композит", () => {
		const cariesNorm = getOrder804nServiceNorm("A16.07.002.001");
		assert.ok(cariesNorm, "Норма расхода A16.07.002.001 должна присутствовать в каталоге");

		const materialIds = cariesNorm.materials.map((m) => m.materialId);

		// 1. Анестетик и игла
		assert.ok(
			materialIds.includes("mat_articaine_ultracain"),
			"Норма кариеса должна содержать анестетик артикаин",
		);
		assert.ok(
			materialIds.includes("mat_dental_needle_30g"),
			"Норма кариеса должна содержать карпульную иглу 30G",
		);

		// 2. Коффердам (изоляция)
		assert.ok(
			materialIds.includes("mat_cofferdam_sheet"),
			"Норма кариеса должна содержать платок коффердама",
		);

		// 3. Секционная матрица
		assert.ok(
			materialIds.includes("mat_matrix_sectional_system"),
			"Норма кариеса должна содержать секционную матричную систему",
		);

		// 4. Боры терапевтические
		assert.ok(
			materialIds.includes("mat_dental_burs_set"),
			"Норма кариеса должна содержать алмазные боры",
		);

		// 5. Композит и адгезив
		assert.ok(
			materialIds.includes("mat_filtek_ultimate"),
			"Норма кариеса должна содержать наногибридный композит",
		);
		assert.ok(
			materialIds.includes("mat_single_bond_universal"),
			"Норма кариеса должна содержать универсальный адгезив",
		);
		assert.ok(
			materialIds.includes("mat_phosphoric_acid_37"),
			"Норма кариеса должна содержать травильный гель 37%",
		);
	});

	it("Спецификация A16.07.030.001 (Инфильтрационная анестезия) включает артикаин, иглу 30G и гель", () => {
		const anesNorm = getOrder804nServiceNorm("A16.07.030.001");
		assert.ok(anesNorm, "Норма расхода A16.07.030.001 должна присутствовать в каталоге");

		const materialIds = anesNorm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_articaine_ultracain"), "Должен быть артикаин");
		assert.ok(materialIds.includes("mat_dental_needle_30g"), "Должна быть игла 30G");
		assert.ok(materialIds.includes("mat_topical_anesthesia_gel"), "Должен быть аппликационный гель");
		assert.ok(materialIds.includes("mat_cotton_rolls"), "Должны быть ватные валики");
	});

	it("Спецификация A16.07.055 (Синус-лифтинг и НКР) включает Bio-Oss, Bio-Gide, Prolene 5-0 и артикаин Форте", () => {
		const gbrNorm = getOrder804nServiceNorm("A16.07.055");
		assert.ok(gbrNorm, "Норма расхода A16.07.055 должна присутствовать в каталоге");

		const materialIds = gbrNorm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_bio_oss_graft"), "Должен быть костный графт Bio-Oss");
		assert.ok(materialIds.includes("mat_bio_gide_membrane"), "Должна быть мембрана Bio-Gide");
		assert.ok(materialIds.includes("mat_prolene_50"), "Должен быть шовный материал Prolene 5-0");
		assert.ok(materialIds.includes("mat_articaine_ultracain"), "Должен быть артикаин Форте 1:100000");
		assert.ok(materialIds.includes("mat_surg_blade_15"), "Должно быть хирургическое лезвие");
	});

	it("aggregateWriteoffFromServices формирует точные строки списания со склада кабинета", () => {
		const completedServices: CompletedClinicalService[] = [
			{
				serviceCode: "A16.07.002.001",
				toothNumber: 26,
				serviceTitle: "Лечение глубокого кариеса",
				quantityMultiplier: 1,
			},
			{
				serviceCode: "A16.07.030.001",
				toothNumber: 26,
				serviceTitle: "Инфильтрационная анестезия",
				quantityMultiplier: 1,
			},
		];

		const lines = aggregateWriteoffFromServices(
			completedServices,
			DENTAL_CABINET_STOCK_PRESETS,
			"cab_01_therapy",
			"2026-08-22",
		);

		assert.ok(lines.length >= 8, "Должно быть сформировано не менее 8 строк материалов");
		assert.ok(lines.some((l) => l.nameRu.includes("Ультракаин")));
		assert.ok(lines.some((l) => l.nameRu.includes("коффердам")));
		assert.ok(lines.some((l) => l.nameRu.includes("матричн")));
		assert.ok(lines.some((l) => l.nameRu.includes("Бор алмазный")));
		assert.ok(lines.some((l) => l.nameRu.includes("Filtek")));

		for (const line of lines) {
			assert.equal(line.toothNumber, 26);
			assert.ok(
				line.serviceCode === "A16.07.002.001" || line.serviceCode === "A16.07.030.001",
				"Код услуги должен быть A16.07.002.001 или A16.07.030.001",
			);
			assert.ok(line.standardQuantity > 0);
			assert.ok(line.unitCostKopecks > 0);
		}
	});
});

describe("FEFO (First Expired, First Out) Batch Allocation Engine", () => {
	it("Выбирает партию с более ранним сроком годности (FEFO)", () => {
		const testBatches: CabinetStockBatch[] = [
			{
				batchId: "batch_future",
				materialId: "mat_filtek_ultimate",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1",
				lotNumber: "LOT-2028-FUTURE",
				expirationDate: "2028-12-31",
				manufactureDate: "2025-01-01",
				quantityAvailable: 10,
				criticalThreshold: 2,
				unitCostKopecks: 135000,
				supplierNameRu: "3M",
			},
			{
				batchId: "batch_soon",
				materialId: "mat_filtek_ultimate",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1",
				lotNumber: "LOT-2026-SOON",
				expirationDate: "2026-09-15", // истекает скоро
				manufactureDate: "2023-09-01",
				quantityAvailable: 2,
				criticalThreshold: 2,
				unitCostKopecks: 135000,
				supplierNameRu: "3M",
			},
		];

		const result = findBestBatchFefo(
			"mat_filtek_ultimate",
			0.3,
			testBatches,
			"cab_01_therapy",
			"2026-08-22",
		);

		assert.ok(result.batch);
		assert.equal(result.batch.batchId, "batch_soon", "FEFO обязан выбрать партию с более ранним сроком годности");
		assert.equal(result.isExpiringSoon, true, "Партия со сроком < 30 дней должна быть помечена как expiringSoon");
		assert.equal(result.isExpired, false);
	});

	it("Определяет просроченные партии и рассчитывает дни до истечения", () => {
		const daysLeft = getDaysUntilExpiration("2026-08-30", "2026-08-22");
		assert.equal(daysLeft, 8);

		const daysExpired = getDaysUntilExpiration("2026-08-10", "2026-08-22");
		assert.equal(daysExpired, -12);
	});
});

describe("Kopeck-Exact Financial Calculation & Discrepancies", () => {
	it("calculateLineCostKopecks считает точную стоимость целых и дробных объемов", () => {
		// 0.3 г композита по 1350.00 руб/г = 405.00 руб = 40500 коп
		const cost1 = calculateLineCostKopecks(135000, 0.3);
		assert.equal(cost1, 40500);

		// 0.05 мл адгезива по 1950.00 руб/мл = 97.50 руб = 9750 коп
		const cost2 = calculateLineCostKopecks(195000, 0.05);
		assert.equal(cost2, 9750);
		assert.equal(kopecksToRubles(cost2), 97.5);
	});

	it("updateLineActualQuantity фиксирует перерасход и причину отклонения", () => {
		const baseLines = aggregateWriteoffFromServices(
			[{ serviceCode: "A16.07.004", serviceTitle: "Анестезия" }],
			DENTAL_CABINET_STOCK_PRESETS,
		);
		const anesLine = baseLines.find((l) => l.materialId === "mat_articaine_ultracain");
		assert.ok(anesLine);

		// Врач применил 2 карпулы вместо 1 по причине анатомической сложности
		const updated = updateLineActualQuantity(
			anesLine,
			2,
			"additional_carpule",
			"Повышенная болевая чувствительность пациента",
		);

		assert.equal(updated.actualQuantity, 2);
		assert.equal(updated.discrepancyQuantity, 1);
		assert.equal(updated.discrepancyReasonCode, "additional_carpule");
		assert.equal(updated.totalCostKopecks, anesLine.unitCostKopecks * 2);
	});
});

describe("Statutory Acts Generation (0504230, M-11, TORG-16, CSV)", () => {
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

	it("generateAct0504230Html формирует официальный бланк по ОКУД 0504230 (Приказ Минфина 52н)", () => {
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
		assert.ok(csv.startsWith("\uFEFF"), "CSV должен содержать UTF-8 BOM");
		assert.ok(csv.includes("№ акта"));
		assert.ok(csv.includes("АКТ-СПИС-2026/08-101"));
		assert.ok(csv.includes("Иванов Иван Иванович"));
		assert.ok(csv.includes("405.00"));
	});
});

describe("SSR Rendering of ClinicalWriteoffModal", () => {
	it("Рендерит модальное окно списания в статический HTML", () => {
		const html = renderToStaticMarkup(
			createElement(ClinicalWriteoffModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Сидоров Петр",
			}),
		);

		assert.ok(html.includes("data-testid=\"clinical-writeoff-modal\""));
		assert.ok(html.includes("Клиническое автосписание материалов"));
		assert.ok(html.includes("Сидоров Петр"));
		assert.ok(html.includes("Норма (804н)"));
	});
});
