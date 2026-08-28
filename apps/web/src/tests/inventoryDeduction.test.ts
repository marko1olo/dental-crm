/**
 * inventoryDeduction.test.ts — Тесты технологических карт стоматологических процедур,
 * копеечно-точного расчета себестоимости и контроля складских остатков DENTE.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ALL_PROCEDURE_TECH_MAPS,
	ANESTHESIA_TECH_MAP,
	CARIES_TREATMENT_TECH_MAP,
	COMMON_PPE_TECH_MAP,
	type DeductionLineItem,
	ENDO_1_CANAL_TECH_MAP,
	ENDO_MULTI_CANAL_TECH_MAP,
	HYGIENE_TECH_MAP,
	IMPLANT_PLACEMENT_TECH_MAP,
	ProcedureMaterialDeductionModal,
	SURGERY_EXTRACTION_TECH_MAP,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	calculateTotalDeductionCostKopecks,
	canSafelyDeductLinesWithoutDeficit,
	createDeductionLinesFromTechMaps,
	createSupplierPurchaseOrderFromLines,
	declineUnitRu,
	evaluateStockStatus,
	formatQuantityWithUnitRu,
	formatSupplierPurchaseOrderTextRu,
	formatUnitPriceUnitRu,
	matchMaterialToWarehouse,
	pluralizeRussian,
} from "../components/inventory";
import { Billing1CExportModal } from "../components/finance/Billing1CExportModal";
import type { InventoryItem } from "../components/inventory/useInventoryLogic";

describe("Dental Inventory BOM & Procedure Tech Maps", () => {
	it("Каталог содержит все ключевые стоматологические техкарты", () => {
		const codes = ALL_PROCEDURE_TECH_MAPS.map((t) => t.code);
		assert.ok(codes.includes("SANPIN_PPE"));
		assert.ok(codes.includes("A16.07.004")); // Анестезия
		assert.ok(codes.includes("A16.07.002.001")); // Кариес
		assert.ok(codes.includes("A16.07.030.001")); // Эндо 1 канал
		assert.ok(codes.includes("A16.07.030.003")); // Эндо многоканальная
		assert.ok(codes.includes("A16.07.051")); // Гигиена
		assert.ok(codes.includes("A16.07.001.001")); // Хирургия
		assert.ok(codes.includes("A16.07.054")); // Дентальная имплантация
		assert.ok(codes.includes("A16.07.055")); // Синус-лифтинг и НКР (Bio-Oss + Bio-Gide)
	});

	it("Техкарта костной пластики и НКР (A16.07.055) содержит Bio-Oss, Bio-Gide, Prolene 5-0 и микропины", () => {
		const gbrMap = ALL_PROCEDURE_TECH_MAPS.find((t) => t.code === "A16.07.055");
		assert.ok(gbrMap, "Техкарта A16.07.055 должна существовать в каталоге");

		const names = gbrMap.items.map((i) => i.materialName.toLowerCase());
		assert.ok(names.some((n) => n.includes("bio-oss") || n.includes("графт")));
		assert.ok(names.some((n) => n.includes("bio-gide") || n.includes("мембран")));
		assert.ok(names.some((n) => n.includes("пины") || n.includes("микропины")));
		assert.ok(names.some((n) => n.includes("prolene") || n.includes("пролен")));
		assert.ok(names.some((n) => n.includes("артикаин") || n.includes("ультракаин")));

		// Проверка точных копеечных цен
		const bioOss = gbrMap.items.find((i) => i.materialName.includes("Bio-Oss"));
		assert.ok(bioOss);
		assert.equal(bioOss.defaultUnitCostKopecks, 1250000); // 12 500.00 ₽

		const bioGide = gbrMap.items.find((i) => i.materialName.includes("Bio-Gide"));
		assert.ok(bioGide);
		assert.equal(bioGide.defaultUnitCostKopecks, 1680000); // 16 800.00 ₽
	});

	it("Техкарта дентальной имплантации (A16.07.054) содержит имплантат, винт-заглушку, шовник PTFE и анестетик", () => {
		const items = IMPLANT_PLACEMENT_TECH_MAP.items;
		const names = items.map((i) => i.materialName.toLowerCase());

		assert.ok(names.some((n) => n.includes("имплантат") || n.includes("straumann") || n.includes("osstem")));
		assert.ok(names.some((n) => n.includes("винт-заглушка") || n.includes("формирователь")));
		assert.ok(names.some((n) => n.includes("шовный") || n.includes("ptfe")));
		assert.ok(names.some((n) => n.includes("артикаин") || n.includes("анестетик")));
		assert.ok(names.some((n) => n.includes("лезвие") || n.includes("скальпель")));
	});

	it("Базовый набор СИЗ (СанПиН 3.3686-21) включает все обязательные защитные расходники", () => {
		const items = COMMON_PPE_TECH_MAP.items;
		const names = items.map((i) => i.materialName.toLowerCase());

		assert.ok(names.some((n) => n.includes("перчатки")));
		assert.ok(names.some((n) => n.includes("маска")));
		assert.ok(names.some((n) => n.includes("слюноотсос")));
		assert.ok(names.some((n) => n.includes("ватные валики")));
		assert.ok(names.some((n) => n.includes("салфетка нагрудная")));
		assert.ok(names.some((n) => n.includes("микроаппликатор") || n.includes("браш")));
		assert.ok(names.some((n) => n.includes("пылесос") || n.includes("эвакуатор")));

		for (const item of items) {
			assert.ok(item.standardQuantity > 0);
			assert.ok(item.defaultUnitCostKopecks > 0);
		}
	});

	it("Техкарта лечения кариеса содержит композит, адгезив, протравку и матричную систему", () => {
		const items = CARIES_TREATMENT_TECH_MAP.items;
		const names = items.map((i) => i.materialName.toLowerCase());

		assert.ok(names.some((n) => n.includes("композит") || n.includes("filtek")));
		assert.ok(names.some((n) => n.includes("адгезив")));
		assert.ok(names.some((n) => n.includes("травильный гель") || n.includes("кислота")));
		assert.ok(names.some((n) => n.includes("матричная система")));
		assert.ok(names.some((n) => n.includes("полировочные диски") || n.includes("sof-lex")));
	});

	it("Техкарта эндодонтии содержит гипохлорит Na 3%, ЭДТА, силер AH Plus и гуттаперчу", () => {
		const items = ENDO_1_CANAL_TECH_MAP.items;
		const names = items.map((i) => i.materialName.toLowerCase());

		assert.ok(names.some((n) => n.includes("гипохлорит")));
		assert.ok(names.some((n) => n.includes("эдта")));
		assert.ok(names.some((n) => n.includes("силер") || n.includes("ah plus")));
		assert.ok(names.some((n) => n.includes("гуттаперчевые")));
		assert.ok(names.some((n) => n.includes("бумажные")));
		assert.ok(names.some((n) => n.includes("файлы")));
	});

	it("Техкарта анестезии требует партионный учет (МДЛП)", () => {
		const cartridge = ANESTHESIA_TECH_MAP.items.find((i) =>
			i.materialName.toLowerCase().includes("артикаин"),
		);
		assert.ok(cartridge);
		assert.equal(cartridge.lotTrackingRequired, true);
	});
});

describe("Kopeck-Exact Inventory Math & Cost Calculation", () => {
	it("calculateLineCostKopecks считает точную стоимость целых и дробных количеств", () => {
		// 2 пары перчаток по 35.00 руб = 70.00 руб (7000 коп)
		const glovesCost = calculateLineCostKopecks(3500, 2);
		assert.equal(glovesCost, 7000);

		// 0.4 г композита по 1300.00 руб/г = 520.00 руб (52000 коп)
		const compositeCost = calculateLineCostKopecks(130000, 0.4);
		assert.equal(compositeCost, 52000);

		// 0.1 мл адгезива по 1800.00 руб/мл = 180.00 руб (18000 коп)
		const adhesiveCost = calculateLineCostKopecks(180000, 0.1);
		assert.equal(adhesiveCost, 18000);

		// 25 г порошка Air-Flow по 18.00 руб/г = 450.00 руб (45000 коп)
		const airFlowCost = calculateLineCostKopecks(1800, 25);
		assert.equal(airFlowCost, 45000);

		// 0 или отрицательное количество дает 0 копеек
		assert.equal(calculateLineCostKopecks(5000, 0), 0);
		assert.equal(calculateLineCostKopecks(5000, -1), 0);
	});

	it("calculateTotalDeductionCostKopecks суммирует все позиции без погрешностей", () => {
		const testLines = [
			{ unitCostKopecks: 3500, quantity: 2 }, // 70.00 ₽
			{ unitCostKopecks: 1500, quantity: 2 }, // 30.00 ₽
			{ unitCostKopecks: 1250, quantity: 1 }, // 12.50 ₽
			{ unitCostKopecks: 52000, quantity: 1 }, // 520.00 ₽
		];
		// Итого: 70.00 + 30.00 + 12.50 + 520.00 = 632.50 ₽ = 63250 коп
		const total = calculateTotalDeductionCostKopecks(testLines);
		assert.equal(total, 63250);
	});

	it("calculateDeductionSummary строит разбивку по категориям и форматирует рубли", () => {
		const sampleLines: DeductionLineItem[] = [
			{
				id: "1",
				materialName: "Перчатки",
				category: "ppe",
				unit: "пары",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 3500,
				stockQuantity: 50,
				criticalThreshold: 10,
				source: "tech_map",
			},
			{
				id: "2",
				materialName: "Артикаин",
				category: "anesthesia",
				unit: "карп.",
				quantity: 1,
				standardQuantity: 1,
				unitCostKopecks: 22000,
				stockQuantity: 20,
				criticalThreshold: 5,
				source: "tech_map",
			},
		];

		const summary = calculateDeductionSummary(sampleLines);
		assert.equal(summary.totalLines, 2);
		assert.equal(summary.totalQuantity, 3);
		// 70.00 + 220.00 = 290.00 ₽ = 29000 коп
		assert.equal(summary.totalCostKopecks, 29000);
		assert.equal(summary.hasDeficit, false);
		assert.equal(summary.criticalCount, 0);
		assert.ok(summary.totalCostFormatted.includes("290,00"));
		assert.equal(summary.categoryBreakdown.ppe.count, 1);
		assert.equal(summary.categoryBreakdown.anesthesia.count, 1);
	});
});

describe("Stock Status & Low-Stock / Negative-Stock Alerts", () => {
	it("Определяет статус 'ok' при достаточном запасе", () => {
		const status = evaluateStockStatus(20, 2, 5, "шт.");
		assert.equal(status.severity, "ok");
		assert.equal(status.remainingStock, 18);
		assert.equal(status.deficit, 0);
	});

	it("Определяет статус 'warning' при остатке на уровне или ниже критического порога", () => {
		const status = evaluateStockStatus(6, 2, 5, "шт.");
		assert.equal(status.severity, "warning");
		assert.equal(status.remainingStock, 4);
		assert.equal(status.deficit, 0);
		assert.ok(status.message.includes("Низкий остаток"));
	});

	it("Определяет статус 'critical' при отрицательном остатке (дефицит)", () => {
		const status = evaluateStockStatus(1, 3, 5, "шт.");
		assert.equal(status.severity, "critical");
		assert.equal(status.remainingStock, -2);
		assert.equal(status.deficit, 2);
		assert.ok(status.message.includes("Дефицит на складе"));
		assert.ok(status.message.includes("нехватка: 2"));
	});

	it("Определяет статус 'critical' при нулевом наличии на складе", () => {
		const status = evaluateStockStatus(0, 1, 5, "карп.");
		assert.equal(status.severity, "critical");
		assert.equal(status.remainingStock, -1);
		assert.equal(status.deficit, 1);
	});
});

describe("Supplier Purchase Order & Negative Stock Guard", () => {
	it("canSafelyDeductLinesWithoutDeficit блокирует списание при наличии хотя бы одной дефицитной позиции", () => {
		const safeLines: DeductionLineItem[] = [
			{
				id: "l-1",
				materialName: "Перчатки нитриловые",
				category: "ppe",
				unit: "пары",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 3500,
				stockQuantity: 10,
				criticalThreshold: 2,
				source: "tech_map",
			},
		];
		assert.equal(canSafelyDeductLinesWithoutDeficit(safeLines), true);

		const deficitLines: DeductionLineItem[] = [
			...safeLines,
			{
				id: "l-2",
				materialName: "Имплантат Straumann",
				category: "surgery",
				unit: "шт.",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 1450000,
				stockQuantity: 1, // Only 1 in stock, deficit = 1
				criticalThreshold: 3,
				source: "tech_map",
			},
		];
		assert.equal(canSafelyDeductLinesWithoutDeficit(deficitLines), false);
	});

	it("createSupplierPurchaseOrderFromLines формирует корректный заказ поставщику при дефиците", () => {
		const lines: DeductionLineItem[] = [
			{
				id: "l-1",
				materialName: "Артикаин 4% карпулы",
				category: "anesthesia",
				unit: "карп.",
				quantity: 3,
				standardQuantity: 1,
				unitCostKopecks: 22000, // 220.00 ₽
				stockQuantity: 1, // deficit = 2
				criticalThreshold: 5,
				source: "tech_map",
			},
		];

		const po = createSupplierPurchaseOrderFromLines(lines, "DENTE Семейная");
		assert.ok(po);
		assert.equal(po.clinicNameRu, "DENTE Семейная");
		assert.equal(po.reason, "stock_deficit");
		assert.equal(po.items.length, 1);
		assert.equal(po.items[0]?.materialName, "Артикаин 4% карпулы");
		assert.equal(po.items[0]?.shortfall, 2);
		assert.ok(po.items[0]!.suggestedOrderQuantity >= 7);
		assert.ok(po.totalCostKopecks > 0);

		const text = formatSupplierPurchaseOrderTextRu(po);
		assert.ok(text.includes("ЗАКАЗ ПОСТАВЩИКУ"));
		assert.ok(text.includes("Артикаин 4% карпулы"));
	});
});

describe("Warehouse Inventory Matching", () => {
	const mockWarehouse: InventoryItem[] = [
		{
			id: "wh-1",
			name: "Перчатки нитриловые неопудренные голубые M",
			stockQuantity: 100,
			criticalThreshold: 20,
			unitCostRub: "38.50",
			updatedAt: "2026-08-20",
		},
		{
			id: "wh-2",
			name: "Анестетик Ультракаин Д-С форте 1:100000 1.7мл",
			stockQuantity: 45,
			criticalThreshold: 10,
			unitCostRub: "230.00",
			lotNumber: "LOT-2026-A1",
			expirationDate: "2027-12-31",
			updatedAt: "2026-08-20",
		},
		{
			id: "wh-3",
			name: "Композит Filtek Z250 шприц 4г A2",
			stockQuantity: 8,
			criticalThreshold: 2,
			unitCostRub: "1350.00",
			updatedAt: "2026-08-20",
		},
	];

	it("Находит точное или токенное совпадение со складом", () => {
		const matchGloves = matchMaterialToWarehouse(
			"Перчатки нитриловые неопудренные",
			mockWarehouse,
		);
		assert.ok(matchGloves);
		assert.equal(matchGloves.id, "wh-1");

		const matchAnes = matchMaterialToWarehouse(
			"Анестетик артикаиновый 4% Ультракаин Д-С 1.7 мл",
			mockWarehouse,
		);
		assert.ok(matchAnes);
		assert.equal(matchAnes.id, "wh-2");

		const matchComposite = matchMaterialToWarehouse(
			"Наногибридный композит светоотверждаемый Filtek",
			mockWarehouse,
		);
		assert.ok(matchComposite);
		assert.equal(matchComposite.id, "wh-3");
	});

	it("createDeductionLinesFromTechMaps подтягивает актуальные цены и остатки склада", () => {
		const lines = createDeductionLinesFromTechMaps(
			["A16.07.004"], // Анестезия
			mockWarehouse,
			false,
		);

		const anesLine = lines.find((l) => l.category === "anesthesia");
		assert.ok(anesLine);
		assert.equal(anesLine.stockQuantity, 45);
		assert.equal(anesLine.unitCostKopecks, 23000); // из wh-2 (230.00 ₽)
		assert.equal(anesLine.lotNumber, "LOT-2026-A1");
	});
});

describe("SSR-Safety & Component Rendering", () => {
	it("ProcedureMaterialDeductionModal рендерится в статический HTML без сбоев", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				initialTechMapCodes: ["A16.07.002.001", "SANPIN_PPE"],
				serviceName: "Лечение глубокого кариеса",
				patientName: "Алексей Смирнов",
				toothNumber: 26,
			}),
		);

		assert.ok(html.includes("data-testid=\"procedure-material-deduction-modal\""));
		assert.ok(html.includes("Списание материалов по техкартам"));
		assert.ok(html.includes("Лечение глубокого кариеса"));
		assert.ok(html.includes("Зуб №26"));
		assert.ok(html.includes("Алексей Смирнов"));
		assert.ok(html.includes("Списать со склада"));
		// Проверка сокращенного плейсхолдера поиска
		assert.ok(html.includes("placeholder=\"Поиск материала...\""));
		// Проверка корректного вывода цены за единицу (пара, а не пары)
		assert.ok(html.includes("35,00 ₽ / пара") || html.includes("35,00 ₽ / пара"));
	});

	it("ProcedureMaterialDeductionModal отображает предупреждение о дефиците и кнопку заказа поставщику", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				initialTechMapCodes: ["A16.07.054"], // Имплантация
				serviceName: "Установка дентального имплантата",
				warehouseItems: [
					{
						id: "wh-imp-1",
						name: "Дентальный имплантат титановый SLA стерильный (Straumann/Osstem/Dentium)",
						stockQuantity: 0, // Дефицит
						criticalThreshold: 2,
						unitCostRub: "14500.00",
						updatedAt: "2026-08-27",
					},
				],
			}),
		);

		assert.ok(html.includes("Защита от отрицательных остатков"));
		assert.ok(html.includes("Сформировать заказ поставщику"));
		assert.ok(html.includes("disabled"));
	});

	it("ProcedureMaterialDeductionModal возвращает пустую строку при isOpen = false", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: false,
				onClose: () => {},
			}),
		);
		assert.equal(html, "");
	});
});

describe("Russian Unit Declension & Pluralization Engine", () => {
	it("pluralizeRussian корректно склоняет слова по числовым правилам русского языка", () => {
		assert.equal(pluralizeRussian(1, "пара", "пары", "пар"), "пара");
		assert.equal(pluralizeRussian(21, "пара", "пары", "пар"), "пара");
		assert.equal(pluralizeRussian(101, "пара", "пары", "пар"), "пара");

		assert.equal(pluralizeRussian(2, "пара", "пары", "пар"), "пары");
		assert.equal(pluralizeRussian(3, "пара", "пары", "пар"), "пары");
		assert.equal(pluralizeRussian(4, "пара", "пары", "пар"), "пары");
		assert.equal(pluralizeRussian(22, "пара", "пары", "пар"), "пары");
		assert.equal(pluralizeRussian(1.5, "пара", "пары", "пар"), "пары");

		assert.equal(pluralizeRussian(0, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(5, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(11, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(12, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(14, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(20, "пара", "пары", "пар"), "пар");
		assert.equal(pluralizeRussian(100, "пара", "пары", "пар"), "пар");
	});

	it("declineUnitRu и formatQuantityWithUnitRu корректно склоняют все медицинские единицы измерения", () => {
		// Пары перчаток
		assert.equal(formatQuantityWithUnitRu(0, "пары"), "0 пар");
		assert.equal(formatQuantityWithUnitRu(1, "пары"), "1 пара");
		assert.equal(formatQuantityWithUnitRu(2, "пары"), "2 пары");
		assert.equal(formatQuantityWithUnitRu(5, "пары"), "5 пар");
		assert.equal(formatQuantityWithUnitRu(21, "пары"), "21 пара");

		// Штуки
		assert.equal(formatQuantityWithUnitRu(0, "шт."), "0 шт.");
		assert.equal(formatQuantityWithUnitRu(1, "шт."), "1 шт.");
		assert.equal(formatQuantityWithUnitRu(2, "шт."), "2 шт.");
		assert.equal(formatQuantityWithUnitRu(5, "шт."), "5 шт.");

		// Миллилитры и граммы (дробные и целые)
		assert.equal(formatQuantityWithUnitRu(0.1, "мл"), "0.1 мл");
		assert.equal(formatQuantityWithUnitRu(1, "мл"), "1 мл");
		assert.equal(formatQuantityWithUnitRu(15, "мл"), "15 мл");

		assert.equal(formatQuantityWithUnitRu(0.4, "г"), "0.4 г");
		assert.equal(formatQuantityWithUnitRu(1, "г"), "1 г");
		assert.equal(formatQuantityWithUnitRu(25, "г"), "25 г");

		// Карпулы
		assert.equal(formatQuantityWithUnitRu(1, "карп."), "1 карп.");
		assert.equal(formatQuantityWithUnitRu(2, "карп."), "2 карп.");
		assert.equal(formatQuantityWithUnitRu(1, "карпула"), "1 карпула");
		assert.equal(formatQuantityWithUnitRu(2, "карпула"), "2 карпулы");
		assert.equal(formatQuantityWithUnitRu(5, "карпула"), "5 карпул");
	});

	it("formatUnitPriceUnitRu возвращает единичную форму для вывода стоимости за единицу", () => {
		assert.equal(formatUnitPriceUnitRu("пары"), "пара");
		assert.equal(formatUnitPriceUnitRu("пар"), "пара");
		assert.equal(formatUnitPriceUnitRu("пара"), "пара");

		assert.equal(formatUnitPriceUnitRu("шт."), "шт.");
		assert.equal(formatUnitPriceUnitRu("штуки"), "шт.");

		assert.equal(formatUnitPriceUnitRu("мл"), "мл");
		assert.equal(formatUnitPriceUnitRu("г"), "г");
		assert.equal(formatUnitPriceUnitRu("карп."), "карп.");
		assert.equal(formatUnitPriceUnitRu("упак."), "упак.");
		assert.equal(formatUnitPriceUnitRu("компл."), "компл.");
		assert.equal(formatUnitPriceUnitRu("доза"), "доза");
	});
});

describe("Billing1CExportModal & Kopeck-Exact Formatting", () => {
	it("Billing1CExportModal форматирует все суммы строго с копейками (,00 ₽)", () => {
		const html = renderToStaticMarkup(
			createElement(Billing1CExportModal, {
				isOpen: true,
				onClose: () => {},
				patientName: "Смирнова Елена Александровна",
				contractNumber: "Д-2026/08",
				items: [
					{
						id: "item-1",
						code804n: "A16.07.002.001",
						name: "Восстановление зуба пломбой (светоотверждаемый композит)",
						priceRub: 5900,
						discountRub: 500,
						quantity: 1,
						toothNumber: 16,
					},
					{
						id: "item-2",
						code804n: "A16.07.051",
						name: "Профессиональная гигиена полости рта",
						priceRub: 50500,
						discountRub: 0,
						quantity: 1,
					},
				],
				totalRub: 55900,
			}),
		);

		assert.ok(html.includes("data-testid=\"billing-1c-export-modal\""));
		assert.ok(html.includes("1С:Предприятие 8.3 / Экспорт в CommerceML 2.09"));
		assert.ok(html.includes("Смирнова Елена Александровна"));

		// Проверка строгой точности копеек: 55 900,00 ₽
		const normalizedHtml = html.replace(/[\u00A0\u202F]/g, " ");
		assert.ok(
			normalizedHtml.includes("55 900,00 ₽"),
			"Итоговая сумма должна форматироваться строго с копейками (55 900,00 ₽)",
		);

		// Проверка позиций в таблице с копейками: 5 900,00 ₽, 500,00 ₽, 5 400,00 ₽, 50 500,00 ₽
		assert.ok(normalizedHtml.includes("5 900,00 ₽"));
		assert.ok(normalizedHtml.includes("500,00 ₽"));
		assert.ok(normalizedHtml.includes("5 400,00 ₽"));
		assert.ok(normalizedHtml.includes("50 500,00 ₽"));
	});

	it("Billing1CExportModal возвращает пустую строку при isOpen = false", () => {
		const html = renderToStaticMarkup(
			createElement(Billing1CExportModal, {
				isOpen: false,
				onClose: () => {},
				items: [],
			}),
		);
		assert.equal(html, "");
	});
});

