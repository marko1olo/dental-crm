/**
 * ============================================================================
 * warehouseInventoryEngine.test.ts — Исчерпывающие тесты складской инвентаризации,
 * сличительных ведомостей ИНВ-19, описей ИНВ-3, FEFO партионного контроля и актов ТОРГ-16.
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	DEFAULT_COMMISSION_MEMBERS,
	DEFAULT_INVENTORY_ITEMS_PRESET,
	type WarehouseAuditItemLine,
	type WarehouseInventoryAuditDocument,
	calculateDaysUntilExpiration,
	calculateFefoStatus,
	calculateInventoryAuditTotals,
	computeAuditLineItem,
	exportInv19DiscrepanciesToCsv,
	exportInventoryTo1C,
	exportInventoryToCsv,
	formatKopecksToRublesPlain,
	formatRubCurrency,
	generateInv19Html,
	generateInv3Html,
	generateTorg16ActFromInventory,
	generateTorg16Html,
	kopecksToRubles,
	numberToRussianWordsKopecks,
	rublesToKopecks,
	sortAuditItemsByFefo,
	validateInventoryAuditDraft,
} from "../warehouseInventoryEngine.js";
import { WarehouseInventoryAuditModal } from "../WarehouseInventoryAuditModal.js";

describe("Warehouse Inventory Engine & Preset Catalogs", () => {
	it("Эталонный набор инвентаризации содержит все ключевые позиции и категории стоматологического склада", () => {
		assert.ok(DEFAULT_INVENTORY_ITEMS_PRESET.length >= 8);

		const categories = new Set(DEFAULT_INVENTORY_ITEMS_PRESET.map((i) => i.category));
		assert.ok(categories.has("Анестетики"));
		assert.ok(categories.has("Композиты и адгезивы"));
		assert.ok(categories.has("Имплантология"));
		assert.ok(categories.has("Хирургия и шовный материал"));

		for (const item of DEFAULT_INVENTORY_ITEMS_PRESET) {
			assert.ok(item.itemId.length > 0);
			assert.ok(item.sku.length > 0);
			assert.ok(item.nameRu.length > 0);
			assert.ok(item.batchNumber.length > 0);
			assert.ok(item.expiryDate.length === 10);
			assert.ok(item.unitCostKopecks > 0);
		}
	});

	it("Эталонная инвентаризационная комиссия содержит председателя, МОЛ, медсестру и бухгалтера", () => {
		assert.equal(DEFAULT_COMMISSION_MEMBERS.length, 4);

		const roles = DEFAULT_COMMISSION_MEMBERS.map((c) => c.role);
		assert.ok(roles.includes("chairman"));
		assert.ok(roles.includes("mol"));
		assert.ok(roles.includes("member"));
		assert.ok(roles.includes("accountant"));

		for (const member of DEFAULT_COMMISSION_MEMBERS) {
			assert.ok(member.fullName.length > 0);
			assert.ok(member.position.length > 0);
		}
	});
});

describe("FEFO Expiration Tracking & Days Calculation", () => {
	const refDate = "2026-08-28";

	it("Рассчитывает точную разницу в днях между датой срока годности и контрольной датой", () => {
		assert.equal(calculateDaysUntilExpiration("2026-08-28", refDate), 0);
		assert.equal(calculateDaysUntilExpiration("2026-08-29", refDate), 1);
		assert.equal(calculateDaysUntilExpiration("2026-09-27", refDate), 30);
		assert.equal(calculateDaysUntilExpiration("2026-08-20", refDate), -8);
	});

	it("Определяет статус 'expired' (Просрочен) для партий с истекшим сроком годности", () => {
		const res1 = calculateFefoStatus("2026-08-15", refDate);
		assert.equal(res1.fefoStatus, "expired");
		assert.equal(res1.badgeLabelRu, "Просрочен");
		assert.equal(res1.hexColor, "#ef4444");

		const resToday = calculateFefoStatus("2026-08-28", refDate);
		assert.equal(resToday.fefoStatus, "expired");
	});

	it("Определяет статус 'warning_30' (< 30 дней) для партий критического срока", () => {
		const res = calculateFefoStatus("2026-09-15", refDate); // 18 дней
		assert.equal(res.fefoStatus, "warning_30");
		assert.ok(res.badgeLabelRu.includes("< 30 дней"));
		assert.equal(res.hexColor, "#f97316");
	});

	it("Определяет статус 'warning_60' (< 60 дней) для партий умеренного срока", () => {
		const res = calculateFefoStatus("2026-10-15", refDate); // 48 дней
		assert.equal(res.fefoStatus, "warning_60");
		assert.ok(res.badgeLabelRu.includes("< 60 дней"));
		assert.equal(res.hexColor, "#eab308");
	});

	it("Определяет статус 'fresh' (Свежий) для партий со сроком более 60 дней", () => {
		const res = calculateFefoStatus("2027-12-31", refDate);
		assert.equal(res.fefoStatus, "fresh");
		assert.ok(res.badgeLabelRu.includes("Свежий"));
		assert.equal(res.hexColor, "#10b981");
	});

	it("Сортирует список ТМЦ по FEFO: сначала партии с наименьшим оставшимся сроком", () => {
		const sorted = sortAuditItemsByFefo(DEFAULT_INVENTORY_ITEMS_PRESET);
		for (let i = 0; i < sorted.length - 1; i++) {
			const curr = sorted[i];
			const next = sorted[i + 1];
			if (curr && next) {
				assert.ok(
					curr.daysUntilExpiration <= next.daysUntilExpiration,
					`Партия ${curr.nameRu} (${curr.daysUntilExpiration} дн.) должна предшествовать ${next.nameRu} (${next.daysUntilExpiration} дн.)`,
				);
			}
		}
	});
});

describe("Kopeck-Exact Financial Arithmetic & Russian Word Numerals", () => {
	it("Корректно переводит копейки в рубли и рубли в копейки без потери точности", () => {
		assert.equal(kopecksToRubles(100), 1.0);
		assert.equal(kopecksToRubles(125045), 1250.45);
		assert.equal(rublesToKopecks(1250.45), 125045);
		assert.equal(formatKopecksToRublesPlain(650050), "6500.50");
	});

	it("Форматирует суммы в российском денежном формате", () => {
		const formatted = formatRubCurrency(1500.5, false);
		assert.ok(formatted.includes("1") && formatted.includes("500"));
	});

	it("Формирует корректную пропись сумм в рублях и копейках для актов", () => {
		assert.equal(
			numberToRussianWordsKopecks(0),
			"Ноль рублей 00 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(100),
			"Один рубль 00 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(250),
			"Два рубля 50 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(500),
			"Пять рублей 00 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(1254315),
			"Двенадцать тысяч пятьсот сорок три рубля 15 копеек",
		);
		assert.equal(
			numberToRussianWordsKopecks(100000000),
			"Один миллион рублей 00 копеек",
		);
	});
});

describe("Audit Line Calculations: Match, Surplus & Shortage", () => {
	const refDate = "2026-08-28";

	it("Вычисляет совпадение учетного и фактического наличия (match)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_1",
				sku: "SKU-01",
				nameRu: "Тестовый товар 1",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-1",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 50000, // 500 руб
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "match");
		assert.equal(line.discrepancyQuantity, 0);
		assert.equal(line.bookTotalKopecks, 500000);
		assert.equal(line.actualTotalKopecks, 500000);
		assert.equal(line.discrepancyCostKopecks, 0);
	});

	it("Вычисляет излишек ТМЦ (surplus)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_2",
				sku: "SKU-02",
				nameRu: "Тестовый товар 2",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-2",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 13, // +3 излишек
				unitCostKopecks: 20000, // 200 руб
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "surplus");
		assert.equal(line.discrepancyQuantity, 3);
		assert.equal(line.bookTotalKopecks, 200000);
		assert.equal(line.actualTotalKopecks, 260000);
		assert.equal(line.discrepancyCostKopecks, 60000); // 600 руб
	});

	it("Вычисляет недостачу ТМЦ (shortage)", () => {
		const line = computeAuditLineItem(
			{
				itemId: "test_3",
				sku: "SKU-03",
				nameRu: "Тестовый товар 3",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-3",
				expiryDate: "2027-01-01",
				bookQuantity: 10,
				actualQuantity: 7, // -3 недостача
				unitCostKopecks: 30000, // 300 руб
			},
			refDate,
		);

		assert.equal(line.discrepancyType, "shortage");
		assert.equal(line.discrepancyQuantity, -3);
		assert.equal(line.bookTotalKopecks, 300000);
		assert.equal(line.actualTotalKopecks, 210000);
		assert.equal(line.discrepancyCostKopecks, -90000); // -900 руб
	});
});

describe("Inventory Audit Totals Calculation", () => {
	it("Сводит общие балансовые показатели инвентаризации с копеечной точностью", () => {
		const sampleLines: readonly WarehouseAuditItemLine[] = [
			computeAuditLineItem({
				itemId: "item_1",
				sku: "SKU-1",
				nameRu: "Товар 1 (Норма)",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-1",
				expiryDate: "2027-12-31",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 100000, // 1 000 руб
			}),
			computeAuditLineItem({
				itemId: "item_2",
				sku: "SKU-2",
				nameRu: "Товар 2 (Излишек +2)",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-2",
				expiryDate: "2027-12-31",
				bookQuantity: 5,
				actualQuantity: 7,
				unitCostKopecks: 200000, // 2 000 руб
			}),
			computeAuditLineItem({
				itemId: "item_3",
				sku: "SKU-3",
				nameRu: "Товар 3 (Недостача -1)",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-3",
				expiryDate: "2027-12-31",
				bookQuantity: 8,
				actualQuantity: 7,
				unitCostKopecks: 150000, // 1 500 руб
			}),
			computeAuditLineItem({
				itemId: "item_4",
				sku: "SKU-4",
				nameRu: "Товар 4 (Просрочен)",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-4",
				expiryDate: "2026-01-01",
				bookQuantity: 3,
				actualQuantity: 3,
				unitCostKopecks: 80000, // 800 руб
			}),
		];

		const totals = calculateInventoryAuditTotals(sampleLines);

		assert.equal(totals.totalItemsCount, 4);
		assert.equal(totals.matchedItemsCount, 2); // item_1 и item_4
		assert.equal(totals.surplusItemsCount, 1);
		assert.equal(totals.shortageItemsCount, 1);
		assert.equal(totals.expiredItemsCount, 1);

		// Учетные и фактические количества
		assert.equal(totals.totalBookQuantity, 10 + 5 + 8 + 3); // 26
		assert.equal(totals.totalActualQuantity, 10 + 7 + 7 + 3); // 27
		assert.equal(totals.totalSurplusQuantity, 2);
		assert.equal(totals.totalShortageQuantity, 1);

		// Учетные и фактические суммы в копейках
		const expectedBookCost = 10 * 100000 + 5 * 200000 + 8 * 150000 + 3 * 80000; // 1000000 + 1000000 + 1200000 + 240000 = 3440000
		const expectedActualCost = 10 * 100000 + 7 * 200000 + 7 * 150000 + 3 * 80000; // 1000000 + 1400000 + 1050000 + 240000 = 3690000

		assert.equal(totals.totalBookCostKopecks, expectedBookCost);
		assert.equal(totals.totalActualCostKopecks, expectedActualCost);

		// Излишки и недостачи
		assert.equal(totals.totalSurplusCostKopecks, 2 * 200000); // 400000 (4 000 руб)
		assert.equal(totals.totalShortageCostKopecks, 1 * 150000); // 150000 (1 500 руб)

		// Чистое сальдо сверки (4000 - 1500 = +2500 руб = +250000 копеек)
		assert.equal(totals.netDiscrepancyCostKopecks, 250000);
		assert.equal(totals.netDiscrepancyCostRubles, 2500.0);
	});
});

describe("Document Validation (validateInventoryAuditDraft)", () => {
	it("Принимает корректно заполненный черновик инвентаризации", () => {
		const doc: WarehouseInventoryAuditDocument = {
			id: "doc_1",
			documentNumber: "ИНВ-2026-01",
			orderNumber: "ПР-44",
			orderDate: "2026-08-28",
			auditStartDate: "2026-08-28",
			auditEndDate: "2026-08-28",
			auditDate: "2026-08-28",
			branchId: "central_hub",
			branchNameRu: "Центральный склад",
			warehouseNameRu: "Склад №1",
			molFullName: "Васильев О.П.",
			molPosition: "Заведующий складом",
			status: "reconciliation",
			commission: DEFAULT_COMMISSION_MEMBERS,
			items: DEFAULT_INVENTORY_ITEMS_PRESET,
			organizationNameRu: "ООО ДЕНТЕ",
			organizationOkpo: "49201948",
			organizationInn: "7701984512",
		};

		const res = validateInventoryAuditDraft(doc);
		assert.equal(res.isValid, true);
		assert.equal(res.errors.length, 0);
	});

	it("Блокирует черновик с отсутствующими обязательными реквизитами", () => {
		const invalidDoc: Partial<WarehouseInventoryAuditDocument> = {
			documentNumber: "",
			orderNumber: "",
			molFullName: "",
			commission: [],
			items: [],
		};

		const res = validateInventoryAuditDraft(invalidDoc);
		assert.equal(res.isValid, false);
		assert.ok(res.errors.some((e) => e.includes("Номер инвентаризационной описи")));
		assert.ok(res.errors.some((e) => e.includes("Номер приказа")));
		assert.ok(res.errors.some((e) => e.includes("ФИО материально ответственного лица")));
		assert.ok(res.errors.some((e) => e.includes("Комиссия должна состоять")));
		assert.ok(res.errors.some((e) => e.includes("хотя бы одну позицию")));
	});
});

describe("TORG-16 Write-Off Act Generation for Expired Lots", () => {
	it("Автоматически извлекает просроченные партии в унифицированный акт ТОРГ-16", () => {
		const doc: WarehouseInventoryAuditDocument = {
			id: "doc_1",
			documentNumber: "ИНВ-2026-01",
			orderNumber: "ПР-44",
			orderDate: "2026-08-28",
			auditStartDate: "2026-08-28",
			auditEndDate: "2026-08-28",
			auditDate: "2026-08-28",
			branchId: "central_hub",
			branchNameRu: "Центральный склад",
			warehouseNameRu: "Склад №1",
			molFullName: "Васильев О.П.",
			molPosition: "Заведующий складом",
			status: "reconciliation",
			commission: DEFAULT_COMMISSION_MEMBERS,
			items: DEFAULT_INVENTORY_ITEMS_PRESET,
			organizationNameRu: "ООО ДЕНТЕ",
			organizationOkpo: "49201948",
			organizationInn: "7701984512",
		};

		const torg16 = generateTorg16ActFromInventory(doc);

		assert.ok(torg16.actNumber.includes("ТОРГ-16"));
		assert.ok(torg16.items.length >= 2, "В эталонном наборе должно быть минимум 2 просроченных позиции");

		for (const item of torg16.items) {
			assert.ok(item.totalCostKopecks > 0);
			assert.ok(item.defectDescriptionRu.includes("Истек срок годности"));
		}

		assert.equal(
			torg16.totalCostKopecks,
			torg16.items.reduce((sum, it) => sum + it.totalCostKopecks, 0),
		);
		assert.equal(
			torg16.totalQuantity,
			torg16.items.reduce((sum, it) => sum + it.quantity, 0),
		);
	});
});

describe("CSV & 1C CommerceML Exports", () => {
	const sampleDoc: WarehouseInventoryAuditDocument = {
		id: "doc_export",
		documentNumber: "ИНВ-2026-99",
		orderNumber: "ПР-99",
		orderDate: "2026-08-28",
		auditStartDate: "2026-08-28",
		auditEndDate: "2026-08-28",
		auditDate: "2026-08-28",
		branchId: "central_hub",
		branchNameRu: "Центральный склад",
		warehouseNameRu: "Склад №1",
		molFullName: "Васильев О.П.",
		molPosition: "Заведующий складом",
		status: "reconciliation",
		commission: DEFAULT_COMMISSION_MEMBERS,
		items: DEFAULT_INVENTORY_ITEMS_PRESET,
		organizationNameRu: "ООО ДЕНТЕ",
		organizationOkpo: "49201948",
		organizationInn: "7701984512",
	};

	it("Экспортирует полную инвентаризационную опись в CSV с UTF-8 BOM", () => {
		const csv = exportInventoryToCsv(sampleDoc);

		assert.ok(csv.startsWith("\uFEFF"), "CSV обязан начинаться с UTF-8 BOM для корректного открытия в Excel");
		assert.ok(csv.includes("№ п/п;Артикул;Наименование ТМЦ"));
		assert.ok(csv.includes("Ультракаин Д-С Форте"));
		assert.ok(csv.includes("Септанест с адреналином"));
	});

	it("Экспортирует сличительную ведомость ИНВ-19 в CSV (только расхождения)", () => {
		const csv = exportInv19DiscrepanciesToCsv(sampleDoc);

		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("Излишек (кол-во);Излишек (руб);Недостача (кол-во);Недостача (руб)"));
		assert.ok(csv.includes("Filtek"));
	});

	it("Экспортирует данные в XML-схему 1C CommerceML 2.09", () => {
		const xml = exportInventoryTo1C(sampleDoc);

		assert.ok(xml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
		assert.ok(xml.includes('<КоммерческаяИнформация ВерсияСхемы="2.09"'));
		assert.ok(xml.includes("<Документ.ИнвентаризацияТоваровНаСкладе>"));
		assert.ok(xml.includes("<Номер>ИНВ-2026-99</Номер>"));
		assert.ok(xml.includes("<СуммаУчетВсего>"));
		assert.ok(xml.includes("<СуммаФактВсего>"));
		assert.ok(xml.includes("</Документ.ИнвентаризацияТоваровНаСкладе>"));
	});
});

describe("Official Russian Print Forms Generation (HTML)", () => {
	const sampleDoc: WarehouseInventoryAuditDocument = {
		id: "doc_print",
		documentNumber: "ИНВ-2026-10",
		orderNumber: "ПР-10",
		orderDate: "2026-08-28",
		auditStartDate: "2026-08-28",
		auditEndDate: "2026-08-28",
		auditDate: "2026-08-28",
		branchId: "central_hub",
		branchNameRu: "Центральный склад",
		warehouseNameRu: "Главный аптечный склад",
		molFullName: "Васильев Олег Петрович",
		molPosition: "Заведующий складом",
		status: "reconciliation",
		commission: DEFAULT_COMMISSION_MEMBERS,
		items: DEFAULT_INVENTORY_ITEMS_PRESET,
		organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
		organizationOkpo: "49201948",
		organizationInn: "7701984512",
	};

	it("Формирует бланк формы ИНВ-3 (ОКУД 0317004) со всеми реквизитами и распиской МОЛ", () => {
		const html = generateInv3Html(sampleDoc);

		assert.ok(html.includes("0317004"));
		assert.ok(html.includes("ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ"));
		assert.ok(html.includes("Расписка:"));
		assert.ok(html.includes("Васильев Олег Петрович"));
		assert.ok(html.includes("ИТОГО ПО ОПИСИ:"));
		assert.ok(html.includes("Итого фактическая сумма прописью:"));
	});

	it("Формирует бланк формы ИНВ-19 (ОКУД 0317019) со сличительными колонками излишков и недостач", () => {
		const html = generateInv19Html(sampleDoc);

		assert.ok(html.includes("0317019"));
		assert.ok(html.includes("СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ"));
		assert.ok(html.includes("Излишки"));
		assert.ok(html.includes("Недостачи"));
		assert.ok(html.includes("Итого излишек прописью:"));
		assert.ok(html.includes("Итого недостача прописью:"));
	});

	it("Формирует бланк формы ТОРГ-16 (ОКУД 0330216) со списанием просроченных ТМЦ", () => {
		const torg16 = generateTorg16ActFromInventory(sampleDoc);
		const html = generateTorg16Html(torg16);

		assert.ok(html.includes("0330216"));
		assert.ok(html.includes("АКТ О СПИСАНИИ ТОВАРОВ"));
		assert.ok(html.includes("Причина списания:"));
		assert.ok(html.includes("ВСЕГО ПО АКТУ:"));
		assert.ok(html.includes("Итого сумма списания прописью:"));
	});
});

describe("WarehouseInventoryAuditModal React Component Rendering", () => {
	it("Успешно рендерится через SSR renderToStaticMarkup без падений и содержит ключевые элементы управления", () => {
		const markup = renderToStaticMarkup(
			createElement(WarehouseInventoryAuditModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		assert.ok(markup.includes("Складская инвентаризация и FEFO"));
		assert.ok(markup.includes("Книжный остаток"));
		assert.ok(markup.includes("Фактический остаток"));
		assert.ok(markup.includes("Сальдо сверки (ИНВ-19)"));
		assert.ok(markup.includes("Контроль FEFO"));
		assert.ok(markup.includes("ИНВ-3"));
		assert.ok(markup.includes("ИНВ-19"));
		assert.ok(markup.includes("Провести инвентаризацию"));
	});

	it("Возвращает пустую разметку при isOpen = false", () => {
		const markup = renderToStaticMarkup(
			createElement(WarehouseInventoryAuditModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);

		assert.equal(markup, "");
	});
});
