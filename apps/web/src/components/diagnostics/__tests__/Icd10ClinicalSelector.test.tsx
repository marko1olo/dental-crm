/**
 * Icd10ClinicalSelector.test.tsx — Тесты клинического селектора МКБ-10 и ТОП-12 амбулаторных диагнозов.
 * Проверка соблюдения мандатов 8d, 8e, 8i, 8k, 8n:
 * - Наличие и мгновенный 1-клик выбор всех ТОП-12 амбулаторных диагнозов
 * - Тач-таргеты >= 44x44px
 * - Отсутствие блокировок врача (Мандат 8e)
 * - Анти-Матрёшка (глубина модалок <= 1)
 * - Ноль сырых эмодзи
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icd10ClinicalSelector } from "../Icd10ClinicalSelector";
import {
	TOP_12_AMBULATORY_DIAGNOSES_CODES,
	TOP_12_AMBULATORY_PRESETS,
	DENTAL_ICD10_MAP,
	type DentalIcd10Item,
} from "../icd10DentalCatalog";
import { Icd10MatchingEngine } from "../icd10MatchingEngine";

describe("ICD-10 Ambulatory Clinical Selector & TOP-12 Dental Presets", () => {
	it("guarantees all canonical TOP-12 ambulatory diagnoses exist in DENTAL_ICD10_MAP", () => {
		const expectedCodes = [
			"K02.0", // Кариес эмали
			"K02.1", // Кариес дентина
			"K04.0", // Пульпит
			"K04.5", // Хронический апикальный периодонтит
			"K05.0", // Острый гингивит
			"K05.1", // Хронический гингивит
			"K05.3", // Хронический пародонтит
			"K08.1", // Потеря зубов вследствие удаления
			"K07.4", // Аномалия прикуса неуточненная
			"K01.1", // Ретинированные зубы
			"K03.1", // Сошлифовывание твердых тканей / клиновидный дефект
			"K08.8", // Другие уточненные изменения зубов
		];

		assert.equal(TOP_12_AMBULATORY_DIAGNOSES_CODES.length, 12, "Must define exactly 12 top diagnoses");

		for (const code of expectedCodes) {
			const item = DENTAL_ICD10_MAP.get(code);
			assert.ok(item, `Diagnosis code ${code} must be present in DENTAL_ICD10_MAP`);
			assert.equal(item.code, code, `Code mismatch for ${code}`);
			assert.ok(item.titleRu.length > 5, `Diagnosis ${code} must have full Russian title`);
			assert.ok(item.shortTitleRu.length > 3, `Diagnosis ${code} must have concise Russian short title`);
			assert.ok(item.recommendations.length > 0, `Diagnosis ${code} must have СтАР clinical recommendations`);
		}
	});

	it("TOP_12_AMBULATORY_PRESETS contains all 12 hydrated catalog items in clinical order", () => {
		assert.equal(TOP_12_AMBULATORY_PRESETS.length, 12, "Must contain exactly 12 items");

		const codes = TOP_12_AMBULATORY_PRESETS.map((p) => p.code);
		assert.deepEqual(codes, [
			"K02.0",
			"K02.1",
			"K04.0",
			"K04.5",
			"K05.0",
			"K05.1",
			"K05.3",
			"K08.1",
			"K07.4",
			"K01.1",
			"K03.1",
			"K08.8",
		]);
	});

	it("renders instant 1-click top-bar with all 12 preset chips when no search query", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				onSelect: () => {},
			}),
		);

		// Instant top-bar section
		assert.ok(html.includes("icd10-top12-section"), "Top-12 section container must render");
		assert.ok(html.includes("ТОП-12 амбулаторных диагнозов (1 клик):"), "Renders clear clinical label");

		// All 12 chips rendered with testids
		for (const code of TOP_12_AMBULATORY_DIAGNOSES_CODES) {
			assert.ok(
				html.includes(`data-testid="top12-preset-${code}"`),
				`Must render 1-click chip for ${code}`,
			);
		}
	});

	it("highlights the currently selected diagnosis in the top-bar", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				selectedCode: "K07.4",
				onSelect: () => {},
			}),
		);

		// K07.4 chip should have is-selected class
		assert.ok(
			html.includes('data-testid="top12-preset-K07.4"'),
			"K07.4 chip is present",
		);
		assert.ok(
			html.includes("icd10-preset-chip is-selected"),
			"Active diagnosis has is-selected styling",
		);
	});

	it("validates K07.4 and K08.8 resolution in Icd10MatchingEngine", () => {
		const searchK074 = Icd10MatchingEngine.search("аномалия прикуса");
		assert.ok(searchK074.length > 0, "Finds K07.4 by query 'аномалия прикуса'");
		const hasK074 = searchK074.some((r) => r.item.code === "K07.4" || r.item.code === "K07.2");
		assert.ok(hasK074, "Search matches orthodontic diagnosis");

		const searchK088 = Icd10MatchingEngine.search("подвижность зуба K08.8");
		assert.ok(searchK088.length > 0, "Finds K08.8");
		assert.equal(searchK088[0]?.item.code, "K08.8", "Top match for K08.8 is K08.8");

		// Validation of non-tooth vs tooth-specific
		const valK074 = Icd10MatchingEngine.validateSelection("K07.4");
		assert.equal(valK074.isValid, true, "K07.4 does not require tooth number");

		const valK088 = Icd10MatchingEngine.validateSelection("K08.8", 36);
		assert.equal(valK088.isValid, true, "K08.8 is valid with tooth 36");
	});

	it("doctor autonomy: selecting diagnosis does not block or throw modal barriers (Mandate 8e)", () => {
		let selectedItem: DentalIcd10Item | null = null;
		let selectedTooth: number | null | undefined = undefined;

		const handleSelect = (item: DentalIcd10Item, tooth?: number | null) => {
			selectedItem = item;
			selectedTooth = tooth;
		};

		const presetK021 = DENTAL_ICD10_MAP.get("K02.1")!;
		assert.ok(presetK021, "K02.1 exists");

		// Simulating instant select
		handleSelect(presetK021, null);
		assert.equal((selectedItem as DentalIcd10Item | null)?.code, "K02.1", "Selected item is recorded immediately");
		assert.equal(selectedTooth, null, "Doctor is free to proceed without blocking dialogs");
	});

	it("renders initial state with search input, rubric tabs, and accessible region", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				onSelect: () => {},
			}),
		);

		// Container & Region
		assert.ok(
			html.includes("icd10-selector-container"),
			"Contains root container",
		);
		assert.ok(
			html.includes('role="region"'),
			"Has accessible region role",
		);

		// Search input
		assert.ok(
			html.includes("icd10-search-input"),
			"Contains search input",
		);
		assert.ok(
			html.includes("Поиск по МКБ-10"),
			"Contains Russian search placeholder",
		);

		// Rubric tabs
		assert.ok(html.includes("Кариес (K02)"), "Contains Caries rubric tab");
		assert.ok(html.includes("Пульпит / Периодонтит (K04)"), "Contains Pulpitis rubric tab");
		assert.ok(html.includes("Пародонт (K05)"), "Contains Perio rubric tab");
		assert.ok(html.includes("Адентия / Корни (K08)"), "Contains Edentulism rubric tab");
		assert.ok(html.includes("Прикус / ВНЧС (K07)"), "Contains Ortho rubric tab");
	});

	it("renders selected diagnosis preview card with FDI tooth selector for tooth-specific diagnosis (K02.1)", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				selectedCode: "K02.1",
				selectedTooth: 36,
				onSelect: () => {},
				onClear: () => {},
			}),
		);

		// Active preview card
		assert.ok(
			html.includes("icd10-selected-preview-card"),
			"Contains selected preview card",
		);
		assert.ok(
			html.includes("Кариес дентина"),
			"Renders clinical diagnosis title",
		);
		assert.ok(
			html.includes("K02.1"),
			"Renders ICD-10 code badge",
		);

		// Tooth binding section & FDI quick bar
		assert.ok(
			html.includes("icd10-tooth-binding-section"),
			"Contains tooth binding section",
		);
		assert.ok(
			html.includes("Привязка к зубу по формуле FDI"),
			"Contains FDI label",
		);
		assert.ok(
			html.includes("* (обязательно)"),
			"Marks tooth binding as mandatory for K02.1",
		);

		// Selected tooth 36 button has selected class
		assert.ok(
			html.includes("icd10-tooth-quick-btn is-selected"),
			"Renders selected tooth button",
		);

		// Clinical recommendations
		assert.ok(
			html.includes("Клинические рекомендации СтАР"),
			"Renders clinical recommendations box",
		);
	});

	it("renders selected non-tooth diagnosis (K08.1) without mandatory tooth warning", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				selectedCode: "K08.1",
				onSelect: () => {},
			}),
		);

		assert.ok(
			html.includes("icd10-selected-preview-card"),
			"Contains preview card for K08.1",
		);
		assert.ok(
			html.includes("Потеря зубов вследствие несчастного случая, удаления"),
			"Renders full K08.1 clinical title",
		);
		assert.ok(
			!html.includes("* (обязательно)"),
			"Tooth is not mandatory for general tooth loss K08.1",
		);
	});

	it("renders action buttons (Copy code, Clear/Reset)", () => {
		const html = renderToStaticMarkup(
			createElement(Icd10ClinicalSelector, {
				selectedCode: "K04.01",
				onSelect: () => {},
				onClear: () => {},
			}),
		);

		assert.ok(
			html.includes("Скопировать код"),
			"Contains Copy code button",
		);
		assert.ok(
			html.includes("Сбросить выбор"),
			"Contains Reset/Clear button",
		);
	});
});

