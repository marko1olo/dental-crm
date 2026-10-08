/**
 * apps/web/src/components/sanpin/__tests__/sanPinSterilizationJournalSuite.test.tsx
 *
 * Red Team Inquisitor Test Suite:
 * 1. SterilizationScanner:
 *    - Chairside kraft-package scanning (KP-84920).
 *    - Autoclave parameters: 134°C, 2.1 bar, 5 min (Mode B).
 *    - Chemical indicator 4/5 class visual proof (Beige -> Dark Brown, Norm).
 *    - Attachment to Form 043/u diary snippet without 50 nested fields.
 * 2. SanPinSterilizationJournal:
 *    - Cycles ledger (Form 257/u), autoclave AK-01/AK-02.
 *    - Filter by device, search by pouch code.
 *    - Zero emojis, zero banned dev-jargon.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SterilizationScanner, normalizePouchBarcode } from "../SterilizationScanner";
import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { parseAndValidateKraftBarcode, insertPouchIntoDiaryText } from "@dental/shared";

describe("SANPIN STERILIZATION & KRAFT POUCH INQUISITOR SUITE (СанПиН 3.3686-21)", () => {
	describe("1. Сканер крафт-пакетов у кресла (SterilizationScanner)", () => {
		it("нормализует ручной ввод 4 цифр крафт-пакета в стандартный штрихкод без блокировки врача", () => {
			assert.equal(normalizePouchBarcode("8492"), "KP-84920");
			assert.equal(normalizePouchBarcode("84920"), "KP-84920");
			assert.equal(normalizePouchBarcode("KP-84920"), "KP-84920");
		});

		it("валидирует штрихкод крафт-пакета KP-84920", () => {
			const res = parseAndValidateKraftBarcode("KP-84920", {
				referenceDate: "2026-10-08",
			});
			assert.ok(res.isValid, "Код KP-84920 должен быть валидным");
			assert.equal(res.rawInput, "KP-84920");
		});

		it("формирует регламентную запись 043/у с параметрами 134°C, 2.1 бар, 5 мин и индикатором 5 кл.", () => {
			const diary = "Пациент жалуется на ноющие боли в зубе 1.6.";
			const snippet = "Стерилизация СанПиН 3.3686-21: крафт-пакет №KP-84920 (АК-01, 134°C / 2.1 бар / 5 мин, норма).";
			const updated = insertPouchIntoDiaryText(diary, snippet, "KP-84920");

			assert.ok(updated.includes("KP-84920"));
			assert.ok(updated.includes("134°C"));
			assert.ok(updated.includes("2.1 бар"));
			assert.ok(updated.includes("5 мин"));
		});

		it("рендерит SterilizationScanner со всеми обязательными параметрами СанПиН", () => {
			const html = renderToStaticMarkup(
				<SterilizationScanner
					visitId="visit-101"
					currentDiaryText="Осмотр полости рта."
				/>
			);

			// Проверка ключевых параметров автоклава
			assert.ok(html.includes("134°C"), "Должна быть температура 134°C");
			assert.ok(html.includes("2.1 бар"), "Должно быть давление 2.1 бар");
			assert.ok(html.includes("5 мин"), "Должна быть экспозиция 5 мин");
			assert.ok(html.includes("Режим B"), "Должен быть указан режим B");

			// Проверка индикатора 4/5 класса и визуального пруфа цвета
			assert.ok(html.includes("Бежевый"), "Цвет индикатора до должен быть бежевый");
			assert.ok(html.includes("Темно-коричневый"), "Цвет индикатора после должен быть темно-коричневый");
			assert.ok(html.includes("Норма"), "Должен быть статус Норма");
		});
	});

	describe("2. Журнал стерилизации СанПиН (SanPinSterilizationJournal / Форма 257/у)", () => {
		it("рендерит журнал с циклами, автоклавами и индикатором", () => {
			const html = renderToStaticMarkup(
				<SanPinSterilizationJournal />
			);

			assert.ok(html.includes("Журнал стерилизации"), "Должен содержать заголовок журнала");
			assert.ok(html.includes("Форма 257/у"), "Должен содержать ссылку на Форму 257/у");
			assert.ok(html.includes("АК-01"), "Должен содержать автоклав АК-01");
			assert.ok(html.includes("Melag Vacuklav 23B+"), "Должен содержать модель автоклава");
			assert.ok(html.includes("134.4°C") || html.includes("134"), "Должна быть температура 134°C");
			assert.ok(html.includes("2.15 бар") || html.includes("2.1"), "Должно быть давление 2.1 бар");
			assert.ok(html.includes("Стерильно"), "Должен быть статус Стерильно");
			assert.ok(html.includes("KP-84920"), "Должен содержать код крафт-пакета KP-84920");
			assert.ok(html.includes("Сканер крафт-пакетов"), "Должна быть кнопка вызова сканера");
			assert.ok(html.includes("Печать Формы 257/у"), "Должна быть кнопка печати Формы 257/у");
		});

		it("не содержит мультяшных эмодзи и запрещенного дев-жаргона", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");

			const files = [
				"SterilizationScanner.tsx",
				"SanPinSterilizationJournal.tsx",
			];

			for (const f of files) {
				const fullPath = path.join(process.cwd(), "apps/web/src/components/sanpin", f);
				const content = fs.readFileSync(fullPath, "utf-8");

				// 0 эмодзи
				const emojiMatch = content.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
				assert.equal(emojiMatch, null, `Файл ${f} не должен содержать эмодзи`);

				// 0 дев-жаргона
				assert.ok(!content.includes("1-клик") && !content.includes("1-Click"), `Файл ${f} не должен содержать «1-клик»`);
				assert.ok(!content.includes("овербукинг") && !content.includes("overbooking"), `Файл ${f} не должен содержать «овербукинг»`);
			}
		});
	});
});
