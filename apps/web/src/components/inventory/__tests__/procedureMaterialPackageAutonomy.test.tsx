/**
 * procedureMaterialPackageAutonomy.test.tsx — Тесты 1-кликовых клинических пакетов
 * списания расходников и автономии соло-врача при пустом складском каталоге.
 *
 * КОНСТИТУЦИЯ И ПРАВИЛА:
 * - THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Мандат 8e: Автономия врача и медперсонала (Doctor & Staff Autonomy)
 * - Мандат 8k: CRM != Reality Simulator (Friction killer law)
 * - Мандат 8n: Суверенитет соло-врача и пустой складской каталог (Solo Doctor Sovereignty)
 */

import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ALL_PROCEDURE_TECH_MAPS,
	CLINICAL_PROCEDURE_PACKAGES,
	type ClinicalTechMapPackage,
	type DeductionLineItem,
	ProcedureMaterialDeductionModal,
	calculateDeductionSummary,
	calculateTotalDeductionCostKopecks,
	createDeductionLinesFromPackage,
	createDeductionLinesFromTechMaps,
	createQuickCustomLineItem,
} from "../index.js";
import type { InventoryItem } from "../useInventoryLogic.js";

describe("Procedure Material Deduction 1-Click Clinical Packages (Mandates 8e, 8k, 8n)", () => {
	it("Каталог CLINICAL_PROCEDURE_PACKAGES содержит ровно 5 канонических пакетов", () => {
		assert.equal(CLINICAL_PROCEDURE_PACKAGES.length, 5);

		const titles = CLINICAL_PROCEDURE_PACKAGES.map((p) => p.title);
		assert.ok(titles.includes("Пакет Терапия"));
		assert.ok(titles.includes("Пакет Эндодонтия"));
		assert.ok(titles.includes("Пакет Гигиена"));
		assert.ok(titles.includes("Пакет Хирургия"));
		assert.ok(titles.includes("Пакет Имплантация"));
	});

	it("Пакет Терапия активирует СИЗ + Крафт + Анестезия + Кариес [SANPIN_PPE, SANPIN_KRAFT, A16.07.004, A16.07.002.001]", () => {
		const pkg = CLINICAL_PROCEDURE_PACKAGES.find((p) => p.id === "pkg-therapy");
		assert.ok(pkg, "Пакет Терапия должен существовать");
		assert.deepEqual(pkg.codes, [
			"SANPIN_PPE",
			"SANPIN_KRAFT",
			"A16.07.004",
			"A16.07.002.001",
		]);

		const lines = createDeductionLinesFromPackage(pkg);
		assert.ok(lines.length >= 17, `Ожидалось >= 17 позиций, получено ${lines.length}`);

		const names = lines.map((l) => l.materialName.toLowerCase());
		// СИЗ
		assert.ok(names.some((n) => n.includes("перчатки")));
		assert.ok(names.some((n) => n.includes("маска")));
		// Крафт (СанПиН)
		assert.ok(names.some((n) => n.includes("крафт-пакет")));
		assert.ok(names.some((n) => n.includes("интегратор") || n.includes("интетест")));
		// Анестезия
		assert.ok(names.some((n) => n.includes("артикаин")));
		assert.ok(names.some((n) => n.includes("игла карпульная")));
		// Кариес
		assert.ok(names.some((n) => n.includes("композит") || n.includes("filtek")));
		assert.ok(names.some((n) => n.includes("адгезив")));
		assert.ok(names.some((n) => n.includes("матричная система")));

		// Категории списания
		const categories = new Set(lines.map((l) => l.category));
		assert.ok(categories.has("ppe"));
		assert.ok(categories.has("anesthesia"));
		assert.ok(categories.has("caries"));
	});

	it("Пакет Эндодонтия активирует СИЗ + Крафт + Анестезия + Эндо 1 кан. [SANPIN_PPE, SANPIN_KRAFT, A16.07.004, A16.07.030.001]", () => {
		const pkg = CLINICAL_PROCEDURE_PACKAGES.find((p) => p.id === "pkg-endo");
		assert.ok(pkg, "Пакет Эндодонтия должен существовать");
		assert.deepEqual(pkg.codes, [
			"SANPIN_PPE",
			"SANPIN_KRAFT",
			"A16.07.004",
			"A16.07.030.001",
		]);

		const lines = createDeductionLinesFromPackage(pkg);
		assert.ok(lines.length >= 15, `Ожидалось >= 15 позиций, получено ${lines.length}`);

		const names = lines.map((l) => l.materialName.toLowerCase());
		assert.ok(names.some((n) => n.includes("крафт-пакет")));
		assert.ok(names.some((n) => n.includes("артикаин")));
		assert.ok(names.some((n) => n.includes("гипохлорит")));
		assert.ok(names.some((n) => n.includes("силер") || n.includes("ah plus")));
		assert.ok(names.some((n) => n.includes("гуттаперчевые")));
		assert.ok(names.some((n) => n.includes("файлы")));

		const categories = new Set(lines.map((l) => l.category));
		assert.ok(categories.has("ppe"));
		assert.ok(categories.has("anesthesia"));
		assert.ok(categories.has("endo"));
	});

	it("Пакет Гигиена активирует СИЗ + Крафт + Профгигиена [SANPIN_PPE, SANPIN_KRAFT, A16.07.051]", () => {
		const pkg = CLINICAL_PROCEDURE_PACKAGES.find((p) => p.id === "pkg-hygiene");
		assert.ok(pkg, "Пакет Гигиена должен существовать");
		assert.deepEqual(pkg.codes, [
			"SANPIN_PPE",
			"SANPIN_KRAFT",
			"A16.07.051",
		]);

		const lines = createDeductionLinesFromPackage(pkg);
		assert.ok(lines.length >= 12, `Ожидалось >= 12 позиций, получено ${lines.length}`);

		const names = lines.map((l) => l.materialName.toLowerCase());
		assert.ok(names.some((n) => n.includes("крафт-пакет")));
		assert.ok(names.some((n) => n.includes("air-flow") || n.includes("порошок")));
		assert.ok(names.some((n) => n.includes("паста")));
		assert.ok(names.some((n) => n.includes("optragate")));

		const categories = new Set(lines.map((l) => l.category));
		assert.ok(categories.has("ppe"));
		assert.ok(categories.has("hygiene"));
		// Анестезия по умолчанию не входит в базовую профгигиену
		assert.equal(categories.has("anesthesia"), false);
	});

	it("Пакет Хирургия активирует СИЗ + Крафт + Анестезия + Удаление [SANPIN_PPE, SANPIN_KRAFT, A16.07.004, A16.07.001.001]", () => {
		const pkg = CLINICAL_PROCEDURE_PACKAGES.find((p) => p.id === "pkg-surgery");
		assert.ok(pkg, "Пакет Хирургия должен существовать");
		assert.deepEqual(pkg.codes, [
			"SANPIN_PPE",
			"SANPIN_KRAFT",
			"A16.07.004",
			"A16.07.001.001",
		]);

		const lines = createDeductionLinesFromPackage(pkg);
		assert.ok(lines.length >= 14, `Ожидалось >= 14 позиций, получено ${lines.length}`);

		const names = lines.map((l) => l.materialName.toLowerCase());
		assert.ok(names.some((n) => n.includes("крафт-пакет")));
		assert.ok(names.some((n) => n.includes("артикаин")));
		assert.ok(names.some((n) => n.includes("альвостаз") || n.includes("губка")));
		assert.ok(names.some((n) => n.includes("ptfe") || n.includes("шовный")));
		assert.ok(names.some((n) => n.includes("лезвие")));

		const categories = new Set(lines.map((l) => l.category));
		assert.ok(categories.has("ppe"));
		assert.ok(categories.has("anesthesia"));
		assert.ok(categories.has("surgery"));
	});

	it("Пакет Имплантация активирует СИЗ + Крафт + Анестезия + Имплантация [SANPIN_PPE, SANPIN_KRAFT, A16.07.004, A16.07.054]", () => {
		const pkg = CLINICAL_PROCEDURE_PACKAGES.find((p) => p.id === "pkg-implant");
		assert.ok(pkg, "Пакет Имплантация должен существовать");
		assert.deepEqual(pkg.codes, [
			"SANPIN_PPE",
			"SANPIN_KRAFT",
			"A16.07.004",
			"A16.07.054",
		]);

		const lines = createDeductionLinesFromPackage(pkg);
		assert.ok(lines.length >= 15, `Ожидалось >= 15 позиций, получено ${lines.length}`);

		const names = lines.map((l) => l.materialName.toLowerCase());
		assert.ok(names.some((n) => n.includes("имплантат") || n.includes("титановый")));
		assert.ok(names.some((n) => n.includes("заглушка") || n.includes("формирователь")));
		assert.ok(names.some((n) => n.includes("шовный")));

		// Проверяем требование партионного учета для имплантата
		const implantItem = lines.find((l) =>
			l.materialName.toLowerCase().includes("имплантат"),
		);
		assert.ok(implantItem);
		assert.equal(implantItem.lotTrackingRequired, true);
	});
});

