import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
	CATEGORY_TABS,
	detectCategoryByTitleKeywords,
	QUICK_CLINICAL_CHIPS,
} from "../components/settings/pricelistEditorHelpers";

/**
 * RED TEAM INQUISITION: PRICELIST & SERVICES CATALOG HUMANIZATION & ZERO-BARRIER IMPORT
 *
 * Mandates 8b, 8e, 8l, 8n, 8x, 8am:
 * 1. Extermination of Soviet 804n code junk from doctor-facing UI and labels.
 * 2. Zero-Barrier Flat Excel/CSV Import with 1-click commit actions.
 * 3. Smart keyword auto-categorization for flat [Title | Price] data.
 * 4. Strict Mandate 8b file size invariant (all files <= 800 lines).
 * 5. Monolithic 1-row toolbar (h-9, min-h-[36px]) with Apple Filter Chips.
 */

const here = dirname(fileURLToPath(import.meta.url));
const pricesTabDir = join(here, "..", "components", "settings", "pricesTab");
const settingsTabFile = join(here, "..", "components", "settings", "SettingsPricesTab.tsx");

function readDirFiles(dir: string): Record<string, string> {
	const result: Record<string, string> = {};
	for (const file of readdirSync(dir)) {
		if (/\.(tsx|ts)$/.test(file)) {
			result[file] = readFileSync(join(dir, file), "utf8");
		}
	}
	return result;
}

const tabFiles = readDirFiles(pricesTabDir);
tabFiles["SettingsPricesTab.tsx"] = readFileSync(settingsTabFile, "utf8");

describe("Red Team: Pricelist Humanization, Zero-Barrier Flat Import & UI Invariants", () => {
	it("1. Mandate 8b File Size Invariant: all pricelist component files are strictly <= 800 lines", () => {
		for (const [name, content] of Object.entries(tabFiles)) {
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount <= 800,
				`File ${name} exceeds Mandate 8b limit of 800 lines: ${lineCount} lines`,
			);
		}
	});

	it("2. Mandate 8x: Extermination of Soviet '804н' from visible UI buttons and headings", () => {
		const toolbarCode = tabFiles["PricesFilterToolbar.tsx"] || "";
		// Visible button labels must not contain 804н
		assert.ok(
			!toolbarCode.includes(">Справочник 804н<"),
			"Toolbar must not show bureaucratic 'Справочник 804н'",
		);
		assert.ok(
			toolbarCode.includes("Справочник услуг") || toolbarCode.includes("Каталог процедур"),
			"Toolbar must display clean Russian label 'Справочник услуг'",
		);

		const importModalCode = tabFiles["PriceImportModal.tsx"] || "";
		assert.ok(
			!importModalCode.includes("Импорт прейскуранта 804н"),
			"Import modal must not display raw bureaucratic '804н'",
		);
		assert.ok(
			importModalCode.includes("Импорт прейскуранта клиники"),
			"Import modal must display human clinical title 'Импорт прейскуранта клиники'",
		);
	});

	it("3. Mandate 8n: Zero-Barrier Flat Import offers 1-Click direct commit buttons in file and text modes", () => {
		const importModalCode = tabFiles["PriceImportModal.tsx"] || "";
		assert.ok(
			importModalCode.includes('data-testid="btn-flat-import-commit"'),
			"Dropzone file card must provide 1-click import button 'btn-flat-import-commit'",
		);
		assert.ok(
			importModalCode.includes('data-testid="btn-flat-text-commit"'),
			"Text mode must provide 1-click import button 'btn-flat-text-commit'",
		);
		assert.ok(
			importModalCode.includes("Импортировать в каталог (в 1 клик)"),
			"Buttons must clearly state 'Импортировать в каталог (в 1 клик)' for solo doctor autonomy",
		);
	});

	it("4. Smart Keyword Auto-Categorization correctly maps flat service titles without manual classification", () => {
		// Therapy
		assert.equal(detectCategoryByTitleKeywords("Восстановление зуба пломбой световой Filtek"), "therapy");
		assert.equal(detectCategoryByTitleKeywords("Лечение глубокого кариеса"), "therapy");
		assert.equal(detectCategoryByTitleKeywords("Эндодонтическая обработка 3 каналов"), "therapy");

		// Surgery
		assert.equal(detectCategoryByTitleKeywords("Сложное удаление ретенированного зуба"), "surgery");
		assert.equal(detectCategoryByTitleKeywords("Установка дентального имплантата Straumann"), "surgery");
		assert.equal(detectCategoryByTitleKeywords("Открытый синус-лифтинг с костной пластикой"), "surgery");

		// Orthopedics / Prosthetics
		assert.equal(detectCategoryByTitleKeywords("Коронка из диоксида циркония на каркасе"), "prosthetics");
		assert.equal(detectCategoryByTitleKeywords("Керамический винир E-max"), "prosthetics");
		assert.equal(detectCategoryByTitleKeywords("Снятие двухслойного силиконового слепка"), "prosthetics");

		// Hygiene
		assert.equal(detectCategoryByTitleKeywords("Комплексная гигиеническая чистка Air-Flow"), "hygiene");
		assert.equal(detectCategoryByTitleKeywords("Ультразвуковое снятие наддесневых отложений"), "hygiene");
		assert.equal(detectCategoryByTitleKeywords("Клиническое отбеливание зубов Zoom 4"), "hygiene");

		// Orthodontics
		assert.equal(detectCategoryByTitleKeywords("Фиксация металлической брекет-системы Damon"), "orthodontics");
		assert.equal(detectCategoryByTitleKeywords("Изготовление элайнеров FlexiLigner"), "orthodontics");

		// Imaging & Consultation
		assert.equal(detectCategoryByTitleKeywords("Компьютерная томография двух челюстей (КЛКТ)"), "imaging");
		assert.equal(detectCategoryByTitleKeywords("Прицельный визиографический снимок"), "imaging");
		assert.equal(detectCategoryByTitleKeywords("Первичная консультация врача-стоматолога"), "consultation");
	});

	it("5. Quick Clinical Chips use natural doctor terminology instead of Soviet bureaucratic codes", () => {
		assert.ok(QUICK_CLINICAL_CHIPS.length >= 8);
		const cariesChip = QUICK_CLINICAL_CHIPS.find((c) => c.code === "A16.07.002");
		assert.ok(cariesChip);
		assert.equal(cariesChip?.label, "Лечение кариеса");

		const crownChip = QUICK_CLINICAL_CHIPS.find((c) => c.code === "A16.07.004");
		assert.ok(crownChip);
		assert.equal(crownChip?.label, "Коронка");

		const surgeryChip = QUICK_CLINICAL_CHIPS.find((c) => c.code === "A16.07.001");
		assert.ok(surgeryChip);
		assert.equal(surgeryChip?.label, "Удаление зуба");
	});

	it("6. UI Standards: Toolbar strictly maintains 1 row (sm:h-9) and exactly 1 Primary CTA in header", () => {
		const toolbarCode = tabFiles["PricesFilterToolbar.tsx"] || "";
		assert.ok(
			toolbarCode.includes("sm:h-9"),
			"Toolbar must enforce desktop height of 36px (sm:h-9)",
		);
		assert.ok(
			toolbarCode.includes('data-testid="btn-add-service-catalog"'),
			"Toolbar must have Primary CTA '+ Добавить услугу'",
		);
		assert.ok(
			CATEGORY_TABS.length >= 7,
			"Category tabs must provide comprehensive Apple Filter Chips",
		);
	});
});
