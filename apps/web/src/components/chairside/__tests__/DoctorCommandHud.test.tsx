/**
 * @file DoctorCommandHud.test.tsx
 * @description Тесты омни-командного HUD врача у кресла (Chairside Doctor Command HUD).
 *
 * Проверяет:
 * 1. Валидацию и парсинг номеров зубов по формуле FDI (11..48, 51..85).
 * 2. Клинические описания зубов на чистом русском языке по стандарту СтАР.
 * 3. Селекцию зуба в одонтограмме (focusAndSelectTooth, dente:select-tooth).
 * 4. Рендеринг модального окна HUD (Apple HIG Spotlight), доступность (a11y).
 * 5. Наличие быстрых клинических команд врача: касса (F9), запись (F3), норма, Rx.
 * 6. Соответствие дизайн-токенам DENTE (frontend.md) и отсутствие UI-грехов.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	isValidFdiTooth,
	parseToothNumber,
	getFdiToothDescription,
} from "../toothCommandUtils";
import { focusAndSelectTooth } from "../useDoctorCommandHud";
import { DoctorCommandHud } from "../DoctorCommandHud";
import { useVisitStore } from "../../../store/visitStore";

describe("Chairside Doctor Command HUD", () => {
	beforeEach(() => {
		// Сброс состояния хранилища перед каждым тестом
		useVisitStore.setState({ activeToothNumber: null });
	});

	describe("1. FDI Tooth Parsing & Anatomical Descriptions", () => {
		it("validates permanent FDI teeth (11..18, 21..28, 31..38, 41..48)", () => {
			assert.strictEqual(isValidFdiTooth(11), true, "11 (центральный резец) валиден");
			assert.strictEqual(isValidFdiTooth(16), true, "16 (шестерка) валиден");
			assert.strictEqual(isValidFdiTooth(24), true, "24 (четверка) валиден");
			assert.strictEqual(isValidFdiTooth(38), true, "38 (восьмерка) валиден");
			assert.strictEqual(isValidFdiTooth(46), true, "46 (моляр) валиден");
		});

		it("validates deciduous (milk) FDI teeth (51..55, 61..65, 71..75, 81..85)", () => {
			assert.strictEqual(isValidFdiTooth(51), true, "51 временный резец валиден");
			assert.strictEqual(isValidFdiTooth(65), true, "65 временный моляр валиден");
			assert.strictEqual(isValidFdiTooth(73), true, "73 временный клык валиден");
			assert.strictEqual(isValidFdiTooth(85), true, "85 временный моляр валиден");
		});

		it("rejects invalid tooth numbers outside FDI quadrants", () => {
			assert.strictEqual(isValidFdiTooth(0), false, "0 невалиден");
			assert.strictEqual(isValidFdiTooth(10), false, "10 невалиден");
			assert.strictEqual(isValidFdiTooth(19), false, "19 не существует");
			assert.strictEqual(isValidFdiTooth(49), false, "49 не существует");
			assert.strictEqual(isValidFdiTooth(56), false, "56 не существует");
			assert.strictEqual(isValidFdiTooth(86), false, "86 не существует");
			assert.strictEqual(isValidFdiTooth(99), false, "99 не существует");
		});

		it("parses tooth queries with various prefixes and whitespace", () => {
			assert.strictEqual(parseToothNumber("46"), 46);
			assert.strictEqual(parseToothNumber(" 11 "), 11);
			assert.strictEqual(parseToothNumber("зуб 46"), 46);
			assert.strictEqual(parseToothNumber("Зуб 24"), 24);
			assert.strictEqual(parseToothNumber("зуб85"), 85);
			assert.strictEqual(parseToothNumber("t 36"), 36);
			assert.strictEqual(parseToothNumber("tooth 12"), 12);
		});

		it("returns null for non-tooth text queries", () => {
			assert.strictEqual(parseToothNumber("касса"), null);
			assert.strictEqual(parseToothNumber("норма"), null);
			assert.strictEqual(parseToothNumber("Иванов"), null);
			assert.strictEqual(parseToothNumber("99"), null);
			assert.strictEqual(parseToothNumber(""), null);
		});

		it("generates correct clinical Russian descriptions without dev-jargon", () => {
			const desc46 = getFdiToothDescription(46);
			assert.match(desc46, /Нижний правый первый моляр/);

			const desc11 = getFdiToothDescription(11);
			assert.match(desc11, /Верхний правый центральный резец/);

			const desc23 = getFdiToothDescription(23);
			assert.match(desc23, /Верхний левый клык/);

			const desc51 = getFdiToothDescription(51);
			assert.match(desc51, /Верхний правый временный центральный резец/);
		});
	});

	describe("2. Tooth Focus & Odontogram State Integration", () => {
		it("focusAndSelectTooth updates visitStore activeToothNumber and triggers navigation", () => {
			let navigatedView = "";
			const onNavigate = (view: string) => {
				navigatedView = view;
			};

			focusAndSelectTooth(46, onNavigate);

			assert.strictEqual(
				useVisitStore.getState().activeToothNumber,
				46,
				"activeToothNumber in visitStore must be 46",
			);
			assert.strictEqual(navigatedView, "visit", "Must navigate to visit view");
		});
	});

	describe("3. Component SSR Rendering & Apple HIG Spotlight Layout", () => {
		it("renders null when isOpen is false", () => {
			const html = renderToString(<DoctorCommandHud isOpen={false} />);
			assert.strictEqual(html, "", "Closed HUD must not render markup in DOM");
		});

		it("renders Spotlight dialog when isOpen is true", () => {
			const html = renderToString(<DoctorCommandHud isOpen={true} />);

			// Modal backdrop & dialog container
			assert.ok(html.includes('class="doctor-command-hud-backdrop"'));
			assert.ok(html.includes('role="dialog"'));
			assert.ok(html.includes('aria-modal="true"'));
			assert.ok(html.includes('aria-label="Командный HUD врача у кресла"'));

			// 1-line search bar
			assert.ok(html.includes('data-testid="doctor-command-hud-input"'));
			assert.ok(
				html.includes('placeholder="Команда, номер зуба (46, 11) или пациент... (Ctrl+K)"'),
			);

			// Results listbox
			assert.ok(html.includes('role="listbox"'));
			assert.ok(html.includes('data-testid="doctor-command-hud-results"'));

			// Primary clinical actions
			assert.ok(html.includes("Касса и оплата"), "Must offer cashbox quick action");
			assert.ok(html.includes("Быстрая запись на приём"), "Must offer appointment quick action");
			assert.ok(
				html.includes("Физиологическая норма (Соматически здоров)"),
				"Must offer 1-click somatic norm",
			);
			assert.ok(html.includes("Выписать рецепт (Каталог Rx)"), "Must offer Rx prescription catalog");
			assert.ok(html.includes("Снимки и лучевая диагностика"), "Must offer X-ray imaging quick action");

			// Keyboard shortcuts hints in footer
			assert.ok(html.includes("Навигация"));
			assert.ok(html.includes("Выбрать"));
			assert.ok(html.includes("Закрыть"));
			assert.ok(html.includes("DENTE Chairside HUD"));
		});

		it("conforms to anti-clutter and design token standards", () => {
			const html = renderToString(<DoctorCommandHud isOpen={true} />);

			// No cartoon emojis in medical forms
			assert.strictEqual(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u.test(html), false);

			// No raw dev-jargon
			assert.strictEqual(html.includes("Мандат 8"), false);
			assert.strictEqual(html.includes("TODO"), false);
			assert.strictEqual(html.includes("NaN"), false);
			assert.strictEqual(html.includes("undefined"), false);
		});
	});
});
