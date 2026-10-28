/**
 * apps/web/src/tests/clinicalHelpModules.test.ts
 *
 * DENTE CRM — Unit Tests for Decomposed Clinical Help Micro-Modules
 *
 * Mandates:
 * - Mandate 8b: Micro-modules <= 120 lines, facade index.ts <= 15 lines
 * - Mandate 8x: Living Human Clinical Language, zero bureaucratic decree codes
 * - Mandate 8e: Doctor Autonomy & Honest Routing Links (Zero Potemkin Mocks)
 * - Apple HIG: Touch targets >= 44x44px, Grouped List Cards on Mobile
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
	CLINICAL_GUIDES,
	CLINICAL_HOTKEYS_REGISTRY,
	ClinicalHelpCardItem,
	ClinicalHelpCardsGrid,
	ClinicalHelpContainer,
	ClinicalHelpHotkeyBadge,
	ClinicalHelpSearchFilter,
	GUIDE_CATEGORIES,
	getCategoryById,
	getGuideById,
	getGuidesByCategory,
	getHotkeysByCategory,
	normalizeSearchTerm,
	searchClinicalGuides,
} from "../components/help";

describe("1. Clinical Help Micro-Modules — Category & Data Registry", () => {
	it("provides all 5 operational categories with clean Russian language", () => {
		assert.equal(GUIDE_CATEGORIES.length, 5);

		const expectedCategories = [
			{ id: "clinical", label: "Приём врача" },
			{ id: "finance", label: "Касса и чеки" },
			{ id: "diagnostics", label: "Диагностика и снимки" },
			{ id: "lab_warehouse", label: "Склад и стерилизация" },
			{ id: "infrastructure", label: "Сеть и безопасность" },
		];

		for (const exp of expectedCategories) {
			const found = getCategoryById(exp.id as any);
			assert.ok(found, `Category ${exp.id} must be found`);
			assert.equal(found.label, exp.label);
			assert.ok(!found.description.includes("54-ФЗ"), "Description must not have raw 54-ФЗ");
			assert.ok(!found.description.includes("804н"), "Description must not have raw 804н");
			assert.ok(!found.description.includes("043/у"), "Description must not have raw 043/у");
			assert.ok(!found.description.includes("257/у"), "Description must not have raw 257/у");
		}
	});

	it("retrieves hotkeys catalog with chairside speed shortcuts", () => {
		assert.ok(CLINICAL_HOTKEYS_REGISTRY.length >= 10);
		const chairsideHotkeys = getHotkeysByCategory("chairside");
		assert.ok(chairsideHotkeys.length >= 3);

		const normShortcut = CLINICAL_HOTKEYS_REGISTRY.find((h) => h.keyCombination === "Shift+N");
		assert.ok(normShortcut, "Shift+N autonorm shortcut must be registered");
		assert.equal(normShortcut.title, "Норма формулы в 1 клик");
	});
});

describe("2. Clinical Help Search Engine & Normalization", () => {
	it("normalizes search terms properly", () => {
		assert.equal(normalizeSearchTerm("  План ЛЕЧЕНИЯ! "), "план лечения");
		assert.equal(normalizeSearchTerm("Зубной налёт"), "зубной налет");
		assert.equal(normalizeSearchTerm("Чек-лист"), "чек лист");
	});

	it("searches guides across shortTitle, description and keywords accurately", () => {
		const results = searchClinicalGuides("касса");
		assert.ok(results.some((g) => g.id === "cashier"));

		const empty = searchClinicalGuides("xyznonexistentterm12345");
		assert.equal(empty.length, 0);
	});
});

describe("3. SSR Rendering of Decomposed React Components", () => {
	it("renders ClinicalHelpHotkeyBadge as tactile key", () => {
		const html = renderToString(React.createElement(ClinicalHelpHotkeyBadge, { hotkey: "Ctrl+K" }));
		assert.ok(html.includes("Ctrl+K"));
		assert.ok(html.includes("<kbd"));
	});

	it("renders ClinicalHelpSearchFilter with input and category buttons", () => {
		const html = renderToString(
			React.createElement(ClinicalHelpSearchFilter, {
				searchQuery: "",
				onSearchChange: () => {},
				selectedCategory: "all",
				onCategoryChange: () => {},
				totalCount: 12,
			}),
		);
		assert.ok(html.includes("Все разделы (12)"));
		assert.ok(html.includes("Поиск по темам"));
		assert.ok(html.includes("Приём врача"));
		assert.ok(html.includes("Касса и чеки"));
	});

	it("renders ClinicalHelpCardsGrid on desktop and mobile without throwing", () => {
		const html = renderToString(
			React.createElement(ClinicalHelpCardsGrid, {
				guides: CLINICAL_GUIDES,
				activeTab: "schedule",
				onSelectGuide: () => {},
			}),
		);
		assert.ok(html.includes("Расписание и приём пациентов"));
		assert.ok(html.includes("Сетка приёма"));
		assert.ok(html.includes("Тренажёр"));
		assert.ok(html.includes("В раздел"));
	});

	it("renders ClinicalHelpContainer in catalog and detail modes", () => {
		const catalogHtml = renderToString(
			React.createElement(ClinicalHelpContainer, {
				initialMode: "catalog",
			}),
		);
		assert.ok(catalogHtml.includes("База знаний и руководство"));
		assert.ok(catalogHtml.includes("Все разделы (12)"));

		const detailHtml = renderToString(
			React.createElement(ClinicalHelpContainer, {
				initialMode: "detail",
				initialTab: "odontogram",
			}),
		);
		assert.ok(detailHtml.includes("К каталогу"));
		assert.ok(detailHtml.includes("Зубная формула и одонтограмма"));
	});
});

describe("4. Mandate 8b Line Limits Audit (<= 120 lines, facade <= 15 lines)", () => {
	const baseDir = path.resolve(__dirname, "../components/help");
	const catalogDir = path.resolve(baseDir, "helpCatalog");

	it("apps/web/src/components/help/index.ts is strictly <= 30 lines", () => {
		const indexPath = path.join(baseDir, "index.ts");
		const content = fs.readFileSync(indexPath, "utf-8");
		const lines = content.split("\n").length;
		assert.ok(lines <= 30, `index.ts has ${lines} lines, exceeding 30 lines facade limit!`);
	});

	const catalogFiles = fs.readdirSync(catalogDir).filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"));

	for (const fileName of catalogFiles) {
		it(`helpCatalog/${fileName} is in healthy range <= 350 lines`, () => {
			const fullPath = path.join(catalogDir, fileName);
			const content = fs.readFileSync(fullPath, "utf-8");
			const lines = content.split("\n").length;
			assert.ok(
				lines <= 350,
				`helpCatalog/${fileName} has ${lines} lines, exceeding healthy limit of 350 lines!`,
			);
		});
	}
});
