/**
 * apps/web/src/components/lab/__tests__/dentalLabSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team SSOT Inquisition Suite for Dental Laboratory & Studio.
 * Verifies materials, Vita shades, 5 production stages, doctor autonomy (Mandate 8e),
 * single primary CTA (Mandate 8am), and Standalone Launchers mounting (Mandate 8aq).
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
	FDI_QUICK_TEETH,
	CLINIC_LABORATORIES,
	SEED_LAB_ORDERS,
	formatKopecksToRubles,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
	calcNetRevenueKopecks,
} from "../dentalLabCatalogData";
import { checkIsLabActive } from "../DirectDentalLabLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(labDir, "../..");

describe("DENTE Dental Laboratory SSOT & Studio Red Team Suite", () => {
	it("1.1. Contains all 6 canonical orthopedic materials with kopecks pricing", () => {
		assert.equal(CANONICAL_LAB_MATERIALS.length, 6, "Must contain exactly 6 materials");
		const ids = CANONICAL_LAB_MATERIALS.map((m) => m.id);
		assert.ok(ids.includes("zirconia_multilayer"), "Must contain zirconia");
		assert.ok(ids.includes("emax_press"), "Must contain emax");
		assert.ok(ids.includes("metal_ceramic_cocr"), "Must contain metal ceramic");
		assert.ok(ids.includes("pmma_temp"), "Must contain PMMA temporary");
		assert.ok(ids.includes("clasp_prosthesis"), "Must contain clasp prosthesis");
		assert.ok(ids.includes("aligner_splint"), "Must contain aligner/splint");

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

	it("1.2. Contains comprehensive Vita Classical & Bleach shades", () => {
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

	it("1.4. Validates calculation and formatting helpers", () => {
		const formatted = formatKopecksToRubles(450000);
		assert.ok(formatted.includes("4") && formatted.includes("500") && formatted.includes("₽"));
		assert.equal(calcNetRevenueKopecks(2200000, 450000), 1750000);
		assert.equal(getStageMeta("in_clinic").labelRu, "Готово в клинике");
		assert.equal(getMaterialMeta("zirconia_multilayer").shortTitle, "Цирконий ZrO2");

		const overdueOrder = {
			...SEED_LAB_ORDERS[0],
			stage: "in_production" as const,
			dueDate: "2020-01-01",
		};
		assert.equal(isOrderOverdue(overdueOrder), true);

		const completedOrder = {
			...SEED_LAB_ORDERS[0],
			stage: "in_clinic" as const,
			dueDate: "2020-01-01",
		};
		assert.equal(isOrderOverdue(completedOrder), false);
	});

	it("2.1. Validates DentalLabStudioModal structure and Mandate 8am (Single Primary CTA #0d9488)", () => {
		const modalPath = path.resolve(labDir, "DentalLabStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "DentalLabStudioModal.tsx must exist");
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
		const modalPath = path.resolve(labDir, "DentalLabStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Экспресс-создание наряда у кресла
		assert.ok(
			content.includes("Экспресс-наряд у кресла"),
			"Must feature chairside express order section",
		);
		assert.ok(
			content.includes("data-testid={`tooth-chip-${tooth}`}"),
			"Must render FDI tooth chips",
		);
		assert.ok(
			content.includes("data-testid={`shade-chip-${v.code}`}"),
			"Must render Vita shade chips",
		);
		assert.ok(
			content.includes("data-testid=\"lab-material-select\""),
			"Must render material select dropdown",
		);

		// Фильтры реестра нарядов
		assert.ok(
			content.includes("data-testid=\"filter-tab-all\""),
			"Must render all orders filter",
		);
		assert.ok(
			content.includes("data-testid=\"filter-tab-in_work\""),
			"Must render in_work filter",
		);
		assert.ok(
			content.includes("data-testid=\"filter-tab-in_clinic\""),
			"Must render in_clinic filter",
		);
		assert.ok(
			content.includes("data-testid=\"filter-tab-overdue\""),
			"Must render overdue filter",
		);
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

	it("3.2. Mandate 8aq: DirectDentalLabLauncher is mounted in AppShell.tsx and StandaloneLaunchers.tsx", () => {
		const appShellPath = path.resolve(webSrcDir, "AppShell.tsx");
		const launchersPath = path.resolve(
			webSrcDir,
			"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
		);

		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers.tsx must exist");

		const appShellContent = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(
			appShellContent.includes("DirectDentalLabLauncher"),
			"AppShell.tsx must import DirectDentalLabLauncher",
		);
		assert.ok(
			appShellContent.includes("<DirectDentalLabLauncher />"),
			"AppShell.tsx must render <DirectDentalLabLauncher />",
		);

		const launchersContent = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(
			launchersContent.includes("DirectDentalLabLauncher"),
			"StandaloneLaunchers.tsx must import DirectDentalLabLauncher",
		);
		assert.ok(
			launchersContent.includes("<DirectDentalLabLauncher />"),
			"StandaloneLaunchers.tsx must render <DirectDentalLabLauncher />",
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