describe("Solo Doctor & Empty Catalog Resilience (Mandates 8e, 8n)", () => {
	it("createQuickCustomLineItem создает валидную строку списания при пустом каталоге склада", () => {
		const item = createQuickCustomLineItem("Штифт стекловолоконный D.T. Light-Post #1", {
			unit: "шт.",
			quantity: 2,
			warehouseItems: [],
		});

		assert.ok(item.id.startsWith("custom-quick-"));
		assert.equal(item.materialName, "Штифт стекловолоконный D.T. Light-Post #1");
		assert.equal(item.unit, "шт.");
		assert.equal(item.quantity, 2);
		assert.equal(item.standardQuantity, 2);
		assert.equal(item.stockQuantity, 0);
		assert.equal(item.criticalThreshold, 0);
		assert.equal(item.source, "manual");
		assert.equal(item.mandatory, false);
	});

	it("createQuickCustomLineItem корректно конвертирует рубли в копейки", () => {
		const itemWithPrice = createQuickCustomLineItem("Цемент стеклоиономерный Fuji Plus", {
			unitCostRub: "4250.75",
			quantity: 1,
		});

		assert.equal(itemWithPrice.unitCostKopecks, 425075);
	});

	it("createQuickCustomLineItem автоматически связывается со складом, если товар найден", () => {
		const sampleWarehouse: InventoryItem[] = [
			{
				id: "wh-bonded-1",
				name: "Коллагеновый конус Parasorb Cone",
				stockQuantity: 12,
				criticalThreshold: 3,
				unitCostRub: "450.00",
				lotNumber: "LOT-8899",
				expirationDate: "2027-11-30",
				updatedAt: "2026-08-20",
			},
		];

		const item = createQuickCustomLineItem("Коллагеновый конус Parasorb Cone", {
			warehouseItems: sampleWarehouse,
		});

		assert.equal(item.inventoryItemId, "wh-bonded-1");
		assert.equal(item.stockQuantity, 12);
		assert.equal(item.criticalThreshold, 3);
		assert.equal(item.lotNumber, "LOT-8899");
		assert.equal(item.expirationDate, "2027-11-30");
		assert.equal(item.unitCostKopecks, 45000);
	});

	it("Сводный расчет себестоимости и мягкий овердрафт работают с кастомными позициями", () => {
		const lines: DeductionLineItem[] = [
			{
				id: "line-1",
				materialName: "Перчатки нитриловые",
				category: "ppe",
				unit: "пары",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 3500, // 35.00 ₽
				stockQuantity: 10,
				criticalThreshold: 2,
				source: "tech_map",
			},
			createQuickCustomLineItem("Стекловолоконный штифт (кастом)", {
				unitCostRub: "500.00",
				quantity: 1,
			}),
		];

		const summary = calculateDeductionSummary(lines);
		assert.equal(summary.totalLines, 2);
		// 70.00 ₽ + 500.00 ₽ = 570.00 ₽ = 57000 коп
		assert.equal(summary.totalCostKopecks, 57000);
		assert.ok(summary.totalCostFormatted.includes("570,00"));
		assert.ok(summary.totalCostFormatted.includes("₽"));
		// Кастомный элемент имеет 0 остатка, поэтому мягкий овердрафт фиксирует дефицит
		assert.equal(summary.hasDeficit, true);
		assert.ok(summary.criticalCount >= 1);
	});
});

