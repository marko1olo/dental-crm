/**
 * warehouseTransfersTorg2.test.ts — Тесты межфилиальных перемещений ТМЦ,
 * накладных ТОРГ-13, актов расхождений ТОРГ-2 и контроля сроков годности/остатков.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type WarehouseDiscrepancyAct,
	type WarehouseTransferDocument,
	type WarehouseTransferLineItem,
	calculateTransferTotals,
	exportTransferJournalToCsv,
	formatRubCurrency,
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
	kopecksToRubles,
	rublesToKopecks,
	validateTransferDraft,
} from "../warehouseTransferEngine.js";
import {
	TRANSFER_STATUS_PIPELINE,
	WAREHOUSE_BRANCHES,
	WAREHOUSE_CATALOG_PRESETS,
	getWarehouseBranch,
	getWarehouseItemCatalogPreset,
} from "../warehouseTransferPresets.js";
import { WarehouseTransferModal } from "../WarehouseTransferModal.js";

describe("Warehouse Transfer Logistics & Preset Catalogs", () => {
	it("Каталог филиалов содержит Центральный склад (ЦС) и периферийные филиалы сети", () => {
		const branchIds = WAREHOUSE_BRANCHES.map((b) => b.id);
		assert.ok(branchIds.includes("central_hub"));
		assert.ok(branchIds.includes("branch_center"));
		assert.ok(branchIds.includes("branch_north"));
		assert.ok(branchIds.includes("branch_south"));

		const central = getWarehouseBranch("central_hub");
		assert.equal(central.isCentralHub, true);
		assert.equal(central.code, "ЦС-01");
		assert.ok(central.okpoCode.length > 0);
	});

	it("Каталог ТМЦ содержит все ключевые категории: анестетики, шовный материал, имплантаты, композиты", () => {
		const categories = new Set(WAREHOUSE_CATALOG_PRESETS.map((p) => p.category));
		assert.ok(categories.has("anesthetics"));
		assert.ok(categories.has("suture"));
		assert.ok(categories.has("implants"));
		assert.ok(categories.has("composites"));
		assert.ok(categories.has("disinfection_ppe"));

		for (const preset of WAREHOUSE_CATALOG_PRESETS) {
			assert.ok(preset.unitCostKopecks > 0);
			assert.ok(preset.sku.length > 0);
			assert.ok(preset.okeiCode.length > 0);
		}
	});

	it("Пайплайн статусов перемещения содержит все этапы жизненного цикла", () => {
		const statuses = Object.keys(TRANSFER_STATUS_PIPELINE);
		assert.ok(statuses.includes("draft"));
		assert.ok(statuses.includes("requested"));
		assert.ok(statuses.includes("dispatched"));
		assert.ok(statuses.includes("in_transit"));
		assert.ok(statuses.includes("received_ok"));
		assert.ok(statuses.includes("discrepancy"));
	});
});

describe("Kopeck-Exact Transfer Totals & Validation", () => {
	const sampleItems: readonly WarehouseTransferLineItem[] = [
		{
			itemId: "mat_ultracain_forte",
			sku: "AN-ULTRA-01",
			nameRu: "Ультракаин Д-С Форте",
			unitRu: "упак",
			okeiCode: "778",
			batchNumber: "LOT-2026A44",
			expiryDate: "2027-12-31",
			requestedQuantity: 10,
			dispatchedQuantity: 10,
			receivedQuantity: 10,
			unitCostKopecks: 650000, // 6 500.00 ₽
			discrepancyType: "none",
		},
		{
			itemId: "mat_impl_osstem_40_10",
			sku: "IMP-OSST-4010",
			nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-OS-5541",
			expiryDate: "2029-06-30",
			requestedQuantity: 5,
			dispatchedQuantity: 5,
			receivedQuantity: 4, // 1 шт недостача
			unitCostKopecks: 1250000, // 12 500.00 ₽
			discrepancyType: "shortage",
			discrepancyQuantity: 1,
		},
	];

	it("calculateTransferTotals рассчитывает точные суммы отпуска, приемки и ущерба в копейках", () => {
		const totals = calculateTransferTotals(sampleItems);

		// Отпущено: (10 * 6500) + (5 * 12500) = 65000 + 62500 = 127500.00 ₽ = 12750000 коп
		assert.equal(totals.totalDispatchedCostKopecks, 12750000);
		assert.equal(totals.totalDispatchedCostRubles, 127500);

		// Принято: (10 * 6500) + (4 * 12500) = 65000 + 50000 = 115000.00 ₽ = 11500000 коп
		assert.equal(totals.totalReceivedCostKopecks, 11500000);
		assert.equal(totals.totalReceivedCostRubles, 115000);

		// Недостача: 1 имплантат = 12500.00 ₽ = 1250000 коп
		assert.equal(totals.hasDiscrepancy, true);
		assert.equal(totals.totalDiscrepancyDamageKopecks, 1250000);
		assert.equal(totals.totalDiscrepancyDamageRubles, 12500);
	});

	it("validateTransferDraft запрещает перемещение между одинаковыми складами и просроченные ТМЦ", () => {
		// 1. Одинаковые склады
		const invalidSameBranch = validateTransferDraft("central_hub", "central_hub", sampleItems);
		assert.equal(invalidSameBranch.isValid, false);
		assert.ok(invalidSameBranch.errors.some((e) => e.includes("не могут совпадать")));

		// 2. Просроченный товар
		const expiredItem: WarehouseTransferLineItem = {
			...sampleItems[0]!,
			expiryDate: "2025-01-01", // истек
		};
		const invalidExpired = validateTransferDraft("central_hub", "branch_center", [expiredItem]);
		assert.equal(invalidExpired.isValid, false);
		assert.ok(invalidExpired.errors.some((e) => e.includes("истек") || e.includes("запрещено")));

		// 3. Валидный черновик
		const validDraft = validateTransferDraft("central_hub", "branch_center", sampleItems);
		assert.equal(validDraft.isValid, true);
		assert.equal(validDraft.errors.length, 0);
	});
});

describe("TORG-13 & TORG-2 Document Generation", () => {
	const sampleDoc: WarehouseTransferDocument = {
		id: "doc-torg-01",
		documentNumber: "ТОРГ-13-2026/08-044",
		documentDate: "2026-08-22",
		sourceBranchId: "central_hub",
		targetBranchId: "branch_center",
		status: "discrepancy",
		dispatchedByFullName: "Васильев О.П.",
		dispatchedByPosition: "Заведующий складом",
		receivedByFullName: "Смирнова А.В.",
		receivedByPosition: "Главная медсестра",
		items: [
			{
				itemId: "mat_ultracain_forte",
				sku: "AN-ULTRA-01",
				nameRu: "Ультракаин Д-С Форте",
				unitRu: "упак",
				okeiCode: "778",
				batchNumber: "LOT-2026A44",
				expiryDate: "2027-12-31",
				requestedQuantity: 10,
				dispatchedQuantity: 10,
				receivedQuantity: 10,
				unitCostKopecks: 650000,
				discrepancyType: "none",
			},
			{
				itemId: "mat_impl_osstem_40_10",
				sku: "IMP-OSST-4010",
				nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-OS-5541",
				expiryDate: "2029-06-30",
				requestedQuantity: 5,
				dispatchedQuantity: 5,
				receivedQuantity: 4,
				unitCostKopecks: 1250000,
				discrepancyType: "shortage",
				discrepancyQuantity: 1,
			},
		],
	};

	it("generateTorg13Html генерирует официальную форму ТОРГ-13 (ОКУД 0330213)", () => {
		const html = generateTorg13Html(sampleDoc);
		assert.ok(html.includes("0330213"), "Форма по ОКУД 0330213 обязана присутствовать");
		assert.ok(html.includes("ТОРГ-13"));
		assert.ok(html.includes("НАКЛАДНАЯ НА ВНУТРЕННЕЕ ПЕРЕМЕЩЕНИЕ"));
		assert.ok(html.includes("Ультракаин Д-С Форте"));
		assert.ok(html.includes("127500.00"));
		assert.ok(html.includes("Васильев О.П."));
		assert.ok(html.includes("Смирнова А.В."));
	});

	it("generateDiscrepancyAct и generateTorg2Html формируют Акт расхождений ТОРГ-2", () => {
		const act: WarehouseDiscrepancyAct = generateDiscrepancyAct(sampleDoc);
		assert.equal(act.totalDiscrepantItemsCount, 1);
		assert.equal(act.totalFinancialDamageRubles, 12500);
		assert.ok(act.commissionMembers.length >= 2);

		const html = generateTorg2Html(act);
		assert.ok(html.includes("АКТ ОБ УСТАНОВЛЕННОМ РАСХОЖДЕНИИ"));
		assert.ok(html.includes("12500.00"));
		assert.ok(html.includes("Osstem TS III"));
		assert.ok(html.includes("Недостача"));
	});

	it("exportTransferJournalToCsv формирует CSV-реестр перемещений с UTF-8 BOM", () => {
		const csv = exportTransferJournalToCsv([sampleDoc]);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("ТОРГ-13-2026/08-044"));
		assert.ok(csv.includes("127500.00"));
		assert.ok(csv.includes("12500.00"));
	});
});

describe("SSR Rendering of WarehouseTransferModal", () => {
	it("Рендерит модальное окно перемещений в статический HTML", () => {
		const html = renderToStaticMarkup(
			createElement(WarehouseTransferModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(html.includes("Межфилиальное Перемещение ТМЦ"));
		assert.ok(html.includes("ТОРГ-13"));
		assert.ok(html.includes("Склад-отправитель"));
		assert.ok(html.includes("Склад-получатель"));
		assert.ok(html.includes("Накладная ТОРГ-13 (А4)"));
	});
});
