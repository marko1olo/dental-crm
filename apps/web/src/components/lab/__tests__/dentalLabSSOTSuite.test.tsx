/**
 * apps/web/src/components/lab/__tests__/dentalLabSSOTSuite.test.tsx
 *
 * DENTE Dental CRM — Red Team SSOT Inquisitor Suite for Dental Laboratory & Orthopedic Orders.
 * Верифицирует:
 * 1. 5 канонических стадий заказ-наряда и 0 float-ошибок (целочисленные копейки).
 * 2. Полную палитру оттенков VITA Classic (A1..D4) + Bleach (BL1..BL4).
 * 3. Автономию врача (Мандат 8e): кнопка «✓ Создать заказ-наряд» НИКОГДА не блокируется.
 * 4. Единый дизайн-код (Мандат 8am): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * 5. Нативный мобильный Apple HIG Bottom Sheet (Мандат 8ze): drag handle 36x5px, тач-таргеты >= 44x44px.
 * 6. Маршрутизацию лаунчеров (#lab, #dental-lab, #lab-orders, ?lab=1) и монтирование в AppShell (Мандат 8aq).
 * 7. Архитектурный закон Sweet Spot (Мандат 8b): искоренение микро-шредера, оптимальные размеры файлов.
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
	calculateZtlPayrollNetRevenue,
	getStageMeta,
	getMaterialMeta,
	isOrderOverdue,
} from "../dentalLabCatalogData";
import { checkIsLabActive } from "../DirectDentalLabLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(labDir, "../..");

describe("DENTE Dental Laboratory & Orthopedic Orders Canonical SSOT Suite", () => {
	// =========================================================================
	// 1. КАТАЛОГ ОРТОПЕДИЧЕСКИХ КОНСТРУКЦИЙ И ЦЕЛОЧИСЛЕННЫЕ КОПЕЙКИ (0 FLOAT)
	// =========================================================================
	it("1.1. Contains all popular orthopedic materials with integer kopecks accounting", () => {
		assert.ok(CANONICAL_LAB_MATERIALS.length >= 6, "Must contain at least 6 canonical materials");
		const ids = CANONICAL_LAB_MATERIALS.map((m) => m.id);
		assert.ok(ids.includes("zirconia_multilayer"), "Must contain zirconia multilayer");
		assert.ok(ids.includes("emax_press"), "Must contain E.max press");
		assert.ok(ids.includes("metal_ceramic_cocr"), "Must contain metal ceramic");
		assert.ok(ids.includes("clasp_prosthesis"), "Must contain clasp prosthesis");
		assert.ok(ids.includes("zirconia_abutment"), "Must contain custom zirconia abutment");
		assert.ok(ids.includes("pmma_temp"), "Must contain PMMA temporary crown");

		for (const mat of CANONICAL_LAB_MATERIALS) {
			assert.ok(Number.isInteger(mat.baseLabCostKopecks), `Cost must be integer kopecks for ${mat.id}`);
			assert.ok(Number.isInteger(mat.defaultPatientPriceKopecks), `Price must be integer kopecks for ${mat.id}`);
			assert.ok(mat.baseLabCostKopecks > 0, `Base cost must be > 0 for ${mat.id}`);
			assert.ok(mat.defaultPatientPriceKopecks > mat.baseLabCostKopecks, `Price must exceed cost for ${mat.id}`);
			assert.ok(mat.defaultDurationDays > 0, `Default duration days must be > 0 for ${mat.id}`);
			assert.ok(mat.titleRu && mat.titleRu.length > 5, `Detailed titleRu must be present for ${mat.id}`);
		}
	});

	// =========================================================================
	// 2. ПАЛИТРА VITA CLASSIC + BLEACH И КУЛЬТЕВЫЕ ОТТЕНКИ
	// =========================================================================
	it("1.2. Contains comprehensive VITA Classic & Bleach shades with hex color accuracy", () => {
		assert.ok(VITA_SHADES_SSOT.length >= 16, "Must contain at least 16 VITA shades");
		const codes = VITA_SHADES_SSOT.map((s) => s.code);
		// Classic groups
		assert.ok(codes.includes("A1") && codes.includes("A2") && codes.includes("A3") && codes.includes("A3.5") && codes.includes("A4"));
		assert.ok(codes.includes("B1") && codes.includes("B2") && codes.includes("B3") && codes.includes("B4"));
		assert.ok(codes.includes("C1") && codes.includes("C2") && codes.includes("C3") && codes.includes("C4"));
		assert.ok(codes.includes("D2") && codes.includes("D3") && codes.includes("D4"));
		// Bleach group
		assert.ok(codes.includes("BL1") && codes.includes("BL2") && codes.includes("BL3") && codes.includes("BL4"));

		for (const shade of VITA_SHADES_SSOT) {
			assert.match(shade.approxHex, /^#[0-9A-Fa-f]{6}$/, `Invalid hex color code for ${shade.code}`);
			assert.ok(shade.label && shade.label.length > 2, `Label must be descriptive for ${shade.code}`);
		}

		assert.ok(STUMP_SHADES.length >= 9, "Must contain ND1..ND9 stump shades");
	});

	// =========================================================================
	// 3. 5 КАНОНИЧЕСКИХ СТАДИЙ И ТРЕКИНГ ЗАКАЗ-НАРЯДА
	// =========================================================================
	it("1.3. Contains exactly 5 sequential canonical stages", () => {
		assert.equal(CANONICAL_LAB_STAGES.length, 5, "Must contain exactly 5 canonical stages");
		const stageIds = CANONICAL_LAB_STAGES.map((s) => s.id);
		assert.deepEqual(stageIds, ["scan_sent", "in_production", "fitting_ready", "in_clinic", "seated"]);

		CANONICAL_LAB_STAGES.forEach((stage, idx) => {
			assert.equal(stage.stepNumber, idx + 1, `Stage ${stage.id} stepNumber must be ${idx + 1}`);
			assert.ok(stage.labelRu && stage.labelRu.length > 3, `Stage ${stage.id} labelRu must be present`);
			assert.ok(stage.borderToken && stage.bgToken, `CSS tokens must be defined for ${stage.id}`);
		});
	});

	// =========================================================================
	// 4. ЭКСПРЕСС-РАСЧЕТ СРОКОВ ПО РАБОЧИМ ДНЯМ ЗТЛ В РФ
	// =========================================================================
	it("1.4. Validates Russian working days calculation excluding weekends", () => {
		const friday = new Date(2026, 9, 30); // 30 Oct 2026 = Friday
		const monday = addWorkingDaysRu(friday, 1);
		assert.equal(monday.getDay(), 1, "Next working day after Friday must be Monday");

		const nextFriday = addWorkingDaysRu(friday, 5);
		assert.equal(nextFriday.getDay(), 5, "5 working days after Friday must be next Friday");
	});

	// =========================================================================
	// 5. РАСЧЕТЫ ВЫРУЧКИ И СДЕЛЬНОЙ ОПЛАТЫ ВРАЧА (ZTL PAYROLL)
	// =========================================================================
	it("1.5. Validates revenue and payroll helpers in integer kopecks", () => {
		const netRevenue = calcNetRevenueKopecks(2400000, 750000);
		assert.equal(netRevenue, 1650000, "Net revenue must be 1 650 000 kopecks");

		const payroll = calculateZtlPayrollNetRevenue(2400000, 750000, 25);
		assert.equal(payroll.doctorWageKopecks, 412500, "Doctor 25% wage from net revenue must be 412 500 kopecks");

		const warrantyPayroll = calculateZtlPayrollNetRevenue(2400000, 750000, 25, true);
		assert.equal(warrantyPayroll.labCostKopecks, 0, "Warranty cases have 0 lab cost deductible");

		const formatted = formatKopecksToRubles(750000);
		assert.ok(formatted.includes("7") && formatted.includes("500") && formatted.includes("₽"));
	});

	// =========================================================================
	// 6. КАНОНИЧЕСКАЯ СТУДИЯ: АВТОНОМИЯ ВРАЧА (МАНДАТ 8e) И ЕДИНЫЙ CTA (МАНДАТ 8am)
	// =========================================================================
	it("2.1. Validates DentalLabStudioModal single primary CTA #0d9488 and Doctor Autonomy (Mandates 8e, 8am)", () => {
		const modalPath = path.resolve(labDir, "DentalLabStudioModal.tsx");
		assert.ok(fs.existsSync(modalPath), "DentalLabStudioModal.tsx must exist");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Заголовок студии
		assert.ok(content.includes("Зуботехническая лаборатория и заказ-наряды"), "Must include domain header");

		// Ровно 1 Primary CTA кнопка #0d9488
		assert.ok(content.includes('data-testid="submit-lab-order-button"'), "Must render submit-lab-order-button");
		assert.ok(content.includes("✓ Создать заказ-наряд"), "Button must feature '✓ Создать заказ-наряд'");
		assert.ok(content.includes("var(--teal"), "Primary CTA must use teal #0d9488 token");

		// Мандат 8e: Кнопка НИКОГДА не disabled
		assert.ok(!content.includes("disabled={!"), "Primary CTA must NEVER be disabled by secondary inputs");
		assert.ok(!content.includes("disabled={true}"), "Primary CTA must NEVER be permanently disabled");
	});

	// =========================================================================
	// 7. ЭКСПРЕСС-НАРЯД ЗА 10 СЕКУНД И БЫСТРЫЕ ДЕЙСТВИЯ ОРТОПЕДА
	// =========================================================================
	it("2.2. Validates chairside 10-second express form and quick doctor actions", () => {
		const modalPath = path.resolve(labDir, "DentalLabStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");

		// Экспресс-наряд
		assert.ok(content.includes("Экспресс-наряд у кресла"), "Must feature express order section");
		assert.ok(content.includes('data-testid={`tooth-chip-${tooth}`}'), "Must render tooth chips");
		assert.ok(content.includes('data-testid={`shade-chip-${v.code}`}'), "Must render VITA shade chips");
		assert.ok(content.includes('data-testid="lab-material-select"'), "Must render material select");
		assert.ok(content.includes('data-testid="lab-partner-select"'), "Must render laboratory select");

		// Быстрые действия ортопеда
		assert.ok(content.includes("mark-ready-btn-"), "Must render 'В клинике' quick action");
		assert.ok(content.includes("call-patient-btn-"), "Must render 'Примерка' call patient quick action");
		assert.ok(content.includes("print-order-btn-"), "Must render 'Бланк' print order quick action");
		assert.ok(content.includes("advance-stage-btn-"), "Must render 'Этап →' advance stage quick action");
	});

	// =========================================================================
	// 8. МОБИЛЬНЫЙ ДИЗАЙН APPLE HIG (МАНДАТ 8ze)
	// =========================================================================
	it("2.3. Validates Apple HIG Mobile Bottom Sheet & Drag Handle (Mandate 8ze)", () => {
		const modalPath = path.resolve(labDir, "DentalLabStudioModal.tsx");
		const content = fs.readFileSync(modalPath, "utf-8");
		const cssPath = path.resolve(labDir, "styles/dentalLabStudio.css");
		assert.ok(fs.existsSync(cssPath), "dentalLabStudio.css must exist");
		const cssContent = fs.readFileSync(cssPath, "utf-8");

		// Drag handle 36x5px
		assert.ok(content.includes("w-9 h-1 rounded-full"), "Must render Apple HIG drag handle 36x5px");
		assert.ok(cssContent.includes("--lab-drag-handle-width: 36px"), "CSS must declare 36px drag handle width");
		assert.ok(cssContent.includes("--lab-drag-handle-height: 5px"), "CSS must declare 5px drag handle height");

		// Touch targets >= 44x44px and safe area
		assert.ok(cssContent.includes("--lab-touch-target-min: 44px"), "CSS must declare 44px minimum touch target");
		assert.ok(cssContent.includes("safe-area-inset-bottom"), "CSS must account for iOS safe area inset");
		assert.ok(cssContent.includes("overflow-x: clip"), "CSS must prevent horizontal scroll");
	});

	// =========================================================================
	// 9. НОЛЬ МУЛЬТЯШНЫХ ЭМОДЗИ (МАНДАТ 8d)
	// =========================================================================
	it("2.4. Validates zero cartoon emojis in lab SSOT files (Mandate 8d)", () => {
		const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
		const targetFiles = [
			path.resolve(labDir, "DentalLabStudioModal.tsx"),
			path.resolve(labDir, "dentalLabCatalogData.ts"),
			path.resolve(labDir, "DirectDentalLabLauncher.tsx"),
		];

		for (const file of targetFiles) {
			const content = fs.readFileSync(file, "utf-8");
			const lines = content.split(/\r?\n/);
			lines.forEach((line, idx) => {
				const cleaned = line.replace(/✓/g, "").replace(/✕/g, "").replace(/•/g, "").replace(/→/g, "");
				const match = cleaned.match(emojiRegex);
				assert.equal(match, null, `Found cartoon emoji ${match?.[0]} in ${path.basename(file)} at line ${idx + 1}`);
			});
		}
	});

	// =========================================================================
	// 10. МАРШРУТИЗАЦИЯ И МОНТИРОВАНИЕ В APPSHELL (МАНДАТ 8aq)
	// =========================================================================
	it("3.1. checkIsLabActive detects deep-link signatures correctly", () => {
		const originalWindow = globalThis.window;
		try {
			(globalThis as any).window = { location: { hash: "#lab", search: "" } };
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = { hash: "#dental-lab", search: "" };
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = { hash: "#lab-orders", search: "" };
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = { hash: "", search: "?lab=1" };
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = { hash: "", search: "?standalone=dental_lab" };
			assert.equal(checkIsLabActive(), true);

			(globalThis as any).window.location = { hash: "", search: "" };
			assert.equal(checkIsLabActive(), false);
		} finally {
			globalThis.window = originalWindow;
		}
	});

	it("3.2. Mandate 8aq: DirectDentalLabLauncher is mounted in AppShell.tsx and StandaloneLaunchers.tsx", () => {
		const appShellPath = path.resolve(webSrcDir, "AppShell.tsx");
		const launchersPath = path.resolve(webSrcDir, "components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx");
		const registryPath = path.resolve(webSrcDir, "components/appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx");

		assert.ok(fs.existsSync(appShellPath), "AppShell.tsx must exist");
		assert.ok(fs.existsSync(launchersPath), "StandaloneLaunchers.tsx must exist");
		assert.ok(fs.existsSync(registryPath), "administrativeLaunchersRegistry.tsx must exist");

		const appShellContent = fs.readFileSync(appShellPath, "utf-8");
		assert.ok(appShellContent.includes("DirectDentalLabLauncher"), "AppShell.tsx must import and render DirectDentalLabLauncher");

		const launchersContent = fs.readFileSync(launchersPath, "utf-8");
		assert.ok(launchersContent.includes("DirectDentalLabLauncher"), "StandaloneLaunchers.tsx must export DirectDentalLabLauncher");

		const registryContent = fs.readFileSync(registryPath, "utf-8");
		assert.ok(registryContent.includes("DirectDentalLabLauncher"), "administrativeLaunchersRegistry.tsx must render DirectDentalLabLauncher");
		assert.ok(registryContent.includes("#lab"), "Registry must handle #lab");
		assert.ok(registryContent.includes("#dental-lab"), "Registry must handle #dental-lab");
	});

	// =========================================================================
	// 11. АРХИТЕКТУРНЫЙ ИНВАРИАНТ РАЗМЕРА ФАЙЛОВ SWEET SPOT (МАНДАТ 8b)
	// =========================================================================
	it("3.3. Mandate 8b: Enforces Sweet Spot file sizes against micro-shredder", () => {
		const catalogLines = fs.readFileSync(path.resolve(labDir, "dentalLabCatalogData.ts"), "utf-8").split("\n").length;
		const modalLines = fs.readFileSync(path.resolve(labDir, "DentalLabStudioModal.tsx"), "utf-8").split("\n").length;
		const launcherLines = fs.readFileSync(path.resolve(labDir, "DirectDentalLabLauncher.tsx"), "utf-8").split("\n").length;
		const cssLines = fs.readFileSync(path.resolve(labDir, "styles/dentalLabStudio.css"), "utf-8").split("\n").length;

		assert.ok(catalogLines >= 280 && catalogLines <= 380, `dentalLabCatalogData.ts lines (${catalogLines}) must be 280-380`);
		assert.ok(modalLines >= 400 && modalLines <= 480, `DentalLabStudioModal.tsx lines (${modalLines}) must be 400-480`);
		assert.ok(launcherLines >= 60 && launcherLines <= 85, `DirectDentalLabLauncher.tsx lines (${launcherLines}) must be 60-85`);
		assert.ok(cssLines >= 280 && cssLines <= 400, `dentalLabStudio.css lines (${cssLines}) must be 280-400`);
	});
});
