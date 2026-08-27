/**
 * ProcedureMaterialDeductionModal.test.tsx — Тесты технологических карт стоматологических процедур,
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
	InventoryConfirmDialog,
	ProcedureMaterialDeductionModal,
	SURGERY_EXTRACTION_TECH_MAP,
	calculateDeductionSummary,
	calculateLineCostKopecks,
	calculateTotalDeductionCostKopecks,
	createDeductionLinesFromTechMaps,
	evaluateStockStatus,
	matchMaterialToWarehouse,
} from "../index.js";
import type { InventoryItem } from "../useInventoryLogic.js";

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
		assert.ok(codes.includes("A16.07.055")); // Костная пластика и НКР (Bio-Oss + Bio-Gide)
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
	});

	it("InventoryConfirmDialog рендерится в статический HTML", () => {
		const html = renderToStaticMarkup(
			createElement(InventoryConfirmDialog, {
				title: "Подтверждение списания",
				message: "Вы действительно хотите списать материалы?",
				confirmLabel: "Подтвердить",
				onConfirm: () => {},
				onCancel: () => {},
			}),
		);

		assert.ok(html.includes("Подтверждение списания"));
		assert.ok(html.includes("Вы действительно хотите списать материалы?"));
		assert.ok(html.includes("Подтвердить"));
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
