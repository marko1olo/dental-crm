import assert from "node:assert/strict";
import test from "node:test";
import {
	calculateTransferTotals,
	exportTransferJournalToCsv,
	formatRubCurrency,
	generateDiscrepancyAct,
	generateTorg13Html,
	generateTorg2Html,
	kopecksToRubles,
	rublesToKopecks,
	validateTransferDraft,
	type WarehouseTransferDocument,
	type WarehouseTransferLineItem,
} from "../components/inventory/transfers/warehouseTransferEngine.js";
import {
	getWarehouseBranch,
	getWarehouseItemCatalogPreset,
	TRANSFER_STATUS_PIPELINE,
	WAREHOUSE_BRANCHES,
	WAREHOUSE_CATALOG_PRESETS,
} from "../components/inventory/transfers/warehouseTransferPresets.js";
import { WarehouseTransferModal } from "../components/inventory/transfers/WarehouseTransferModal.js";

test("Warehouse Transfers Presets: branches catalog & central hub integrity", () => {
	assert.equal(WAREHOUSE_BRANCHES.length, 4, "Must define 4 clinic warehouse branches");

	const central = getWarehouseBranch("central_hub");
	assert.equal(central.isCentralHub, true);
	assert.equal(central.code, "ЦС-01");
	assert.ok(central.okpoCode.length >= 8);
	assert.ok(central.responsiblePersonRu.length > 3);

	const branchCenter = getWarehouseBranch("branch_center");
	assert.equal(branchCenter.isCentralHub, false);
	assert.equal(branchCenter.code, "ФИЛ-01");
});

test("Warehouse Transfers Presets: dental consumables catalog categories and stock presets", () => {
	assert.ok(WAREHOUSE_CATALOG_PRESETS.length >= 8);

	const categories = new Set(WAREHOUSE_CATALOG_PRESETS.map((item) => item.category));
	assert.ok(categories.has("anesthetics"));
	assert.ok(categories.has("suture"));
	assert.ok(categories.has("implants"));
	assert.ok(categories.has("composites"));
	assert.ok(categories.has("impression"));
	assert.ok(categories.has("disinfection_ppe"));

	const ultracain = getWarehouseItemCatalogPreset("mat_ultracain_forte");
	assert.ok(ultracain);
	assert.equal(ultracain.sku, "AN-ULTRA-01");
	assert.equal(ultracain.okeiCode, "778");
	assert.equal(ultracain.unitCostKopecks, 650000); // 6 500 руб
	assert.ok(ultracain.initialStockByBranch.central_hub >= 100);
});

test("Warehouse Transfers Engine: total sums, kopeck precision, and discrepancy tracking", () => {
	const items: WarehouseTransferLineItem[] = [
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
			receivedQuantity: 8, // Недостача 2 уп
			unitCostKopecks: 650000, // 6 500 руб
			discrepancyType: "shortage",
			discrepancyQuantity: 2,
		},
		{
			itemId: "mat_impl_osstem_40_10",
			sku: "IMP-OSST-4010",
			nameRu: "Дентальный имплантат Osstem",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-OS-5541",
			expiryDate: "2029-06-30",
			requestedQuantity: 5,
			dispatchedQuantity: 5,
			receivedQuantity: 5, // Принято полностью
			unitCostKopecks: 1250000, // 12 500 руб
			discrepancyType: "none",
		},
	];

	const totals = calculateTransferTotals(items);

	// Отпущено: (10 * 6500) + (5 * 12500) = 65 000 + 62 500 = 127 500 руб
	assert.equal(totals.totalDispatchedCostRubles, 127500);
	assert.equal(totals.totalDispatchedCostKopecks, 12750000);

	// Принято: (8 * 6500) + (5 * 12500) = 52 000 + 62 500 = 114 500 руб
	assert.equal(totals.totalReceivedCostRubles, 114500);

	// Недостача: 2 * 6500 = 13 000 руб
	assert.equal(totals.hasDiscrepancy, true);
	assert.equal(totals.totalDiscrepancyDamageRubles, 13000);
	assert.equal(totals.totalDiscrepancyDamageKopecks, 1300000);
});

