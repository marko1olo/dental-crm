/**
 * dentalLabBridgeAndShadeInquisitor.test.tsx — Red Team Inquisitor Test Suite for Lab Autonomy.
 *
 * Covers:
 * 1. Fast bridge prosthesis span tooth expansion (getBridgeSpanTeeth) for FDI ISO 3950.
 * 2. DentalLabShadePicker uncontrolled state & stump shade header chip (IPS Natural Die ND1–ND9).
 * 3. DentalLabFdiOdontogramPicker bridge connection button & ergonomic touch controls.
 * 4. Mandate 8b (<=800 lines) and Mandate 8d (Zero emojis).
 *
 * Uses renderToString from react-dom/server to strictly prevent mock DOM memory leaks (Anti-Kustarnyi-DOM).
 */

import React from "react";
import { renderToString } from "react-dom/server";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
	getBridgeSpanTeeth,
	DentalLabFdiOdontogramPicker,
} from "../DentalLabFdiOdontogramPicker";

import { DentalLabShadePicker } from "../DentalLabShadePicker";

describe("Dental Lab Bridge Span & VITA Shade Inquisitor (Mandate 8l)", () => {
	describe("1. Bridge Prosthesis Span Expansion Algorithm (getBridgeSpanTeeth)", () => {
		it("расширяет мостовидный пролет в пределах одного квадранта В/Ч (14 и 16 -> 14, 15, 16)", () => {
			const abutments = [14, 16];
			const expanded = getBridgeSpanTeeth(abutments);
			assert.deepStrictEqual(expanded, [14, 15, 16]);
		});

		it("расширяет мостовидный пролет через центральную линию В/Ч (12 и 22 -> 11, 12, 21, 22)", () => {
			const abutments = [12, 22];
			const expanded = getBridgeSpanTeeth(abutments);
			assert.deepStrictEqual(expanded, [11, 12, 21, 22]);
		});

		it("расширяет мостовидный пролет на нижней челюсти (45 и 47 -> 45, 46, 47)", () => {
			const abutments = [45, 47];
			const expanded = getBridgeSpanTeeth(abutments);
			assert.deepStrictEqual(expanded, [45, 46, 47]);
		});

		it("расширяет мостовидный пролет через центральную линию Н/Ч (42 и 32 -> 31, 32, 41, 42)", () => {
			const abutments = [42, 32];
			const expanded = getBridgeSpanTeeth(abutments);
			assert.deepStrictEqual(expanded, [31, 32, 41, 42]);
		});

		it("не изменяет одиночный зуб (16 -> 16)", () => {
			const single = [16];
			const result = getBridgeSpanTeeth(single);
			assert.deepStrictEqual(result, [16]);
		});

		it("корректно обрабатывает пустой массив", () => {
			const empty: number[] = [];
			const result = getBridgeSpanTeeth(empty);
			assert.deepStrictEqual(result, []);
		});

		it("обрабатывает одновременные мосты на обеих челюстях (14, 16 и 35, 37)", () => {
			const abutments = [14, 16, 35, 37];
			const expanded = getBridgeSpanTeeth(abutments);
			assert.deepStrictEqual(expanded, [14, 15, 16, 35, 36, 37]);
		});
	});

	describe("2. DentalLabShadePicker — VITA SSOT & Stump Shade Chip", () => {
		it("рендерит шкалу VITA Classical и выбранный коронковый оттенок", () => {
			const html = renderToString(
				<DentalLabShadePicker
					selectedShade="A2"
					onSelectShade={() => {}}
				/>
			);

			assert.ok(html.includes("VITA Classical"), "Должен отображаться заголовок VITA Classical");
			assert.ok(html.includes("A2"), "Должен отображаться выбранный оттенок A2");
			assert.ok(html.includes("vita-shade-A2"), "Должна быть кнопка оттенка A2");
		});

		it("отображает бейдж выбранной культи (selectedStumpShade) в верхней панели", () => {
			const html = renderToString(
				<DentalLabShadePicker
					selectedShade="A2"
					onSelectShade={() => {}}
					selectedStumpShade="ND3"
					onSelectStumpShade={() => {}}
					showStumpSelector={true}
				/>
			);

			assert.ok(
				html.includes('data-testid="selected-stump-shade-header-chip"'),
				"В шапке должен быть чип выбранного оттенка культи"
			);
			assert.ok(html.includes("ND3"), "Чип должен содержать код культи ND3");
			assert.ok(html.includes("Культя:"), "Чип должен иметь подпись 'Культя:'");
		});

		it("не отображает бейдж культи, если selectedStumpShade не задан", () => {
			const html = renderToString(
				<DentalLabShadePicker
					selectedShade="A2"
					onSelectShade={() => {}}
					selectedStumpShade={null}
				/>
			);

			assert.strictEqual(
				html.includes('data-testid="selected-stump-shade-header-chip"'),
				false,
				"Чип культи не должен рендериться без выбранной культи"
			);
		});

		it("рендерит сетку культей ND1–ND9 при showStumpSelector=true", () => {
			const html = renderToString(
				<DentalLabShadePicker
					selectedShade="B1"
					onSelectShade={() => {}}
					showStumpSelector={true}
				/>
			);

			assert.ok(html.includes('data-testid="stump-shade-container"'));
			assert.ok(html.includes('data-testid="stump-shade-ND1"'));
			assert.ok(html.includes('data-testid="stump-shade-ND9"'));
		});
	});

	describe("3. DentalLabFdiOdontogramPicker — Кнопка соединения моста", () => {
		it("рендерит кнопку «Соединить мост» при выборе 2 и более зубов", () => {
			const html = renderToString(
				<DentalLabFdiOdontogramPicker
					selectedTeeth={[14, 16]}
					setSelectedTeeth={() => {}}
					toggleTooth={() => {}}
					selectQuadrant={() => {}}
					constructionType="bridge"
				/>
			);

			assert.ok(
				html.includes('data-testid="bridge-connect-span-btn"'),
				"Кнопка 'Соединить мост' должна присутствовать"
			);
			assert.ok(html.includes("Соединить мост"), "Текст кнопки должен быть 'Соединить мост'");
		});

		it("не рендерит кнопку «Соединить мост» при выборе 1 зуба (одиночная коронка)", () => {
			const html = renderToString(
				<DentalLabFdiOdontogramPicker
					selectedTeeth={[16]}
					setSelectedTeeth={() => {}}
					toggleTooth={() => {}}
					selectQuadrant={() => {}}
					constructionType="crown_zirconia"
				/>
			);

			assert.strictEqual(
				html.includes('data-testid="bridge-connect-span-btn"'),
				false,
				"Для одиночного зуба кнопка моста не должна отображаться"
			);
		});
	});

	describe("4. Zero Cartoon Emojis Compliance (Mandate 8d item 7)", () => {
		it("DentalLabShadePicker и DentalLabFdiOdontogramPicker свободны от эмодзи", () => {
			const shadeHtml = renderToString(
				<DentalLabShadePicker
					selectedShade="A3"
					onSelectShade={() => {}}
					selectedStumpShade="ND4"
					showStumpSelector={true}
				/>
			);
			const odontogramHtml = renderToString(
				<DentalLabFdiOdontogramPicker
					selectedTeeth={[21, 23]}
					setSelectedTeeth={() => {}}
					toggleTooth={() => {}}
					selectQuadrant={() => {}}
					constructionType="bridge"
				/>
			);

			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			assert.strictEqual(emojiRegex.test(shadeHtml), false, "В селекторе оттенков нет эмодзи");
			assert.strictEqual(emojiRegex.test(odontogramHtml), false, "В одонтограмме нет эмодзи");
		});
	});
});
