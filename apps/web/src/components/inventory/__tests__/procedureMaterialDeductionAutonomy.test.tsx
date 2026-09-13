/**
 * ============================================================================
 * PROCEDURE MATERIAL DEDUCTION, WAREHOUSE & STERILIZATION AUTONOMY TESTS
 * Unit tests for Nurse & Doctor Autonomy, 1-Click Presets & Soft Overdraft:
 * - Mandate 8e: Doctor & Staff Autonomy (No unexplained disabled buttons; non-blocking workflows)
 * - Mandate 8k: CRM != Reality Simulator (1-click batch presets without individual ampoule clicking)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (Soft overdraft, zero dead-ends)
 * - Mandate 8d: 7 Deadly Sins (1-row toolbar 32-36px, Anti-Matryoshka depth 1, zero emojis)
 * ============================================================================
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	ProcedureMaterialDeductionModal,
	STANDARD_CONSUMABLE_PRESET_NAME,
	createStandardConsumablePresetItem,
	WarehouseManagerModal,
	CANONICAL_WAREHOUSE_PRESETS,
} from "../index.js";
import {
	AutoclaveCycleModal,
	SanpinJournal257View,
	STANDARD_TRAY_OPTIONS,
	createStandardSterileTrayBarcode,
	createQuickAutoclaveCycle,
	createQuickAzopyramRecord,
	createQuickPhenolphthaleinRecord,
} from "../../sterilization/index.js";
import type { InventoryItem } from "../useInventoryLogic.js";

const sampleWarehouse: readonly InventoryItem[] = [
	{
		id: "wh-gloves-1",
		name: "Перчатки нитриловые неопудренные",
		stockQuantity: 100,
		criticalThreshold: 20,
		unitCostRub: "35.00",
		updatedAt: "2026-09-01",
	},
	{
		id: "wh-art-1",
		name: "Артикаин 1:100 000 карпула 1.7 мл",
		stockQuantity: 0, // Zero stock to verify soft overdraft
		criticalThreshold: 10,
		unitCostRub: "95.00",
		updatedAt: "2026-09-01",
	},
];

describe("Procedure Material Deduction Autonomy (Mandates 8e, 8k, 8n)", () => {
	it("1. Helper createStandardConsumablePresetItem returns valid DeductionLineItem with non-blocking metadata", () => {
		const preset = createStandardConsumablePresetItem(sampleWarehouse);

		assert.strictEqual(preset.materialName, STANDARD_CONSUMABLE_PRESET_NAME);
		assert.strictEqual(preset.quantity, 1);
		assert.strictEqual(preset.standardQuantity, 1);
		assert.strictEqual(preset.unit, "компл.");
		assert.strictEqual(preset.category, "ppe");
		assert.strictEqual(preset.mandatory, true);
		assert.ok(preset.unitCostKopecks >= 0);
	});

	it("2. ProcedureMaterialDeductionModal renders with 1-click clinical presets bar without emojis", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: true,
				onClose: () => {},
				initialTechMapCodes: [],
				warehouseItems: sampleWarehouse,
				isDeducting: false,
			})
		);

		// Must render modal dialog
		assert.ok(html.includes("data-testid=\"procedure-material-deduction-modal\""));
		// Must render clinical packages bar
		assert.ok(html.includes("data-testid=\"clinical-packages-bar\""));
		// Must include 1-click preset buttons
		assert.ok(html.includes("data-testid=\"preset-btn-anesthesia\""));
		assert.ok(html.includes("data-testid=\"preset-btn-caries\""));
		assert.ok(html.includes("data-testid=\"preset-btn-hygiene\""));
		assert.ok(html.includes("Стандартная анестезия 1.7 мл"));
		assert.ok(html.includes("Пломбирование зуба"));
		assert.ok(html.includes("Профгигиена"));
		// Confirm button must be present
		assert.ok(html.includes("data-testid=\"confirm-deduction-btn\""));

		// Anti-Emoji Law: No lightning or checkmark emojis in the rendered output
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
	});

	it("3. ProcedureMaterialDeductionModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(ProcedureMaterialDeductionModal, {
				isOpen: false,
				onClose: () => {},
			})
		);
		assert.strictEqual(html, "");
	});
});

describe("WarehouseManagerModal & Soft Overdraft (Mandates 8e, 8k, 8n)", () => {
	it("1. Canonical warehouse presets contain standard anesthesia, filling and hygiene presets", () => {
		assert.strictEqual(CANONICAL_WAREHOUSE_PRESETS.length, 3);
		const ids = CANONICAL_WAREHOUSE_PRESETS.map((p) => p.id);
		assert.ok(ids.includes("anesthesia-17"));
		assert.ok(ids.includes("filling-standard"));
		assert.ok(ids.includes("hygiene-prof"));
	});

	it("2. WarehouseManagerModal renders 1-row toolbar (32-36px) with search and 1-click presets", () => {
		const html = renderToStaticMarkup(
			createElement(WarehouseManagerModal, {
				isOpen: true,
				onClose: () => {},
				doctorName: "Д-р Кузнецов",
				nurseName: "Иванова Е.В.",
			})
		);

		assert.ok(html.includes("data-testid=\"warehouse-manager-modal\""));
		assert.ok(html.includes("data-testid=\"warehouse-search-input\""));
		assert.ok(html.includes("data-testid=\"preset-anesthesia-btn\""));
		assert.ok(html.includes("data-testid=\"preset-filling-btn\""));
		assert.ok(html.includes("data-testid=\"preset-hygiene-btn\""));
		assert.ok(html.includes("data-testid=\"switch-to-act-btn\""));
		assert.ok(html.includes("data-testid=\"confirm-writeoff-btn\""));
		assert.ok(html.includes("Стандартная анестезия 1.7 мл"));
		assert.ok(html.includes("Пломбирование зуба"));
		assert.ok(html.includes("Профгигиена"));

		// Zero emojis
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
		assert.ok(!html.includes("📦"));
	});

	it("3. Items with 0 stock display soft overdraft status without blocking writeoff", () => {
		const html = renderToStaticMarkup(
			createElement(WarehouseManagerModal, {
				isOpen: true,
				onClose: () => {},
				initialItems: sampleWarehouse,
			})
		);

		// Zero stock item must show overdraft label
		assert.ok(html.includes("Остаток 0 (Овердрафт)"));
		// Confirm button is present and not disabled
		assert.ok(html.includes("data-testid=\"confirm-writeoff-btn\""));
		assert.ok(!html.includes("disabled=\"\""));
	});

	it("4. WarehouseManagerModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(WarehouseManagerModal, {
				isOpen: false,
				onClose: () => {},
			})
		);
		assert.strictEqual(html, "");
	});
});

describe("Sterilization & Autoclave Journal Autonomy (SanPiN 3.3686-21 & Mandate 8e)", () => {
	it("1. createStandardSterileTrayBarcode generates valid machine-readable kraft barcode and 043/u text", () => {
		const result = createStandardSterileTrayBarcode("therapy", new Date("2026-09-01T10:00:00Z"), "Смирнова А.В.");

		assert.ok(result.rawInput.startsWith("KB-20260901-01#1"));
		assert.ok(result.formattedProtocolRecord043.includes("Инструменты стерильны"));
		assert.ok(result.formattedProtocolRecord043.includes("СанПиН 3.3686-21"));
		assert.ok(result.formattedProtocolRecord043.includes("Смирнова А.В."));
	});

	it("2. Helper factory functions create valid autoclave and PSO quality records", () => {
		const cycle = createQuickAutoclaveCycle(1, "Смирнова А.В.");
		assert.strictEqual(cycle.cycleNumber, 1);
		assert.strictEqual(cycle.temperatureC, 134);
		assert.strictEqual(cycle.pressureBar, 2.1);
		assert.strictEqual(cycle.batchVerdict, "ГОДНА");

		const azo = createQuickAzopyramRecord("Смирнова А.В.");
		assert.strictEqual(azo.testType, "azopyram");
		assert.strictEqual(azo.azopyramResult, "negative");
		assert.strictEqual(azo.isApproved, true);

		const ph = createQuickPhenolphthaleinRecord("Смирнова А.В.");
		assert.strictEqual(ph.testType, "phenolphthalein");
		assert.strictEqual(ph.phenolphthaleinResult, "negative");
		assert.strictEqual(ph.isApproved, true);
	});

	it("3. AutoclaveCycleModal renders tabs, statutory presets and Form 257/u without emojis", () => {
		const html = renderToStaticMarkup(
			createElement(AutoclaveCycleModal, {
				isOpen: true,
				onClose: () => {},
				initialTab: "live_cycle",
			})
		);

		assert.ok(html.includes("data-testid=\"autoclave-cycle-modal\""));
		assert.ok(html.includes("data-testid=\"tab-live-cycle\""));
		assert.ok(html.includes("data-testid=\"tab-batch-packs\""));
		assert.ok(html.includes("data-testid=\"tab-label-print\""));
		assert.ok(html.includes("data-testid=\"tab-journal-257\""));
		assert.ok(html.includes("btn-confirm-autoclave-batch"));
		assert.ok(html.includes("Цикл стерилизации (Live)"));
		assert.ok(html.includes("Журнал Форма 257/у"));
		assert.ok(html.includes("СанПиН 3.3686-21"));

		// Anti-Emoji Law: No emojis
		assert.ok(!html.includes("⚡"));
		assert.ok(!html.includes("✓"));
		assert.ok(!html.includes("🔥"));
	});

	it("4. SanpinJournal257View renders statutory form 257/u print sheet and stamp", () => {
		const html = renderToStaticMarkup(
			createElement(SanpinJournal257View, {
				entries: [],
			})
		);

		assert.ok(html.includes("Журнал контроля работы стерилизаторов (Форма № 257/у)"));
		assert.ok(html.includes("ЖУРНАЛ РАБОТЫ СТЕРИЛИЗАТОРОВ (ФОРМА № 257/у)"));
		assert.ok(html.includes("Паровой автоклав (Class B)"));
		assert.ok(html.includes("Печать журнала (Форма 257/у)"));
	});

	it("5. AutoclaveCycleModal returns empty markup when isOpen is false", () => {
		const html = renderToStaticMarkup(
			createElement(AutoclaveCycleModal, {
				isOpen: false,
				onClose: () => {},
			})
		);
		assert.strictEqual(html, "");
	});
});
