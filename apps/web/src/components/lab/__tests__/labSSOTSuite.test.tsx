/**
 * apps/web/src/components/lab/__tests__/labSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team SSOT Inquisition Suite for Dental Laboratory & Studio.
 * Verifies orthopedic constructions, Vita shades, 5 production stages, doctor autonomy (Mandate 8e),
 * single primary CTA #0d9488 (Mandate 8am), and Standalone Launchers mounting (Mandate 8aq).
 * Uses native node:test & node:assert/strict for zero-bloat ultra-fast execution.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
	CANONICAL_LAB_STAGES,
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	STUMP_SHADES,
	CLINIC_LABORATORIES,
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	SEED_LAB_ORDERS,
	addWorkingDaysRu,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
} from "../labCatalogData";
import { checkIsLabActive } from "../DirectLabLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(labDir, "../..");

describe("DENTE Dental Laboratory SSOT & Studio Red Team Suite", () => {
	it("1.1. Contains all canonical orthopedic materials with integer kopecks pricing", () => {
		assert.ok(CANONICAL_LAB_MATERIALS.length >= 6, "Must contain at least 6 canonical materials");
		const ids = CANONICAL_LAB_MATERIALS.map((m) => m.id);
		assert.ok(ids.includes("zirconia_multilayer"), "Must contain zirconia multilayer");
		assert.ok(ids.includes("emax_press"), "Must contain emax press");
		assert.ok(ids.includes("metal_ceramic_cocr"), "Must contain metal ceramic");
		assert.ok(ids.includes("pmma_temp"), "Must contain PMMA temporary");
		assert.ok(ids.includes("clasp_prosthesis"), "Must contain clasp prosthesis");
		assert.ok(ids.includes("zirconia_abutment"), "Must contain custom zirconia abutment");

		for (const m of CANONICAL_LAB_MATERIALS) {
			assert.ok(m.baseLabCostKopecks > 0, `Base cost must be > 0 for ${m.id}`);
			assert.ok(
				m.defaultPatientPriceKopecks > m.baseLabCostKopecks,
				`Patient price must exceed lab cost for ${m.id}`,
			);
			assert.ok(m.defaultDurationDays > 0, `Duration must be > 0 for ${m.id}`);
			assert.ok(m.titleRu && m.titleRu.length > 5, `TitleRu must be present for ${m.id}`);
		}
	});

	it("1.2. Contains comprehensive Vita Classical & Bleach shades with valid hex colors", () => {
		assert.ok(VITA_SHADES_SSOT.length >= 16, "Must contain at least 16 Vita shades");
		const codes = VITA_SHADES_SSOT.map((v) => v.code);
		assert.ok(codes.includes("A1"), "Must contain A1");
		assert.ok(codes.includes("A2"), "Must contain A2");
		assert.ok(codes.includes("A3"), "Must contain A3");
		assert.ok(codes.includes("A3.5"), "Must contain A3.5");
		assert.ok(codes.includes("B1"), "Must contain B1");
		assert.ok(codes.includes("C1"), "Must contain C1");
		assert.ok(codes.includes("D2"), "Must contain D2");
		assert.ok(codes.includes("BL1"), "Must contain BL1 Bleach");
		assert.ok(codes.includes("BL2"), "Must contain BL2 Bleach");

		for (const v of VITA_SHADES_SSOT) {
			assert.match(v.approxHex, /^#[0-9A-Fa-f]{6}$/, `Invalid hex color for ${v.code}`);
		}

		assert.ok(STUMP_SHADES.length >= 9, "Must contain ND1..ND9 stump shades");
	});

	it("1.3. Contains 5 sequential canonical stages", () => {
		assert.equal(CANONICAL_LAB_STAGES.length, 5, "Must contain exactly 5 canonical stages");
		const stageIds = CANONICAL_LAB_STAGES.map((s) => s.id);
		assert.deepEqual(stageIds, [
			"scan_sent",
			"in_production",
			"fitting_ready",
			"in_clinic",
			"seated",
		]);

		CANONICAL_LAB_STAGES.forEach((s, idx) => {
			assert.equal(s.stepNumber, idx + 1, `Stage ${s.id} stepNumber must be ${idx + 1}`);
			assert.ok(s.labelRu && s.labelRu.length > 3, `Stage ${s.id} labelRu must be present`);
		});
	});

	it("1.4. Validates Russian working days calculation (excluding weekends)", () => {
		// Пятница: +1 рабочий день должен стать понедельником (+3 календарных дня)
		const friday = new Date(2026, 9, 30); // 30 Oct 2026 = Friday
		const nextWorkDay = addWorkingDaysRu(friday, 1);
		assert.equal(nextWorkDay.getDay(), 1, "Next working day after Friday must be Monday");

		// +5 рабочих дней
		const fiveDaysLater = addWorkingDaysRu(friday, 5);
		assert.equal(fiveDaysLater.getDay(), 5, "5 working days after Friday must be next Friday");
	});

	it("1.5. Validates integer kopecks accounting and formatting helpers", () => {
		const formatted = formatKopecksToRubles(750000);
		assert.ok(formatted.includes("7") && formatted.includes("500") && formatted.includes("₽"));
		assert.equal(calcNetRevenueKopecks(2400000, 750000), 1650000);
		assert.equal(getStageMeta("in_clinic").labelRu, "Готово в клинике");
		assert.equal(getMaterialMeta("zirconia_multilayer").shortTitle, "Цирконий (ZrO2)");

		const overdueOrder = {
			...SEED_LAB_ORDERS[0]!,
			stage: "in_production" as const,
			dueDate: "2020-01-01",
		};
		assert.equal(isOrderOverdue(overdueOrder), true);

		const completedOrder = {
			...SEED_LAB_ORDERS[0]!,
			stage: "in_clinic" as const,
			dueDate: "2020-01-01",
		};
		assert.equal(isOrderOverdue(completedOrder), false);
	});

	it("2.1. Validates LabStudioModal structure and Mandate 8am (Single Primary CTA #0d9488)", () => {
		const modalPath = path.resolve(labDir, "LabStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "LabStudioModal.tsx must exist");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Заголовок и клиническая терминология (Мандат 8x)
		assert.ok(
			content.includes("Зуботехническая лаборатория и заказ-наряды"),
			"Must include clean domain header",
		);

		// Ровно 1 Primary CTA кнопка (Мандат 8am)
		assert.ok(
			content.includes('data-testid="submit-lab-order-button"'),
			"Must render submit-lab-order-button",
		);
		assert.ok(
			content.includes("✓ Отправить заказ в лабораторию"),
			"Button must state '✓ Отправить заказ в лабораторию'",
		);
		assert.ok(
			content.includes("var(--teal"),
			"Primary CTA must use teal #0d9488 token",
		);

		// Мандат 8e: Кнопка НИКОГДА не disabled
		assert.ok(
			!content.includes('disabled={!'),
			"Primary CTA must NEVER be disabled by secondary inputs",
		);
		assert.ok(
			!content.includes("disabled={true}"),
			"Primary CTA must NEVER be permanently disabled",
		);
	});

	it("2.2. Validates Doctor Autonomy & Express Order 1-Click Form (Mandate 8e)", () => {
		const modalPath = path.resolve(labDir, "LabStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Экспресс-создание наряда у кресла
		assert.ok(
			content.includes("Экспресс-наряд у кресла"),
			"Must feature chairside express order section",
		);
		assert.ok(
			content.includes('data-testid={`tooth-chip-${tooth}`}'),
			"Must render FDI tooth chips",
		);
		assert.ok(
			content.includes('data-testid={`shade-chip-${v.code}`}'),
			"Must render Vita shade chips",
		);
		assert.ok(
			content.includes('data-testid="lab-material-select"'),
			"Must render material select dropdown",
		);

		// Фильтры реестра нарядов
		assert.ok(
			content.includes('data-testid={`filter-tab-${tab}`}'),
			"Must render filter tabs",
		);
		assert.ok(
			content.includes('data-testid="lab-orders-search-input"'),
			"Must render search input",
		);
	});

	it("2.3. Validates Apple HIG Mobile Bottom Sheet & Drag Handle (Mandate 8ze)", () => {
		const modalPath = path.resolve(labDir, "LabStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Drag handle 36x5px (w-9 h-1 rounded-full)
		assert.ok(
			content.includes("w-9 h-1 rounded-full"),
			"Must render Apple HIG drag handle 36x5px",
		);
		assert.ok(
			content.includes("rounded-t-[24px]"),
			"Must render rounded-t-[24px] Bottom Sheet top corners",
		);
	});

	it("2.4. Validates FDI 2-jaw anatomy without scrolling", () => {
		assert.equal(UPPER_JAW_TEETH.length, 14, "Upper jaw must contain 14 teeth");
		assert.equal(LOWER_JAW_TEETH.length, 14, "Lower jaw must contain 14 teeth");
		assert.ok(UPPER_JAW_TEETH.includes(16), "Upper jaw must include 16");
		assert.ok(UPPER_JAW_TEETH.includes(21), "Upper jaw must include 21");
		assert.ok(LOWER_JAW_TEETH.includes(46), "Lower jaw must include 46");
		assert.ok(LOWER_JAW_TEETH.includes(31), "Lower jaw must include 31");
	});

	it("2.5. Validates zero cartoon emojis in lab components (Mandate 8d)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const targetFiles = [
			path.resolve(labDir, "LabStudioModal.tsx"),
			path.resolve(labDir, "labCatalogData.ts"),
			path.resolve(labDir, "DirectLabLauncher.tsx"),
		];

		for (const file of targetFiles) {
			const content = fs.readFileSync(file, "utf-8");
			const lines = content.split(/\r?\n/);
			lines.forEach((line, idx) => {
				const cleaned = line.replace(/✓/g, "").replace(/✕/g, "");
				const match = cleaned.match(emojiRegex);
				assert.equal(
					match,
					null,
					`Found cartoon emoji ${match?.[0]} in ${path.basename(file)} at line ${idx + 1}`,
				);
			});
		}
	});

	it("3.1. checkIsLabActive detects deep-link signatures correctly", () => {
		const originalWindow = globalThis.window;
		try {
			(globalThis as any).window = {
				location: {
					hash: "#lab",
					search: "",
				},
			};
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = {
				hash: "#dental-lab",
				search: "",
			};
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = {
				hash: "",
				search: "?standalone=dental_lab",
			};
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = {
				hash: "",
				search: "?lab=1",
			};
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = {
				hash: "",
				search: "",
			};
			assert.equal(checkIsLabActive(), false);
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("3.2. Mandate 8aq: DirectLabLauncher is mounted in AppShell.tsx and StandaloneLaunchers.tsx", () => {
		const appShellPath = path.resolve(webSrcDir, "AppShell.tsx");
		const launchersPath = path.resolve(
			webSrcDir,
			"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);

		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers.tsx must exist");

		const appShellContent = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			appShellContent.includes("DirectDentalLabLauncher") || appShellContent.includes("DirectLabLauncher"),
			"AppShell.tsx must import DirectDentalLabLauncher or DirectLabLauncher",
		);

		const launchersContent = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(
			launchersContent.includes("DirectDentalLabLauncher") || launchersContent.includes("DirectLabLauncher"),
			"StandaloneLaunchers.tsx must import lab launcher",
		);
		assert.ok(
			launchersContent.includes("#lab"),
			"StandaloneLaunchers.tsx must handle #lab deep link",
		);
		assert.ok(
			launchersContent.includes("#dental-lab"),
			"StandaloneLaunchers.tsx must handle #dental-lab deep link",
		);
	});
});
