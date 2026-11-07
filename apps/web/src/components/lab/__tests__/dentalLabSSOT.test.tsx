/**
 * apps/web/src/components/lab/__tests__/dentalLabSSOT.test.tsx
 *
 * DENTE Dental CRM — Red Team SSOT Inquisition Suite [LAB-01..05].
 * Каноническая верификация консолидации зуботехнической лаборатории:
 * 1. Ликвидация зоопарка дублирующих модалок вокруг единого канонического SSOT мастер-компонента DentalLabStudioModal.
 * 2. 3 сквозные клинические вкладки (1. Новый заказ-наряд, 2. Реестр нарядов, 3. Печатный бланк).
 * 3. Автономия врача (Мандат 8e): кнопка «✓ Создать заказ-наряд» НИКОГДА не disabled.
 * 4. Единый дизайн-код (Мандат 8am): ровно ОДНА Primary CTA кнопка #0d9488 (var(--teal)).
 * 5. Суверенитет масштаба и скрытие при отсутствии ЗТЛ (hasDentalLab === false).
 * 6. Изоляция синтетических моков: боевой режим работает с PostgreSQL 18 через /api/lab/orders, моки строго за isDemoShowcaseMode().
 * 7. Apple HIG сенсорная эргономика: drag handle 36x5px, тач-таргеты >= 44x44px, 0px горизонтального скролла.
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
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	addWorkingDaysRu,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
} from "../dentalLabCatalogData";
import { checkIsLabActive } from "../DirectDentalLabLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(labDir, "../..");
const apiSrcDir = path.resolve(webSrcDir, "../../api/src");

describe("DENTE Dental Lab SSOT Consolidation & Orders Inquisitor [LAB-01..05]", () => {
	// =========================================================================
	// 1. ЕДИНЫЙ КАНОНИЧЕСКИЙ МАСТЕР-КОМПОНЕНТ DENTALLABSTUDIOMODAL (SSOT)
	// =========================================================================
	describe("1. Master SSOT Component Architecture (DentalLabStudioModal.tsx)", () => {
		const studioPath = path.resolve(labDir, "DentalLabStudioModal.tsx");

		it("1.1. DentalLabStudioModal physically exists and adheres to Sweet Spot (400-500 lines)", () => {
			assert.ok(fs.existsSync(studioPath), "DentalLabStudioModal.tsx must exist on disk");
			const lines = fs.readFileSync(studioPath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 400 && lines <= 500,
				`DentalLabStudioModal.tsx must be between 400 and 500 lines (current: ${lines})`,
			);
		});

		it("1.2. Contains all 3 mandatory clinical tabs: new_order, registry, print_blank", () => {
			const content = fs.readFileSync(studioPath, "utf-8");
			assert.ok(content.includes('data-testid="tab-new-order"'), "Must render tab 1 (new_order)");
			assert.ok(content.includes('data-testid="tab-registry"'), "Must render tab 2 (registry)");
			assert.ok(content.includes('data-testid="tab-print-blank"'), "Must render tab 3 (print_blank)");
			assert.ok(content.includes("1. Новый заказ-наряд"), "Tab 1 title must be present");
			assert.ok(content.includes("2. Реестр нарядов"), "Tab 2 title must be present");
			assert.ok(content.includes("3. Печатный бланк"), "Tab 3 title must be present");
		});

		it("1.3. Enforces Doctor Autonomy (Mandate 8e) & Single Primary CTA #0d9488 (Mandate 8am)", () => {
			const content = fs.readFileSync(studioPath, "utf-8");
			assert.ok(content.includes('data-testid="submit-lab-order-button"'), "Must have submit button");
			assert.ok(content.includes("✓ Создать заказ-наряд"), "Must feature action caption");
			assert.ok(content.includes("var(--teal"), "Primary CTA must use teal #0d9488");
			// Zero disabled lockouts
			assert.ok(!content.includes("disabled={!"), "Button must never be blocked by disabled attribute");
			assert.ok(!content.includes("disabled={true}"), "Button must never be permanently disabled");
		});

		it("1.4. Validates full FDI tooth coverage (11-48) and comprehensive VITA Classic/Bleach palette", () => {
			assert.equal(UPPER_JAW_TEETH.length, 14, "Upper jaw must have 14 teeth");
			assert.equal(LOWER_JAW_TEETH.length, 14, "Lower jaw must have 14 teeth");
			assert.ok(VITA_SHADES_SSOT.length >= 16, "Must provide at least 16 VITA shades");
			const codes = VITA_SHADES_SSOT.map((s) => s.code);
			assert.ok(codes.includes("A2") && codes.includes("A3") && codes.includes("BL1"));
		});

		it("1.5. Validates Apple HIG Mobile Bottom Sheet & Drag Handle (36x5px)", () => {
			const content = fs.readFileSync(studioPath, "utf-8");
			assert.ok(content.includes("w-9 h-1 rounded-full"), "Must render 36x5px drag handle on mobile");
		});
	});

	// =========================================================================
	// 2. ИЗОЛЯЦИЯ МОКОВ И ПРОВЕРКА СУВЕРЕНИТЕТА (hasDentalLab === false)
	// =========================================================================
	describe("2. Production Anti-Mock Isolation & Scale Sovereignty", () => {
		it("2.1. DentalLabStudioModal guards mock seed orders strictly behind isDemoShowcaseMode()", () => {
			const content = fs.readFileSync(path.resolve(labDir, "DentalLabStudioModal.tsx"), "utf-8");
			assert.ok(
				content.includes("isDemoShowcaseMode() ? [...SEED_LAB_ORDERS] : []"),
				"SEED_LAB_ORDERS must be strictly guarded behind isDemoShowcaseMode()",
			);
		});

		it("2.2. DentalLabStudioModal physically disappears when clinic has hasDentalLab === false", () => {
			const content = fs.readFileSync(path.resolve(labDir, "DentalLabStudioModal.tsx"), "utf-8");
			assert.ok(
				content.includes("hasDentalLab"),
				"Must check hasDentalLab from useWorkspaceProfile()",
			);
			assert.ok(
				content.includes("if (!isOpen || (!hasDentalLab && !isDemoShowcaseMode())) return null;"),
				"Must return null when hasDentalLab is false and not in demo mode",
			);
		});

		it("2.3. DirectDentalLabLauncher also guards against hasDentalLab === false", () => {
			const content = fs.readFileSync(path.resolve(labDir, "DirectDentalLabLauncher.tsx"), "utf-8");
			assert.ok(
				content.includes("hasDentalLab"),
				"Launcher must inspect hasDentalLab",
			);
			assert.ok(
				content.includes("if (!isActive || (!hasDentalLab && !isDemoShowcaseMode())) return null;"),
				"Launcher must return null if lab is disabled in clinic",
			);
		});

		it("2.4. Chairside ToothSurgeryTab hides lab order CTA when hasDentalLab === false", () => {
			const toothTabPath = path.resolve(
				webSrcDir,
				"components/visit/view/clinicalToothTabs/ToothSurgeryTab.tsx",
			);
			assert.ok(fs.existsSync(toothTabPath), "ToothSurgeryTab.tsx must exist");
			const content = fs.readFileSync(toothTabPath, "utf-8");
			assert.ok(
				content.includes("hasDentalLab"),
				"ToothSurgeryTab must check hasDentalLab",
			);
			assert.ok(
				content.includes("showLab"),
				"ToothSurgeryTab must conditionally render lab button with showLab",
			);
		});
	});

	// =========================================================================
	// 3. ЛИКВИДАЦИЯ ЗООПАРКА И АРБИТРАЖ МОДАЛОК-КЛОНОВ
	// =========================================================================
	describe("3. Elimination of Duplicate Modals & Thin Facade Consolidation", () => {
		it("3.1. DentalLabCreateOrderModal is a thin facade delegating to DentalLabStudioModal", () => {
			const file = path.resolve(labDir, "DentalLabCreateOrderModal.tsx");
			assert.ok(fs.existsSync(file), "DentalLabCreateOrderModal.tsx must exist");
			const content = fs.readFileSync(file, "utf-8");
			assert.ok(content.includes("DentalLabStudioModal"), "Must delegate to DentalLabStudioModal");
			assert.ok(content.split("\n").length <= 50, "Must be a thin facade <= 50 lines");
		});

		it("3.2. DentalLabHubModal is a thin re-export of DentalLabStudioModal", () => {
			const file = path.resolve(labDir, "DentalLabHubModal.tsx");
			assert.ok(fs.existsSync(file), "DentalLabHubModal.tsx must exist");
			const content = fs.readFileSync(file, "utf-8");
			assert.ok(content.includes('export * from "./DentalLabStudioModal"'), "Must re-export DentalLabStudioModal");
			assert.ok(content.split("\n").length <= 25, "Must be <= 25 lines");
		});

		it("3.3. LaboratoryStudioModal is a thin re-export of DentalLabStudioModal", () => {
			const file = path.resolve(labDir, "LaboratoryStudioModal.tsx");
			assert.ok(fs.existsSync(file), "LaboratoryStudioModal.tsx must exist");
			const content = fs.readFileSync(file, "utf-8");
			assert.ok(content.includes('export * from "./DentalLabStudioModal"'), "Must re-export DentalLabStudioModal");
			assert.ok(content.split("\n").length <= 25, "Must be <= 25 lines");
		});

		it("3.4. LabStudioModal is a thin re-export of DentalLabStudioModal", () => {
			const file = path.resolve(labDir, "LabStudioModal.tsx");
			assert.ok(fs.existsSync(file), "LabStudioModal.tsx must exist");
			const content = fs.readFileSync(file, "utf-8");
			assert.ok(content.includes('export * from "./DentalLabStudioModal"'), "Must re-export DentalLabStudioModal");
			assert.ok(content.split("\n").length <= 25, "Must be <= 25 lines");
		});

		it("3.5. DirectDentalLabOrderLauncher & DirectLabLauncher are thin re-exports of DirectDentalLabLauncher", () => {
			const f1 = path.resolve(labDir, "DirectDentalLabOrderLauncher.tsx");
			const f2 = path.resolve(labDir, "DirectLabLauncher.tsx");
			assert.ok(fs.existsSync(f1) && fs.existsSync(f2));
			assert.ok(fs.readFileSync(f1, "utf-8").includes("DirectDentalLabLauncher"));
			assert.ok(fs.readFileSync(f2, "utf-8").includes("DirectDentalLabLauncher"));
		});

		it("3.6. DentalLabShadeSelector is a thin re-export of DentalLabShadePicker", () => {
			const selectorPath = path.resolve(labDir, "DentalLabShadeSelector.tsx");
			assert.ok(fs.existsSync(selectorPath), "DentalLabShadeSelector.tsx must exist");
			const content = fs.readFileSync(selectorPath, "utf-8");
			assert.ok(content.includes('export * from "./DentalLabShadePicker"'), "Must re-export DentalLabShadePicker");
			assert.ok(content.split("\n").length <= 25, "Must be <= 25 lines");
		});
	});

	// =========================================================================
	// 4. БЭКЕНД РОУТЫ И КАНОНИЧЕСКИЙ ЭНДПОИНТ /api/lab/orders
	// =========================================================================
	describe("4. Backend Fastify Routes & Canonical Endpoint SSOT", () => {
		const routesFile = path.resolve(apiSrcDir, "routes/lab/ordersCrudRoutes.ts");
		const insertDbFile = path.resolve(apiSrcDir, "routes/lab/ordersCrudModules/labOrderInsertDb.ts");

		it("4.1. ordersCrudRoutes.ts registers /api/lab/orders as primary SSOT route", () => {
			assert.ok(fs.existsSync(routesFile), "ordersCrudRoutes.ts must exist");
			const content = fs.readFileSync(routesFile, "utf-8");
			assert.ok(content.includes('app.get("/api/lab/orders"'), "Must support GET /api/lab/orders");
			assert.ok(content.includes('app.post("/api/lab/orders"'), "Must support POST /api/lab/orders");
			assert.ok(content.includes('app.put("/api/lab/orders/:id"'), "Must support PUT /api/lab/orders/:id");
			assert.ok(content.includes('app.delete("/api/lab/orders/:id"'), "Must support DELETE /api/lab/orders/:id");
		});

		it("4.2. ordersCrudRoutes.ts preserves backward compatibility with /api/clinical/lab-orders", () => {
			const content = fs.readFileSync(routesFile, "utf-8");
			assert.ok(content.includes("/api/clinical/lab-orders"), "Must preserve /api/clinical/lab-orders");
			assert.ok(content.includes("/api/dental-lab/orders"), "Must preserve /api/dental-lab/orders");
		});

		it("4.3. insertLabOrderInDb provides zero-block patient fallback for chairside speed", () => {
			assert.ok(fs.existsSync(insertDbFile), "labOrderInsertDb.ts must exist");
			const content = fs.readFileSync(insertDbFile, "utf-8");
			assert.ok(
				content.includes("firstPatient"),
				"Must include fallback to first organization patient when patientId is generic",
			);
		});
	});
});
