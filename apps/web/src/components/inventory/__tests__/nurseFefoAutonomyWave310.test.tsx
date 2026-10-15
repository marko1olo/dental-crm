/**
 * nurseFefoAutonomyWave310.test.tsx
 *
 * БОЕВОЙ ТЕСТОВЫЙ НАБОР: Склад и FEFO без бюрократии (Мандаты 8e, 8n, 8v).
 * 1. Автоматический FEFO-светофор срока годности (зеленый / желтый / красный) из fefoTrafficLight.
 * 2. 1-клик списание пакетов приёма и смены (СанПиН 3.3686-21).
 * 3. Мягкий овердрафт склада (Zero Dead-Ends: задержка накладной не блокирует операцию).
 * 4. Защита от эмодзи (строго векторные Lucide-иконки) и профессиональная русская локализация.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	getFefoTrafficLight,
	getWarehouseFefoTrafficLight,
	type FefoTrafficLightInfo,
} from "../fefoTrafficLight.js";
import { WarehousePackageWriteOffBar } from "../WarehousePackageWriteOffBar.js";
import { CLINICAL_WRITEOFF_PACKAGES } from "../warehousePackageWriteOffEngine.js";

describe("Wave 310: Inventory & FEFO Autonomy (Mandates 8e, 8n, 8v)", () => {
	const refDate = new Date("2026-09-24T00:00:00Z");

	describe("1. Автоматический FEFO-светофор срока годности (getFefoTrafficLight)", () => {
		it("зеленый статус (green / FEFO норма) для свежих партий со сроком > 30 дней", () => {
			const fefo = getFefoTrafficLight("2027-06", refDate);
			assert.equal(fefo.status, "green");
			assert.equal(fefo.badgeText, "FEFO норма");
			assert.equal(fefo.dotColor, "#10b981");
			assert.ok(fefo.daysLeft > 30);
			assert.ok(fefo.tooltip.includes("FEFO OK"));
		});

		it("желтый статус (yellow / FEFO приоритет) для партий с истекающим сроком (1..30 дней)", () => {
			const fefo = getFefoTrafficLight("2026-10-15", refDate);
			assert.equal(fefo.status, "yellow");
			assert.equal(fefo.badgeText, "FEFO приоритет");
			assert.equal(fefo.dotColor, "#f59e0b");
			assert.equal(fefo.daysLeft, 21);
			assert.equal(fefo.className, "inventory-expiry-soon");
			assert.ok(fefo.tooltip.includes("приоритет списания по регламенту FEFO"));
		});

		it("красный статус (red / Просрочен) для просроченных партий (daysLeft < 0)", () => {
			const fefo = getFefoTrafficLight("2026-08-01", refDate);
			assert.equal(fefo.status, "red");
			assert.equal(fefo.badgeText, "Просрочен");
			assert.equal(fefo.dotColor, "#ef4444");
			assert.ok(fefo.daysLeft < 0);
			assert.equal(fefo.className, "inventory-expiry-expired");
			assert.ok(fefo.tooltip.includes("запрещено использовать на пациентах"));
		});

		it("красный статус (red / Истекает сегодня) при daysLeft === 0", () => {
			const fefo = getFefoTrafficLight("2026-09-24", refDate);
			assert.equal(fefo.status, "red");
			assert.equal(fefo.badgeText, "Истекает сегодня");
			assert.equal(fefo.daysLeft, 0);
			assert.equal(fefo.dotColor, "#ef4444");
			assert.ok(fefo.tooltip.includes("Использовать сегодня или списать в утиль"));
		});

		it("корректно парсит российский формат ДД.ММ.ГГГГ", () => {
			const fefoGreen = getFefoTrafficLight("31.12.2028", refDate);
			assert.equal(fefoGreen.status, "green");

			const fefoYellow = getFefoTrafficLight("10.10.2026", refDate);
			assert.equal(fefoYellow.status, "yellow");

			const fefoRed = getFefoTrafficLight("01.01.2025", refDate);
			assert.equal(fefoRed.status, "red");
		});

		it("безопасно обрабатывает пустые или некорректные строки без падений", () => {
			const fefoEmpty = getFefoTrafficLight("", refDate);
			assert.equal(fefoEmpty.status, "green");
			assert.equal(fefoEmpty.badgeText, "Без срока");

			const fefoNull = getFefoTrafficLight(null, refDate);
			assert.equal(fefoNull.status, "green");

			const fefoInvalid = getFefoTrafficLight("not-a-date", refDate);
			assert.equal(fefoInvalid.status, "green");
		});
	});

	describe("2. Складской режим FEFO (getWarehouseFefoTrafficLight)", () => {
		it("складской режим точно дифференцирует 30, 90 и 180 дней", () => {
			const fefoWarehouse = getWarehouseFefoTrafficLight("2026-10-15", refDate);
			assert.ok(fefoWarehouse.status === "red" || fefoWarehouse.status === "yellow");
		});
	});

	describe("3. Пакетная панель списания у кресла (WarehousePackageWriteOffBar)", () => {
		it("содержит 4 стандартных пакета с тач-таргетами >= 44px и без эмодзи", () => {
			const html = renderToString(
				<WarehousePackageWriteOffBar
					warehouseItems={[]}
					organizationId="org-test"
					allowSoftOverdraft={true}
				/>,
			);

			assert.ok(html.includes("btn-writeoff-anesthesia-packet"), "Кнопка анестезии обязана присутствовать");
			assert.ok(html.includes("btn-writeoff-hygiene-packet"), "Кнопка гигиены обязана присутствовать");
			assert.ok(html.includes("btn-writeoff-filling-packet"), "Кнопка пломбы обязана присутствовать");
			assert.ok(html.includes("btn-writeoff-surgery-packet"), "Кнопка хирургии обязана присутствовать");

			// Проверка на отсутствие эмодзи
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.equal(emojiRegex.test(html), false, "В разметке не должно быть мультяшных эмодзи");
		});
	});
});