test("Warehouse Transfers Engine: draft validation rules (same branch, empty, stock limit, expiry)", () => {
	const validItems: WarehouseTransferLineItem[] = [
		{
			itemId: "mat_ultracain_forte",
			sku: "AN-ULTRA-01",
			nameRu: "Ультракаин",
			unitRu: "упак",
			okeiCode: "778",
			batchNumber: "LOT-1",
			expiryDate: "2028-01-01",
			requestedQuantity: 5,
			dispatchedQuantity: 5,
			receivedQuantity: 5,
			unitCostKopecks: 650000,
		},
	];

	// 1. Успешная валидация
	const valid = validateTransferDraft("central_hub", "branch_center", validItems);
	assert.equal(valid.isValid, true);
	assert.equal(valid.errors.length, 0);

	// 2. Ошибка: склад-отправитель совпадает с получателем
	const sameBranch = validateTransferDraft("central_hub", "central_hub", validItems);
	assert.equal(sameBranch.isValid, false);
	assert.ok(sameBranch.errors.some((e) => e.includes("не могут совпадать")));

	// 3. Ошибка: пустой список
	const emptyItems = validateTransferDraft("central_hub", "branch_center", []);
	assert.equal(emptyItems.isValid, false);

	// 4. Ошибка: просроченный товар
	const expiredItems: WarehouseTransferLineItem[] = [
		{
			...validItems[0]!,
			expiryDate: "2024-01-01",
		},
	];
	const expiredCheck = validateTransferDraft("central_hub", "branch_center", expiredItems);
	assert.equal(expiredCheck.isValid, false);
	assert.ok(expiredCheck.errors.some((e) => e.includes("истек")));

	// 5. Ошибка: недостаточно остатка на складе-отправителе
	const stockMap = {
		central_hub: { mat_ultracain_forte: 2 },
		branch_center: {},
		branch_north: {},
		branch_south: {},
	};
	const overstockCheck = validateTransferDraft("central_hub", "branch_center", validItems, stockMap);
	assert.equal(overstockCheck.isValid, false);
	assert.ok(overstockCheck.errors.some((e) => e.includes("Недостаточно остатка")));
});

test("Warehouse Transfers Engine: Discrepancy Act (TORG-2) and printable HTML forms generation", () => {
	const doc: WarehouseTransferDocument = {
		id: "doc-1",
		documentNumber: "ТОРГ-13-2026/08-044",
		documentDate: "2026-08-22",
		sourceBranchId: "central_hub",
		targetBranchId: "branch_center",
		status: "discrepancy",
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
				receivedQuantity: 8,
				unitCostKopecks: 650000,
				discrepancyType: "shortage",
				discrepancyQuantity: 2,
				discrepancyNotes: "Недостача при вскрытии опломбированной коробки",
			},
		],
		dispatchedByFullName: "Васильев О.П.",
		dispatchedByPosition: "Заведующий складом",
		receivedByFullName: "Смирнова А.В.",
		receivedByPosition: "Главная медсестра",
	};

	// Акт расхождений
	const act = generateDiscrepancyAct(doc);
	assert.ok(act.actNumber.includes("АКТ-РАСХ"));
	assert.equal(act.totalFinancialDamageRubles, 13000);
	assert.equal(act.totalDiscrepantItemsCount, 1);
	assert.equal(act.commissionMembers.length >= 2, true);

	// HTML ТОРГ-13
	const torg13Html = generateTorg13Html(doc);
	assert.ok(torg13Html.includes("Унифицированная форма № ТОРГ-13"));
	assert.ok(torg13Html.includes("0330213"));
	assert.ok(torg13Html.includes("Ультракаин Д-С Форте"));
	assert.ok(torg13Html.includes("65000.00"));

	// HTML ТОРГ-2
	const torg2Html = generateTorg2Html(act);
	assert.ok(torg2Html.includes("АКТ ОБ УСТАНОВЛЕННОМ РАСХОЖДЕНИИ"));
	assert.ok(torg2Html.includes("13000.00"));

	// Экспорт CSV
	const csv = exportTransferJournalToCsv([doc]);
	assert.ok(csv.startsWith("\uFEFF"));
	assert.ok(csv.includes("ТОРГ-13-2026/08-044"));
});

test("WarehouseTransferModal: component export and contract verification", () => {
	assert.equal(typeof WarehouseTransferModal, "function");
	assert.equal(typeof calculateTransferTotals, "function");
	assert.equal(typeof kopecksToRubles, "function");
	assert.equal(typeof rublesToKopecks, "function");
	assert.equal(typeof formatRubCurrency, "function");
});
