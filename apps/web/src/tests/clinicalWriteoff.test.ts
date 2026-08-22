/**
 * ============================================================================
 * CLINICAL WRITEOFF, ORDER 804N NORMS & FEFO DEDUCTION TEST SUITE
 * Exhaustive unit tests for Order 804n BOM presets, FEFO batch selection,
 * discrepancy calculations, statutory acts (0504230, M-11, TORG-16), CSV export,
 * and React SSR static markup rendering.
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CLINICAL_MATERIALS_CATALOG,
	type CabinetStockBatch,
	type ClinicalWriteoffDocument,
	type ClinicalWriteoffLine,
	ClinicalWriteoffModal,
	DENTAL_CABINET_STOCK_PRESETS,
	DISCREPANCY_REASONS,
	ORDER_804N_SERVICE_NORMS,
	aggregateWriteoffFromServices,
	calculateClinicalWriteoffTotals,
	calculateLineCostKopecks,
	exportClinicalWriteoffToCsv,
	findBestBatchFefo,
	generateAct0504230Html,
	generateFormM11Html,
	generateTorg16Html,
	getClinicalMaterialById,
	getDaysUntilExpiration,
	getDiscrepancyReason,
	getOrder804nServiceNorm,
	kopecksToRubles,
	updateLineActualQuantity,
	validateWriteoffDocument,
} from "../components/inventory/writeoff/index.js";

describe("Order 804n Dental Service BOM Presets & Materials Catalog", () => {
	it("Каталог содержит все ключевые стоматологические материалы", () => {
		assert.ok(CLINICAL_MATERIALS_CATALOG.length >= 15);

		const matFiltek = getClinicalMaterialById("mat_filtek_ultimate");
		assert.ok(matFiltek);
		assert.equal(matFiltek.unit, "г");
		assert.equal(matFiltek.okeiCode, "166");
		assert.equal(matFiltek.requiresLotTracking, true);

		const matSbu = getClinicalMaterialById("mat_single_bond_universal");
		assert.ok(matSbu);
		assert.equal(matSbu.unit, "мл");
		assert.equal(matSbu.okeiCode, "111");

		const matOsstem = getClinicalMaterialById("mat_implant_osstem_ts3");
		assert.ok(matOsstem);
		assert.equal(matOsstem.requiresSerialNumber, true);
		assert.equal(matOsstem.requiresLotTracking, true);
	});

	it("Норма A16.07.002.001 (Пломбирование композитом) содержит все регламентные материалы", () => {
		const norm = getOrder804nServiceNorm("A16.07.002.001");
		assert.ok(norm);
		assert.equal(norm.specialty, "therapy");

		const materialIds = norm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_filtek_ultimate"));
		assert.ok(materialIds.includes("mat_single_bond_universal"));
		assert.ok(materialIds.includes("mat_phosphoric_acid_37"));
		assert.ok(materialIds.includes("mat_polishing_enhance"));
		assert.ok(materialIds.includes("mat_saliva_ejector"));
		assert.ok(materialIds.includes("mat_cotton_rolls"));
		assert.ok(materialIds.includes("mat_nitrile_gloves"));
		assert.ok(materialIds.includes("mat_surgical_mask"));

		const filtekItem = norm.materials.find((m) => m.materialId === "mat_filtek_ultimate");
		assert.equal(filtekItem?.standardQuantity, 0.3); // 0.3 г

		const sbuItem = norm.materials.find((m) => m.materialId === "mat_single_bond_universal");
		assert.equal(sbuItem?.standardQuantity, 0.05); // 0.05 мл

		const etchItem = norm.materials.find((m) => m.materialId === "mat_phosphoric_acid_37");
		assert.equal(etchItem?.standardQuantity, 0.1); // 0.1 мл
	});

	it("Норма A16.07.008 (Пломбирование корневого канала) содержит гуттаперчу, силер AH Plus, гипохлорит и ЭДТА", () => {
		const norm = getOrder804nServiceNorm("A16.07.008");
		assert.ok(norm);
		assert.equal(norm.specialty, "endodontics");

		const materialIds = norm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_gutta_percha_points"));
		assert.ok(materialIds.includes("mat_sealer_ah_plus"));
		assert.ok(materialIds.includes("mat_hypochlorite_na_3"));
		assert.ok(materialIds.includes("mat_edta_gel_17"));
		assert.ok(materialIds.includes("mat_endo_needle_side_vent"));
		assert.ok(materialIds.includes("mat_paper_points"));

		const guttaItem = norm.materials.find((m) => m.materialId === "mat_gutta_percha_points");
		assert.equal(guttaItem?.standardQuantity, 3); // 3 шт на канал

		const sealerItem = norm.materials.find((m) => m.materialId === "mat_sealer_ah_plus");
		assert.equal(sealerItem?.standardQuantity, 0.1); // 0.1 г

		const hypoItem = norm.materials.find((m) => m.materialId === "mat_hypochlorite_na_3");
		assert.equal(hypoItem?.standardQuantity, 10); // 10 мл

		const edtaItem = norm.materials.find((m) => m.materialId === "mat_edta_gel_17");
		assert.equal(edtaItem?.standardQuantity, 3); // 3 мл
	});

	it("Норма A16.07.054 (Установка имплантата) содержит имплантат, формирователь, халат, шовный материал и лезвие", () => {
		const norm = getOrder804nServiceNorm("A16.07.054");
		assert.ok(norm);
		assert.equal(norm.specialty, "implantology");

		const materialIds = norm.materials.map((m) => m.materialId);
		assert.ok(materialIds.includes("mat_implant_osstem_ts3"));
		assert.ok(materialIds.includes("mat_healing_abutment"));
		assert.ok(materialIds.includes("mat_surg_drape_gown_set"));
		assert.ok(materialIds.includes("mat_suture_vicryl_40"));
		assert.ok(materialIds.includes("mat_surg_blade_15"));
		assert.ok(materialIds.includes("mat_saline_500ml"));
	});

	it("Норма A16.07.004 (Анестезия) содержит карпулу артикаина 1.7 мл и иглу 30G", () => {
		const norm = getOrder804nServiceNorm("A16.07.004");
		assert.ok(norm);

		const anes = norm.materials.find((m) => m.materialId === "mat_articaine_ultracain");
		assert.ok(anes);
		assert.equal(anes.standardQuantity, 1);
	});
});

describe("FEFO (First Expired, First Out) Batch Selection & Expiry Engine", () => {
	const mockBatches: CabinetStockBatch[] = [
		{
			batchId: "batch_far_future",
			materialId: "mat_filtek_ultimate",
			cabinetId: "cab_01",
			cabinetNameRu: "Кабинет №1",
			lotNumber: "LOT-2029-A",
			expirationDate: "2029-12-31",
			manufactureDate: "2025-01-01",
			quantityAvailable: 10,
			criticalThreshold: 2,
			unitCostKopecks: 135000,
			supplierNameRu: "Поставщик 1",
		},
		{
			batchId: "batch_expiring_soon",
			materialId: "mat_filtek_ultimate",
			cabinetId: "cab_01",
			cabinetNameRu: "Кабинет №1",
			lotNumber: "LOT-2026-SOON",
			expirationDate: "2026-09-05", // 14 дней от 2026-08-22
			manufactureDate: "2023-09-01",
			quantityAvailable: 2,
			criticalThreshold: 1,
			unitCostKopecks: 130000,
			supplierNameRu: "Поставщик 2",
		},
		{
			batchId: "batch_expired",
			materialId: "mat_filtek_ultimate",
			cabinetId: "cab_01",
			cabinetNameRu: "Кабинет №1",
			lotNumber: "LOT-2025-OLD",
			expirationDate: "2025-12-31",
			manufactureDate: "2022-12-01",
			quantityAvailable: 5,
			criticalThreshold: 1,
			unitCostKopecks: 110000,
			supplierNameRu: "Поставщик 3",
		},
	];

	it("Выбирает наиболее раннюю неистекшую партию (FEFO)", () => {
		const result = findBestBatchFefo(
			"mat_filtek_ultimate",
			0.3,
			mockBatches,
			"cab_01",
			"2026-08-22",
		);

		assert.ok(result.batch);
		assert.equal(result.batch.batchId, "batch_expiring_soon");
		assert.equal(result.isExpiringSoon, true);
		assert.equal(result.isExpired, false);
		assert.ok(result.daysUntilExpiration !== undefined && result.daysUntilExpiration <= 30);
	});

	it("Правильно вычисляет количество дней до истечения срока годности", () => {
		const days1 = getDaysUntilExpiration("2026-08-30", "2026-08-22");
		assert.equal(days1, 8);

		const daysPast = getDaysUntilExpiration("2026-08-10", "2026-08-22");
		assert.equal(daysPast, -12);
	});

	it("Корректно обрабатывает отсутствие партий для материала", () => {
		const result = findBestBatchFefo(
			"non_existent_mat",
			1,
			mockBatches,
			"cab_01",
			"2026-08-22",
		);
		assert.equal(result.batch, undefined);
		assert.equal(result.isExpiringSoon, false);
		assert.equal(result.isExpired, false);
	});
});

describe("Multi-Service Aggregation & Quantity Scaling", () => {
	it("aggregateWriteoffFromServices агрегирует материалы для пломбирования и анестезии", () => {
		const services = [
			{
				serviceCode: "A16.07.002.001",
				toothNumber: 16,
				serviceTitle: "Пломбирование зуба",
			},
			{
				serviceCode: "A16.07.004",
				toothNumber: 16,
				serviceTitle: "Анестезия",
			},
		];

		const lines = aggregateWriteoffFromServices(
			services,
			DENTAL_CABINET_STOCK_PRESETS,
			"cab_01_therapy",
			"2026-08-22",
		);

		assert.ok(lines.length >= 10);

		const filtekLine = lines.find((l) => l.materialId === "mat_filtek_ultimate");
		assert.ok(filtekLine);
		assert.equal(filtekLine.standardQuantity, 0.3);
		assert.equal(filtekLine.actualQuantity, 0.3);
		assert.equal(filtekLine.discrepancyQuantity, 0);
		assert.equal(filtekLine.discrepancyReasonCode, "standard_consumption");

		const anesLine = lines.find((l) => l.materialId === "mat_articaine_ultracain");
		assert.ok(anesLine);
		assert.equal(anesLine.standardQuantity, 1);
		assert.equal(anesLine.lotNumber, "LOT-ULTRA-2026F");
	});

	it("Масштабирует расход при множителе услуги (например, 3 канала в эндодонтии)", () => {
		const endoService = [
			{
				serviceCode: "A16.07.008",
				toothNumber: 46,
				serviceTitle: "Пломбирование 3 каналов моляра",
				quantityMultiplier: 3, // 3 канала
			},
		];

		const lines = aggregateWriteoffFromServices(
			endoService,
			DENTAL_CABINET_STOCK_PRESETS,
			"cab_01_therapy",
			"2026-08-22",
		);

		const guttaLine = lines.find((l) => l.materialId === "mat_gutta_percha_points");
		assert.ok(guttaLine);
		// 3 шт * 3 канала = 9 шт
		assert.equal(guttaLine.standardQuantity, 9);
		assert.equal(guttaLine.actualQuantity, 9);

		const sealerLine = lines.find((l) => l.materialId === "mat_sealer_ah_plus");
		assert.ok(sealerLine);
		// 0.1 г * 3 канала = 0.3 г
		assert.equal(sealerLine.standardQuantity, 0.3);

		const hypoLine = lines.find((l) => l.materialId === "mat_hypochlorite_na_3");
		assert.ok(hypoLine);
		// 10 мл * 3 канала = 30 мл
		assert.equal(hypoLine.standardQuantity, 30);
	});
});

describe("Discrepancy Calculations & Kopeck-Exact Financials", () => {
	it("calculateLineCostKopecks считает точную стоимость целых и дробных количеств", () => {
		// 0.3 г композита по 1350.00 руб/г (135000 коп) = 405.00 руб (40500 коп)
		const cost1 = calculateLineCostKopecks(135000, 0.3);
		assert.equal(cost1, 40500);

		// 0.05 мл адгезива по 1950.00 руб/мл (195000 коп) = 97.50 руб -> 98 коп (9750 коп)
		const cost2 = calculateLineCostKopecks(195000, 0.05);
		assert.equal(cost2, 9750);

		// 2 карпулы по 230.00 руб (23000 коп) = 460.00 руб (46000 коп)
		const cost3 = calculateLineCostKopecks(23000, 2);
		assert.equal(cost3, 46000);
	});

	it("updateLineActualQuantity фиксирует отклонения и причину расхождения", () => {
		const sampleLine: ClinicalWriteoffLine = {
			id: "line_test_1",
			serviceCode: "A16.07.004",
			serviceTitle: "Анестезия",
			materialId: "mat_articaine_ultracain",
			sku: "ANES-ULTRA-DS",
			nameRu: "Ультракаин Д-С",
			category: "anesthesia",
			unit: "карп",
			okeiCode: "796",
			standardQuantity: 1,
			actualQuantity: 1,
			discrepancyQuantity: 0,
			discrepancyReasonCode: "standard_consumption",
			stockAvailable: 20,
			criticalThreshold: 5,
			stockStatus: "ok",
			unitCostKopecks: 23000, // 230 руб
			totalCostKopecks: 23000,
			isExpiringSoon: false,
			isExpired: false,
			isMandatory: true,
			requiresLotTracking: true,
			requiresSerialNumber: false,
		};

		// Врач добавил 2-ю карпулу
		const updated = updateLineActualQuantity(
			sampleLine,
			2,
			"additional_carpule",
			"Повторный вкол при лечении моляра",
		);

		assert.equal(updated.actualQuantity, 2);
		assert.equal(updated.discrepancyQuantity, 1);
		assert.equal(updated.discrepancyReasonCode, "additional_carpule");
		assert.equal(updated.discrepancyNotes, "Повторный вкол при лечении моляра");
		assert.equal(updated.totalCostKopecks, 46000); // 460 руб
	});

	it("calculateClinicalWriteoffTotals агрегирует общую себестоимость и стоимость расхождений", () => {
		const lines: ClinicalWriteoffLine[] = [
			{
				id: "l1",
				serviceCode: "A16.07.002.001",
				serviceTitle: "Пломбирование",
				materialId: "mat_filtek_ultimate",
				sku: "COMP-FILT-ULT",
				nameRu: "Filtek Ultimate",
				category: "composite",
				unit: "г",
				okeiCode: "166",
				standardQuantity: 0.3,
				actualQuantity: 0.5, // перерасход +0.2 г
				discrepancyQuantity: 0.2,
				discrepancyReasonCode: "anatomical_complexity",
				stockAvailable: 10,
				criticalThreshold: 2,
				stockStatus: "ok",
				unitCostKopecks: 135000, // 1350 руб/г
				totalCostKopecks: 67500, // 675.00 руб
				isExpiringSoon: false,
				isExpired: false,
				isMandatory: true,
				requiresLotTracking: true,
				requiresSerialNumber: false,
			},
			{
				id: "l2",
				serviceCode: "A16.07.004",
				serviceTitle: "Анестезия",
				materialId: "mat_articaine_ultracain",
				sku: "ANES-ULTRA-DS",
				nameRu: "Ультракаин",
				category: "anesthesia",
				unit: "карп",
				okeiCode: "796",
				standardQuantity: 1,
				actualQuantity: 1,
				discrepancyQuantity: 0,
				discrepancyReasonCode: "standard_consumption",
				stockAvailable: 20,
				criticalThreshold: 5,
				stockStatus: "ok",
				unitCostKopecks: 23000, // 230 руб
				totalCostKopecks: 23000,
				isExpiringSoon: false,
				isExpired: false,
				isMandatory: true,
				requiresLotTracking: true,
				requiresSerialNumber: false,
			},
		];

		const totals = calculateClinicalWriteoffTotals(lines, 2);
		assert.equal(totals.totalServicesCount, 2);
		assert.equal(totals.totalMaterialsCount, 2);
		assert.equal(totals.totalMaterialsQuantity, 1.5);
		// Общая стоимость: 675.00 + 230.00 = 905.00 руб = 90500 коп
		assert.equal(totals.totalCostKopecks, 90500);
		assert.equal(totals.totalCostRubles, 905.00);
		// Стоимость отклонения (0.2 г * 1350 руб = 270.00 руб = 27000 коп)
		assert.equal(totals.totalDiscrepancyCostKopecks, 27000);
		assert.equal(totals.totalDiscrepancyCostRubles, 270.00);
		assert.ok(totals.totalCostFormatted.includes("905,00"));
	});
});

describe("Document Validation Engine", () => {
	it("Валидация успешна для корректно заполненного документа", () => {
		const result = validateWriteoffDocument({
			patientName: "Алексей Смирнов",
			doctorFullName: "Кузнецов М.С.",
			lines: [
				{
					id: "1",
					serviceCode: "A16.07.004",
					serviceTitle: "Анестезия",
					materialId: "mat_articaine_ultracain",
					sku: "ANES-ULTRA-DS",
					nameRu: "Ультракаин",
					category: "anesthesia",
					unit: "карп",
					okeiCode: "796",
					standardQuantity: 1,
					actualQuantity: 1,
					discrepancyQuantity: 0,
					discrepancyReasonCode: "standard_consumption",
					stockAvailable: 10,
					criticalThreshold: 2,
					stockStatus: "ok",
					unitCostKopecks: 23000,
					totalCostKopecks: 23000,
					isExpiringSoon: false,
					isExpired: false,
					isMandatory: true,
					requiresLotTracking: true,
					requiresSerialNumber: false,
				},
			],
		});

		assert.equal(result.isValid, true);
		assert.equal(result.errors.length, 0);
	});

	it("Блокирует документ без ФИО пациента или врача", () => {
		const result = validateWriteoffDocument({
			patientName: "",
			doctorFullName: "",
			lines: [],
		});

		assert.equal(result.isValid, false);
		assert.ok(result.errors.some((e) => e.includes("пациента")));
		assert.ok(result.errors.some((e) => e.includes("врача")));
		assert.ok(result.errors.some((e) => e.includes("хотя бы одну")));
	});

	it("Блокирует списание имплантата без серийного номера (МДЛП)", () => {
		const result = validateWriteoffDocument({
			patientName: "Алексей Смирнов",
			doctorFullName: "Кузнецов М.С.",
			lines: [
				{
					id: "1",
					serviceCode: "A16.07.054",
					serviceTitle: "Имплантация",
					materialId: "mat_implant_osstem_ts3",
					sku: "IMP-OSST-TS3",
					nameRu: "Имплантат Osstem",
					category: "implant",
					unit: "шт",
					okeiCode: "796",
					standardQuantity: 1,
					actualQuantity: 1,
					discrepancyQuantity: 0,
					discrepancyReasonCode: "standard_consumption",
					stockAvailable: 2,
					criticalThreshold: 1,
					stockStatus: "ok",
					unitCostKopecks: 1250000,
					totalCostKopecks: 1250000,
					isExpiringSoon: false,
					isExpired: false,
					isMandatory: true,
					requiresLotTracking: true,
					requiresSerialNumber: true,
					serialNumber: undefined, // НЕ УКАЗАН!
				},
			],
		});

		assert.equal(result.isValid, false);
		assert.ok(result.errors.some((e) => e.includes("серийного номера")));
	});

	it("Блокирует списание просроченной партии", () => {
		const result = validateWriteoffDocument({
			patientName: "Алексей Смирнов",
			doctorFullName: "Кузнецов М.С.",
			lines: [
				{
					id: "1",
					serviceCode: "A16.07.004",
					serviceTitle: "Анестезия",
					materialId: "mat_articaine_ultracain",
					sku: "ANES-ULTRA-DS",
					nameRu: "Ультракаин",
					category: "anesthesia",
					unit: "карп",
					okeiCode: "796",
					standardQuantity: 1,
					actualQuantity: 1,
					discrepancyQuantity: 0,
					discrepancyReasonCode: "standard_consumption",
					stockAvailable: 10,
					criticalThreshold: 2,
					stockStatus: "ok",
					unitCostKopecks: 23000,
					totalCostKopecks: 23000,
					isExpiringSoon: false,
					isExpired: true, // ПРОСРОЧЕНО!
					expirationDate: "2025-01-01",
					isMandatory: true,
					requiresLotTracking: true,
					requiresSerialNumber: false,
				},
			],
		});

		assert.equal(result.isValid, false);
		assert.ok(result.errors.some((e) => e.includes("истек")));
	});
});

describe("Statutory Write-off Act HTML Generators (0504230, M-11, TORG-16)", () => {
	const sampleDoc: ClinicalWriteoffDocument = {
		id: "doc_test_001",
		actNumber: "АКТ-СПИС-2026/08-101",
		actDate: "2026-08-22",
		patientId: "PAT-001",
		patientName: "Иванов Иван Иванович",
		patientBirthDate: "1990-05-15",
		doctorFullName: "Кузнецов М.С.",
		doctorSpecialty: "Врач-стоматолог терапевт",
		assistantFullName: "Смирнова А.В.",
		cabinetId: "cab_01_therapy",
		cabinetNameRu: "Кабинет №1 (Терапия)",
		completedServices: [
			{
				serviceCode: "A16.07.002.001",
				toothNumber: 26,
				serviceTitle: "Пломбирование зуба",
			},
		],
		lines: [
			{
				id: "l1",
				serviceCode: "A16.07.002.001",
				serviceTitle: "Пломбирование зуба",
				toothNumber: 26,
				materialId: "mat_filtek_ultimate",
				sku: "COMP-FILT-ULT",
				nameRu: "Нанокомпозит Filtek Ultimate",
				category: "composite",
				unit: "г",
				okeiCode: "166",
				standardQuantity: 0.3,
				actualQuantity: 0.3,
				discrepancyQuantity: 0,
				discrepancyReasonCode: "standard_consumption",
				lotNumber: "LOT-FLT-8821",
				expirationDate: "2027-11-30",
				stockAvailable: 12,
				criticalThreshold: 2,
				stockStatus: "ok",
				unitCostKopecks: 135000,
				totalCostKopecks: 40500,
				isExpiringSoon: false,
				isExpired: false,
				isMandatory: true,
				requiresLotTracking: true,
				requiresSerialNumber: false,
			},
		],
		totals: {
			totalServicesCount: 1,
			totalMaterialsCount: 1,
			totalMaterialsQuantity: 0.3,
			totalCostKopecks: 40500,
			totalCostFormatted: "405,00 ₽",
			totalCostRubles: 405.00,
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
	};

	it("generateAct0504230Html формирует официальный Акт о списании по ОКУД 0504230", () => {
		const html = generateAct0504230Html(sampleDoc);

		assert.ok(html.includes("0504230"));
		assert.ok(html.includes("АКТ О СПИСАНИИ МАТЕРИАЛЬНЫХ ЗАПАСОВ"));
		assert.ok(html.includes("АКТ-СПИС-2026/08-101"));
		assert.ok(html.includes("Иванов Иван Иванович"));
		assert.ok(html.includes("Кузнецов М.С."));
		assert.ok(html.includes("Кабинет №1 (Терапия)"));
		assert.ok(html.includes("Нанокомпозит Filtek Ultimate"));
		assert.ok(html.includes("LOT-FLT-8821"));
		assert.ok(html.includes("405.00"));
		assert.ok(html.includes("Приказ Минфина России № 52н"));
	});

	it("generateFormM11Html формирует Требование-накладную по форме М-11", () => {
		const html = generateFormM11Html(sampleDoc);

		assert.ok(html.includes("0315003"));
		assert.ok(html.includes("ТРЕБОВАНИЕ-НАКЛАДНАЯ"));
		assert.ok(html.includes("М-11"));
		assert.ok(html.includes("COMP-FILT-ULT"));
		assert.ok(html.includes("405.00"));
	});

	it("generateTorg16Html формирует Акт о списании товаров ТОРГ-16", () => {
		const html = generateTorg16Html(sampleDoc);

		assert.ok(html.includes("0330216"));
		assert.ok(html.includes("ТОРГ-16"));
		assert.ok(html.includes("АКТ О СПИСАНИИ ТОВАРОВ"));
		assert.ok(html.includes("Нанокомпозит Filtek Ultimate"));
	});
});

describe("CSV Export (RFC 4180 with UTF-8 BOM)", () => {
	it("exportClinicalWriteoffToCsv генерирует корректный CSV с заголовками и BOM", () => {
		const sampleDoc: ClinicalWriteoffDocument = {
			id: "doc_1",
			actNumber: "АКТ-001",
			actDate: "2026-08-22",
			patientName: "Алексей Смирнов",
			doctorFullName: "Кузнецов М.С.",
			doctorSpecialty: "Врач",
			cabinetId: "cab_01",
			cabinetNameRu: "Кабинет №1",
			completedServices: [],
			lines: [
				{
					id: "l1",
					serviceCode: "A16.07.004",
					serviceTitle: "Анестезия",
					materialId: "mat_articaine_ultracain",
					sku: "ANES-ULTRA-DS",
					nameRu: "Ультракаин",
					category: "anesthesia",
					unit: "карп",
					okeiCode: "796",
					standardQuantity: 1,
					actualQuantity: 1,
					discrepancyQuantity: 0,
					discrepancyReasonCode: "standard_consumption",
					lotNumber: "LOT-1",
					expirationDate: "2028-01-01",
					stockAvailable: 10,
					criticalThreshold: 2,
					stockStatus: "ok",
					unitCostKopecks: 23000,
					totalCostKopecks: 23000,
					isExpiringSoon: false,
					isExpired: false,
					isMandatory: true,
					requiresLotTracking: true,
					requiresSerialNumber: false,
				},
			],
			totals: {
				totalServicesCount: 1,
				totalMaterialsCount: 1,
				totalMaterialsQuantity: 1,
				totalCostKopecks: 23000,
				totalCostFormatted: "230,00 ₽",
				totalCostRubles: 230.00,
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
		};

		const csv = exportClinicalWriteoffToCsv([sampleDoc]);

		assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
		assert.ok(csv.includes("№ акта;Дата акта;Пациент;Врач"));
		assert.ok(csv.includes("\"АКТ-001\""));
		assert.ok(csv.includes("\"Алексей Смирнов\""));
		assert.ok(csv.includes("230.00"));
	});
});

describe("React SSR-Safety & Component Rendering", () => {
	it("ClinicalWriteoffModal рендерится в статический HTML без сбоев", () => {
		const html = renderToStaticMarkup(
			createElement(ClinicalWriteoffModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнов Алексей Викторович",
				doctorFullName: "Д-р Кузнецов М.С.",
				initialServices: [
					{
						serviceCode: "A16.07.002.001",
						toothNumber: 26,
						serviceTitle: "Пломбирование кариеса",
					},
				],
			}),
		);

		assert.ok(html.includes("data-testid=\"clinical-writeoff-modal\""));
		assert.ok(html.includes("Клиническое автосписание материалов (Приказ № 804н)"));
		assert.ok(html.includes("Смирнов Алексей Викторович"));
		assert.ok(html.includes("Д-р Кузнецов М.С."));
		assert.ok(html.includes("A16.07.002.001"));
		assert.ok(html.includes("Зуб №26"));
		assert.ok(html.includes("Списать материалы в наряд"));
		assert.ok(html.includes("Акт 0504230 (Минфин 52н)"));
	});

	it("ClinicalWriteoffModal возвращает пустую строку при isOpen = false", () => {
		const html = renderToStaticMarkup(
			createElement(ClinicalWriteoffModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});
});
