/**
 * Icd10ClinicalSelector.test.tsx — Тесты рендеринга и UX-инвариантов клинического селектора МКБ-10.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Icd10ClinicalSelector } from "../components/diagnostics/Icd10ClinicalSelector";
import { DENTAL_ICD10_MAP } from "../components/diagnostics/icd10DentalCatalog";

describe("Icd10ClinicalSelector React Component", () => {
	it("renders initial state with search input, rubric tabs, and 1-click popular presets", () => {
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

		// Quick popular presets section (1-click chips)
		assert.ok(
			html.includes("Частые клинические диагнозы (1 клик)"),
			"Contains quick presets section header",
		);
		assert.ok(html.includes("K02.1"), "Contains K02.1 quick chip");
		assert.ok(html.includes("K04.0"), "Contains K04.0 quick chip");
		assert.ok(html.includes("K05.1"), "Contains K05.1 quick chip");
		assert.ok(html.includes("K08.1"), "Contains K08.1 quick chip");
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