describe("Component Rendering & UI Autonomy (ProcedureMaterialDeductionModal)", () => {
	it("Модальное окно рендерит панель 1-кликовых клинических пакетов со всеми 5 кнопками", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				serviceName: "Терапевтический прием",
				patientName: "Иванов И.И.",
				toothNumber: 16,
				warehouseItems: [],
			}),
		);

		// Проверяем наличие контейнера пакетов
		assert.ok(html.includes("data-testid=\"clinical-packages-bar\""));
		assert.ok(html.includes("Клинические пакеты (1 клик)"));

		// Проверяем наличие всех 5 кнопок пакетов
		assert.ok(html.includes("data-testid=\"package-btn-pkg-therapy\""));
		assert.ok(html.includes("Пакет Терапия"));

		assert.ok(html.includes("data-testid=\"package-btn-pkg-endo\""));
		assert.ok(html.includes("Пакет Эндодонтия"));

		assert.ok(html.includes("data-testid=\"package-btn-pkg-hygiene\""));
		assert.ok(html.includes("Пакет Гигиена"));

		assert.ok(html.includes("data-testid=\"package-btn-pkg-surgery\""));
		assert.ok(html.includes("Пакет Хирургия"));

		assert.ok(html.includes("data-testid=\"package-btn-pkg-implant\""));
		assert.ok(html.includes("Пакет Имплантация"));
	});

	it("При пустом складе (warehouseItems = []) поле быстрого ввода НЕ скрывается", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				warehouseItems: [], // Склад пустой (соло-врач начинает работу)
			}),
		);

		// Панель добавления отображается
		assert.ok(html.includes("data-testid=\"inventory-add-custom-bar\""));
		assert.ok(html.includes("Добавить расходник:"));

		// Текстовое поле ввода присутствует
		assert.ok(html.includes("data-testid=\"quick-custom-material-input\""));
		assert.ok(html.includes("Или введите название расходника..."));
		assert.ok(html.includes("data-testid=\"quick-custom-material-add-btn\""));

		// Селект склада НЕ рендерится при пустом складе (устранение трения)
		assert.ok(!html.includes("data-testid=\"warehouse-select-custom\""));
	});

	it("При заполненном складе (warehouseItems > 0) доступны и селект со склада, и быстрый текстовый ввод", () => {
		const sampleWarehouse: InventoryItem[] = [
			{
				id: "wh-1",
				name: "Боры алмазные конусные Mani",
				stockQuantity: 25,
				criticalThreshold: 5,
				unitCostRub: "180.00",
				updatedAt: "2026-08-20",
			},
		];

		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				warehouseItems: sampleWarehouse,
			}),
		);

		// Присутствуют оба механизма добавления
		assert.ok(html.includes("data-testid=\"warehouse-select-custom\""));
		assert.ok(html.includes("Боры алмазные конусные Mani"));
		assert.ok(html.includes("data-testid=\"warehouse-add-custom-btn\""));

		// Быстрый ввод также доступен для некаталогизированных расходников
		assert.ok(html.includes("data-testid=\"quick-custom-material-input\""));
		assert.ok(html.includes("data-testid=\"quick-custom-material-add-btn\""));
	});
});
