/**
 * ============================================================================
 * WAREHOUSE SOFT OVERDRAFT & 1-CLICK WRITE-OFF AUTONOMY (WAVE 64 / FEATURE 253)
 * Тесты 1-кликового пакетного списания анестетиков и расходников с мягким овердрафтом склада.
 *
 * КОНСТИТУЦИЯ И ПРАВИЛА:
 * - THE HAMMER MASTER PROMPT (C:\Clinic_MVP\dental-crm\.agents\THE_HAMMER_MASTER_PROMPT.md)
 * - Мандат 8e п. 10: Мягкий овердрафт склада с предупреждением вместо блокировки операции;
 *   медсестра списывает пустые карпулы анестетиков в 1 клик без комиссии из 3 человек.
 * - Мандат 8k: CRM != Reality Simulator (Friction-killer law: списание пакетами «Анестезия»,
 *   «Пломба», «Профгигиена» вместо ручного ввода 40 позиций).
 * - Мандат 8n: Суверенитет соло-врача и клиники 1–3 кресла (Zero Dead-Ends, работа без задержек).
 * - Мандат 8d: 7 смертных грехов UI (тач-таргеты >= 44x44px, 0 эмодзи в документах и интерфейсе,
 *   0 disabled кнопок без причины).
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CLINICAL_WRITEOFF_PACKAGES,
	type ClinicalPackageId,
	handleOneClickPackageWriteOff,
	type OneClickPackageWriteOffOptions,
	type OneClickPackageWriteOffResult,
} from "../warehousePackageWriteOffEngine";
import { WarehousePackageWriteOffBar } from "../WarehousePackageWriteOffBar";
import { NurseCarpuleDisposalModal } from "../NurseCarpuleDisposalModal";
import { ProcedureMaterialDeductionModal } from "../../inventory/ProcedureMaterialDeductionModal";
import type { InventoryItem } from "../../inventory/useInventoryLogic";

describe("Wave 64 (Feature 253): Warehouse Package Write-off Engine & Catalog", () => {
	it("1. Содержит все 4 канонических клинических пакета стоматологического приёма", () => {
		const packageIds = CLINICAL_WRITEOFF_PACKAGES.map((p) => p.id);
		assert.ok(packageIds.includes("anesthesia"), "Пакет «Стандартная анестезия» должен присутствовать");
		assert.ok(packageIds.includes("hygiene"), "Пакет «Профгигиена» должен присутствовать");
		assert.ok(packageIds.includes("filling"), "Пакет «Пломба световая» должен присутствовать");
		assert.ok(packageIds.includes("surgery"), "Пакет «Хирургия» должен присутствовать");

		// Проверяем CSS классы кнопок для интерфейсов
		const anesPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "anesthesia")!;
		assert.equal(anesPkg.buttonClass, "btn-writeoff-anesthesia-packet");
		assert.equal(anesPkg.testId, "btn-writeoff-anesthesia-packet");

		const hygPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "hygiene")!;
		assert.equal(hygPkg.buttonClass, "btn-writeoff-hygiene-packet");
		assert.equal(hygPkg.testId, "btn-writeoff-hygiene-packet");
	});

	it("2. Пакет «Стандартная анестезия» включает карпулу артикаина 1.7 мл, иглу 30G, валики и салфетку", () => {
		const anesPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "anesthesia")!;
		assert.ok(anesPkg.items.length >= 4);

		const carpule = anesPkg.items.find((i) => i.category === "anesthesia" && i.unit === "карп.")!;
		assert.ok(carpule, "Карпула анестетика должна входить в пакет");
		assert.equal(carpule.standardQuantity, 1);
		assert.ok(carpule.nameRu.toLowerCase().includes("артикаин"));
		assert.equal(carpule.unitCostKopecks, 14500); // 145.00 ₽

		const needle = anesPkg.items.find((i) => i.id.includes("needle"))!;
		assert.ok(needle, "Игла карпульная должна входить в пакет");
		assert.equal(needle.standardQuantity, 1);
	});

	it("3. Пакет «Профгигиена» включает СИЗ, Оптрагейт, порошок Air-Flow, пасту, щетку и валики", () => {
		const hygPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "hygiene")!;
		assert.ok(hygPkg.items.length >= 6);

		const names = hygPkg.items.map((i) => i.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("оптрагейт") || n.includes("optragate")));
		assert.ok(names.some((n) => n.includes("air-flow") || n.includes("порошок")));
		assert.ok(names.some((n) => n.includes("паста")));
		assert.ok(names.some((n) => n.includes("перчатки")));
		assert.ok(names.some((n) => n.includes("маска")));
	});

	it("4. Пакет «Пломба световая» включает нанокомпозит, адгезив, протравочный гель и матрицу", () => {
		const fillPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "filling")!;
		const names = fillPkg.items.map((i) => i.nameRu.toLowerCase());
		assert.ok(names.some((n) => n.includes("композит")));
		assert.ok(names.some((n) => n.includes("адгезив")));
		assert.ok(names.some((n) => n.includes("протравочный")));
		assert.ok(names.some((n) => n.includes("матрица")));
	});
});

describe("Wave 64 (Feature 253): handleOneClickPackageWriteOff Logic & Soft Overdraft", () => {
	it("5. Успешно списывает пакет при достаточном остатке на складе без овердрафта", async () => {
		const availableStock: Record<string, number> = {
			art_100k_carpule: 50,
			dental_needle_30g: 100,
			cotton_rolls_sterile: 200,
			antiseptic_alcohol_wipe: 100,
		};

		let emittedToastMessage = "";
		let emittedToastType = "";

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: availableStock,
			nurseName: "Смирнова А.В.",
			doctorName: "Д-р Волкова Е.С.",
			onToast: (msg, type) => {
				emittedToastMessage = msg;
				emittedToastType = type;
			},
		});

		assert.equal(result.success, true);
		assert.equal(result.packageId, "anesthesia");
		assert.equal(result.isOverdraft, false);
		assert.equal(result.overdraftCount, 0);
		assert.equal(result.overdraftItems.length, 0);
		assert.equal(result.totalItemsCount, 4);
		assert.ok(result.totalCostKopecks > 0);
		assert.ok(result.actNumber.startsWith("АКТ-СПИС-ПК-"));
		assert.equal(emittedToastType, "success");
		assert.ok(emittedToastMessage.includes("успешно списан"));
		assert.ok(emittedToastMessage.includes("без комиссии из 3 человек"));
	});

	it("6. Мягкий овердрафт (allowSoftOverdraft: true): при остатке 0 операция НЕ блокируется и выдается warning toast", async () => {
		// Склад пуст: задержка накладной поставщика (Мандат 8e п. 10)
		const emptyStock: Record<string, number> = {};

		let emittedToastMessage = "";
		let emittedToastType = "";

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: emptyStock,
			allowSoftOverdraft: true, // По умолчанию
			nurseName: "Медсестра Иванова М.И.",
			doctorName: "Д-р Кузнецов М.С.",
			onToast: (msg, type) => {
				emittedToastMessage = msg;
				emittedToastType = type;
			},
		});

		// 1. Операция завершилась успешно (не упала с 400/409)
		assert.equal(result.success, true);
		// 2. Зафиксирован мягкий овердрафт
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 4); // Все 4 позиции ушли в овердрафт
		assert.equal(result.overdraftItems.length, 4);

		// 3. Дефицит посчитан точно
		const carpuleOverdraft = result.overdraftItems.find((o) => o.nameRu.toLowerCase().includes("артикаин"))!;
		assert.ok(carpuleOverdraft);
		assert.equal(carpuleOverdraft.requestedQty, 1);
		assert.equal(carpuleOverdraft.availableQty, 0);
		assert.equal(carpuleOverdraft.deficitQty, 1);

		// 4. Информационный тост вместо блокирующей ошибки
		assert.equal(emittedToastType, "warning");
		assert.ok(emittedToastMessage.toLowerCase().includes("мягкий овердрафт"));
		assert.ok(emittedToastMessage.includes("Операция не заблокирована"));
		assert.ok(emittedToastMessage.includes("накладная в пути"));
	});

	it("7. Мягкий овердрафт при частичном дефиците (1 позиция из пакета в нуле)", async () => {
		const partialStock: Record<string, number> = {
			art_100k_carpule: 10,
			dental_needle_30g: 0, // Иглы закончились
			cotton_rolls_sterile: 50,
			antiseptic_alcohol_wipe: 20,
		};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: partialStock,
			allowSoftOverdraft: true,
		});

		assert.equal(result.success, true);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 1);
		assert.equal(result.overdraftItems[0]!.nameRu.includes("Игла"), true);
		assert.equal(result.overdraftItems[0]!.deficitQty, 1);
		assert.equal(result.toastType, "warning");
	});

	it("8. Строгий запрет овердрафта (allowSoftOverdraft: false) возвращает отказ при дефиците", async () => {
		const emptyStock: Record<string, number> = {};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			currentStockMap: emptyStock,
			allowSoftOverdraft: false, // Имитация жесткого склада
		});

		assert.equal(result.success, false);
		assert.equal(result.isOverdraft, true);
		assert.equal(result.toastType, "error");
		assert.ok(result.toastMessage.includes("Списание заблокировано"));
	});

	it("9. Множитель процедур quantityMultiplier корректно увеличивает списание (2 приёма)", async () => {
		const availableStock: Record<string, number> = {
			art_100k_carpule: 10,
			dental_needle_30g: 10,
			cotton_rolls_sterile: 50,
			antiseptic_alcohol_wipe: 20,
		};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			quantityMultiplier: 2,
			currentStockMap: availableStock,
		});

		assert.equal(result.success, true);
		const carpule = result.deductedItems.find((i) => i.id === "art_100k_carpule")!;
		assert.equal(carpule.quantity, 2); // 1 * 2 = 2 карпулы
		const rolls = result.deductedItems.find((i) => i.id === "cotton_rolls_sterile")!;
		assert.equal(rolls.quantity, 8); // 4 * 2 = 8 валиков
	});

	it("10. Интеграция с warehouseItems (сопоставление по sku, id или наименованию)", async () => {
		const sampleWarehouse: InventoryItem[] = [
			{
				id: "wh_art_100k",
				sku: "MED-ANES-01",
				name: "Анестетик артикаиновый 4% с эпинефрином 1:100 000 (1.7 мл)",
				stockQuantity: 15,
				criticalThreshold: 5,
				unitCostRub: "145.00",
				updatedAt: "2026-09-08",
			},
			{
				id: "wh_needle",
				sku: "MED-NEEDLE-30G",
				name: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				stockQuantity: 40,
				criticalThreshold: 10,
				unitCostRub: "25.00",
				updatedAt: "2026-09-08",
			},
		];

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			warehouseItems: sampleWarehouse,
			allowSoftOverdraft: true,
		});

		assert.equal(result.success, true);
		// Карпула и игла были на складе, а валики и салфетки ушли в овердрафт
		assert.equal(result.isOverdraft, true);
		assert.equal(result.overdraftCount, 2);
	});
});

describe("Wave 64 (Feature 253): UI Components, Touch Targets & Zero Emojis (Mandates 8d, 8e)", () => {
	it("11. WarehousePackageWriteOffBar рендерит кнопки btn-writeoff-anesthesia-packet и btn-writeoff-hygiene-packet", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
				allowSoftOverdraft: true,
			}),
		);

		// Наличие контейнера
		assert.ok(html.includes("data-testid=\"warehouse-package-writeoff-bar\""));

		// Наличие быстрых кнопок
		assert.ok(html.includes("btn-writeoff-anesthesia-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-anesthesia-packet\""));
		assert.ok(html.includes("Стандартная анестезия"));

		assert.ok(html.includes("btn-writeoff-hygiene-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-hygiene-packet\""));
		assert.ok(html.includes("Профгигиена"));

		assert.ok(html.includes("btn-writeoff-filling-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-filling-packet\""));
		assert.ok(html.includes("Пломба световая"));

		assert.ok(html.includes("btn-writeoff-surgery-packet"));
		assert.ok(html.includes("data-testid=\"btn-writeoff-surgery-packet\""));
		assert.ok(html.includes("Хирургический пакет"));
	});

	it("12. Тач-таргеты кнопок строго >= 44x44px (Мандат 8d, WCAG/HIG)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
			}),
		);

		// Все кнопки должны иметь min-h-[44px]
		const buttonMatches = html.match(/class="[^"]*btn-writeoff-[^"]*"/g) || [];
		assert.ok(buttonMatches.length >= 4, "Должно быть минимум 4 кнопки пакетов");

		for (const btnMatch of buttonMatches) {
			assert.ok(
				btnMatch.includes("min-h-[44px]"),
				`Кнопка ${btnMatch} обязана иметь тач-таргет >= 44x44px (min-h-[44px])`,
			);
		}
	});

	it("13. Кнопки НЕ заблокированы (disabled) при пустом складе (Мандат 8e автономия, мягкий овердрафт)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [], // 0 остатков на складе!
				allowSoftOverdraft: true,
			}),
		);

		// Ни одна кнопка пакета не должна быть disabled
		assert.ok(!html.includes("disabled"), "Кнопки не должны быть заблокированы из-за нулевого остатка");
	});

	it("14. 0 мультяшных эмодзи в разметке панели списания (Мандат 8d Sin 7)", () => {
		const html = renderToStaticMarkup(
			createElement(WarehousePackageWriteOffBar, {
				warehouseItems: [],
			}),
		);

		// Регулярное выражение для поиска эмодзи в тексте
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.ok(!emojiRegex.test(html), "В разметке панели списания запрещены любые эмодзи!");
	});

	it("15. NurseCarpuleDisposalModal содержит кнопки btn-writeoff-anesthesia-packet и btn-writeoff-hygiene-packet с тач-таргетами >= 44px", () => {
		const html = renderToStaticMarkup(
			createElement(NurseCarpuleDisposalModal, {
				isOpen: true,
				onClose: () => {},
				currentStockAvailable: 0, // Дефицит на складе
			}),
		);

		assert.ok(html.includes("btn-writeoff-anesthesia-packet"), "Модалка утилизации карпул должна содержать кнопку анестезии");
		assert.ok(html.includes("data-testid=\"btn-writeoff-anesthesia-packet\""));
		assert.ok(html.includes("btn-writeoff-hygiene-packet"), "Модалка утилизации карпул должна содержать кнопку гигиены");
		assert.ok(html.includes("data-testid=\"btn-writeoff-hygiene-packet\""));

		// Проверка тач-таргетов
		assert.ok(html.includes("min-h-[44px]"));

		// Проверка нулевых эмодзи
		const emojiRegex = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;
		assert.ok(!emojiRegex.test(html), "В модалке утилизации карпул запрещены любые эмодзи!");
	});

	it("16. ProcedureMaterialDeductionModal содержит кнопки btn-writeoff-anesthesia-packet и btn-writeoff-hygiene-packet", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				warehouseItems: [],
			}),
		);

		assert.ok(html.includes("btn-writeoff-anesthesia-packet"));
		assert.ok(html.includes("btn-writeoff-hygiene-packet"));
	});
});
