/**
 * inventoryBatchDeduction.test.ts — Тесты пакетного фонового списания ТМЦ по техкартам в 1 клик (Мандаты 8b, 8n, 8ap).
 * Проверка BOM-спецификаций, сопоставления со складом и единиц измерения.
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
	ENDO_1_CANAL_TECH_MAP,
	IMPLANT_PLACEMENT_TECH_MAP,
	ProcedureMaterialDeductionModal,
	createDeductionLinesFromTechMaps,
	declineUnitRu,
	formatQuantityWithUnitRu,
	formatUnitPriceUnitRu,
	matchMaterialToWarehouse,
	pluralizeRussian,
} from "../components/inventory/index.js";
import type { InventoryItem } from "../components/inventory/useInventoryLogic.js";

describe("Dental Inventory BOM & Procedure Tech Maps (Пакетные техкарты)", () => {
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

describe("Warehouse Inventory Matching & Batch Resolution", () => {
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

describe("SSR-Safety & Basic Component Rendering", () => {
	it("ProcedureMaterialDeductionModal рендерится в статический HTML без сбоев", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				initialTechMapCodes: ["A16.07.002.001", "SANPIN_PPE"],
				serviceName: "Лечение глубокого кариеса",
				patientName: "Алексей Смирнов",
				toothNumber: 26,
				warehouseItems: [
					{
						id: "wh-1",
						name: "Перчатки нитриловые неопудренные (врач + ассистент)",
						stockQuantity: 100,
						criticalThreshold: 10,
						unitCostRub: "35.00",
						updatedAt: "2026-08-20",
					},
					{
						id: "wh-2",
						name: "Маска медицинская защитная трехслойная с фиксатором",
						stockQuantity: 100,
						criticalThreshold: 10,
						unitCostRub: "500.00",
						updatedAt: "2026-08-20",
					},
				],
			}),
		);

		assert.ok(html.includes("procedure-material-deduction-modal") || html.includes("consumables-deduction-modal"));
		assert.ok(html.includes("Списание") || html.includes("Расходные материалы"));
		assert.ok(html.includes("Алексей Смирнов"));
		assert.ok(html.includes("Списать"));
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
