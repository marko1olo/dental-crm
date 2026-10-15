/**
 * nurseCarpuleDisposal.test.ts — Тесты авто-БОМ списания анестетиков и ликвидации поштучной карпульной микро-дрочи.
 *
 * Мандаты 8e (Автономия врача), 8k (CRM != симулятор реальности), 8n (Суверенитет масштаба):
 * 1. Никаких поштучных актов на пустые карпулы и колпачки у кресла.
 * 2. Автоматический БОМ (Bill of Materials) по услугам анестезии (A11.07.012).
 * 3. Мягкий овердрафт склада (Soft Negative Stock, isOverdraft: true).
 * 4. Пакетное списание смены/приёма без комиссий из 3 человек.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	calculateAutoVisitConsumables,
	executeAutoVisitBomDeduction,
} from "@dental/shared";
import { CLINICAL_WRITEOFF_PACKAGES, handleOneClickPackageWriteOff } from "../warehousePackageWriteOffEngine.js";

describe("Anti-Carpule-Droch & Auto-BOM Anesthesia Deductions (Mandates 8e, 8k, 8n)", () => {
	it("1. Пакет «Стандартная анестезия» содержит карпулу артикаина 1.7 мл и иглу 30G без поштучного актования", () => {
		const anesPkg = CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === "anesthesia");
		assert.ok(anesPkg, "Пакет «Стандартная анестезия» обязан существовать в каталоге списания");

		const carpuleItem = anesPkg.items.find((i) => i.id.includes("carpule") || i.nameRu.includes("Артикаин"));
		assert.ok(carpuleItem, "Карпула артикаина 1:100 000 должна быть в пакете");
		assert.equal(carpuleItem.standardQuantity, 1);

		const needleItem = anesPkg.items.find((i) => i.id.includes("needle") || i.nameRu.includes("Игла"));
		assert.ok(needleItem, "Игла 30G должна быть в пакете");
		assert.equal(needleItem.standardQuantity, 1);
	});

	it("2. Авто-БОМ по услуге анестезии A11.07.012 в фоне списывает карпулу и иглу", () => {
		const planned = calculateAutoVisitConsumables(
			[
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Проводниковая анестезия",
					quantity: 1,
				},
			],
			{ includeStandardPpe: false },
		);

		const carpule = planned.find((p) => p.category === "anesthetic" || p.itemName.toLowerCase().includes("артикаин"));
		assert.ok(carpule, "Карпула анестетика должна автоматически присутствовать в расчете БОМ");
		assert.equal(carpule.requiredQuantity, 1);
	});

	it("3. Мягкий овердрафт: дефицит анестетиков на складе НЕ блокирует приём врача (isOverdraft: true)", () => {
		const currentStockMap: Record<string, number> = {
			"mat-anes-art-100k": 0, // Склад пуст
			"mat-anes-needle-30g": 10,
		};

		const result = executeAutoVisitBomDeduction({
			patientId: "patient-test-1",
			doctorId: "doctor-test-1",
			visitId: "visit-test-overdraft-anes",
			renderedServices: [
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Анестезия инфильтрационная",
					quantity: 2,
				},
			],
			currentStockMap,
			allowOverdraft: true,
			includeStandardPpe: false,
		});

		assert.equal(result.hasOverdraft, true, "Должен быть флаг овердрафта");
		const carpuleItem = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
		assert.ok(carpuleItem);
		assert.equal(carpuleItem.isOverdraft, true, "Карпула должна уйти в мягкий овердрафт");
		assert.equal(carpuleItem.remainingQty, -2, "Остаток склада должен уйти в -2");
	});

	it("4. Пакетное списание смены анестетиков списывает N карпул за 1 клик без комиссий", async () => {
		const availableStock: Record<string, number> = {
			art_100k_carpule: 20,
			dental_needle_30g: 20,
			cotton_rolls_sterile: 50,
			antiseptic_alcohol_wipe: 20,
		};

		const result = await handleOneClickPackageWriteOff({
			packageId: "anesthesia",
			quantityMultiplier: 5, // 5 пациентов за смену
			currentStockMap: availableStock,
			allowSoftOverdraft: true,
		});

		assert.ok(result.success, "Пакетное списание 5 анестезий должно пройти успешно");
		assert.equal(result.isOverdraft, false);
		assert.ok(result.deductedItems.length >= 2);
	});
});
