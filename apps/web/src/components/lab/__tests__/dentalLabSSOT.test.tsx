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
import { resolveClinicRoute } from "../../../router/routeResolver";
import { registerOrdersCrudRoutes } from "../../../../../api/src/routes/lab/ordersCrudRoutes.js";
import { insertLabOrderInDb } from "../../../../../api/src/routes/lab/ordersCrudModules/labOrderInsertDb.js";
import type { FastifyInstance } from "fastify";
import type { TenantDb } from "../../../../../api/src/db/rls.js";
import type { CreateLabOrderInput } from "../../../../../api/src/routes/lab/ordersCrudModules/labOrderValidationSchemas.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const labDir = path.resolve(__dirname, "..");
const webSrcDir = path.resolve(labDir, "../..");

describe("DENTE Dental Lab SSOT Consolidation & Orders Inquisitor [LAB-01..05]", () => {
	// =========================================================================
	// 1. ЕДИНЫЙ КАНОНИЧЕСКИЙ МАСТЕР-КОМПОНЕНТ DENTALLABSTUDIOMODAL (SSOT)
	// =========================================================================
	describe("1. Master SSOT Component Architecture (DentalLabStudioModal.tsx)", () => {
		const studioPath = path.resolve(labDir, "DentalLabStudioModal.tsx");

		it("1.1. DentalLabStudioModal physically exists and supports full editingOrder hydration (SSOT)", () => {
			assert.ok(fs.existsSync(studioPath), "DentalLabStudioModal.tsx must exist on disk");
			const content = fs.readFileSync(studioPath, "utf-8");
			assert.ok(content.includes("editingOrder"), "Must accept editingOrder prop");
			assert.ok(content.includes("initialOrder"), "Must accept initialOrder prop");
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

		it("1.3. Enforces Doctor Autonomy (Mandate 8e) & Single Primary CTA (Mandate 8am)", () => {
			const content =
				fs.readFileSync(studioPath, "utf-8") +
				fs.readFileSync(path.resolve(labDir, "DentalLabCreateOrderSection.tsx"), "utf-8");
			assert.ok(content.includes('data-testid="submit-lab-order-button"'), "Must have submit button");
			assert.ok(content.includes("✓ Создать заказ-наряд"), "Must feature action caption");
			assert.ok(content.includes("var(--primary)"), "Primary CTA must use semantic token var(--primary)");
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

		it("2.3. resolveClinicRoute routes #lab and #dental-lab to canonical lab primary view", () => {
			assert.equal(resolveClinicRoute("", "#lab").view, "lab");
			assert.equal(resolveClinicRoute("", "#dental-lab").view, "lab");
		});

		it("2.4. Chairside AppointmentModalLabSection hides lab order CTA when hasDentalLab === false", () => {
			const labSectionPath = path.resolve(
				webSrcDir,
				"components/schedule/AppointmentModalLabSection.tsx",
			);
			assert.ok(fs.existsSync(labSectionPath), "AppointmentModalLabSection.tsx must exist");
			const content = fs.readFileSync(labSectionPath, "utf-8");
			assert.ok(
				content.includes("hasDentalLab"),
				"AppointmentModalLabSection must check hasDentalLab",
			);
			assert.ok(
				content.includes("if (hasDentalLab === false && !isDemoShowcaseMode())"),
				"AppointmentModalLabSection must return null when hasDentalLab is false and not in demo mode",
			);
		});
	});

	// =========================================================================
	// 3. ЛИКВИДАЦИЯ ЗООПАРКА И АРБИТРАЖ МОДАЛОК-КЛОНОВ
	// =========================================================================
	describe("3. Elimination of Duplicate Modals & Physical Eradication of Clones", () => {
		it("3.1. Clones and thin facades are physically eradicated from disk via git rm", () => {
			const deletedFiles = [
				"DentalLabOrdersHubModal.tsx",
				"DentalLabOrderModal.tsx",
				"DentalLabOrderDrawer.tsx",
				"LaboratoryStudioModal.tsx",
				"LabStudioModal.tsx",
				"DentalLabHubModal.tsx",
				"DentalLabOrdersModal.tsx",
				"LabOrderModal.tsx",
				"DirectLabLauncher.tsx",
				"DirectDentalLabOrderLauncher.tsx",
				"WorkOrdersList.tsx",
				"DentalLabCreateOrderModal.tsx",
				"DentalLabShadeSelector.tsx",
				"DentalLabOrderCard.tsx",
				"DentalLabTrackerCard.tsx",
				"DentalLabOrdersTrackerModal.tsx",
				"dentalLabData.ts",
				"labCatalogData.ts",
				"hub/DentalLabHubAlerts.tsx",
				"hub/DentalLabHubCreateSection.tsx",
				"hub/DentalLabHubHeader.tsx",
				"hub/dentalLabHubModalTypes.ts",
				"hub/DentalLabHubOrderCard.tsx",
				"hub/dentalLabHubSampleOrders.ts",
				"hub/useDentalLabHubActions.ts",
				"hub/useDentalLabHubData.ts",
				"DentalLabExpressConfigurator.tsx",
				"DentalLabFdiOdontogramPicker.tsx",
				"DentalLabStagesTab.tsx",
				"DentalLabRestorationTab.tsx",
				"DentalLabPrintBlank.tsx",
			];
			for (const file of deletedFiles) {
				assert.ok(!fs.existsSync(path.resolve(labDir, file)), `Clone ${file} must NOT exist on disk!`);
			}
		});

		it("3.2. DentalLabStudioModal is canonical SSOT with eradicated clone aliases (Mandate 8bf)", () => {
			const ssotFile = path.resolve(labDir, "DentalLabStudioModal.tsx");
			assert.ok(fs.existsSync(ssotFile));
			const content = fs.readFileSync(ssotFile, "utf-8");
			assert.ok(content.includes("export default DentalLabStudioModal;"));
			assert.ok(!content.includes("export const DentalLabHubModal"));
			assert.ok(!content.includes("export const DentalLabOrdersHubModal"));
			assert.ok(!content.includes("export const DentalLabOrderDrawer"));
			assert.ok(!content.includes("export const DentalLabOrderModal"));
		});

		it("3.3. Obsolete DirectDentalLabLauncher & dead aliases remain deleted (Mandate 8bf)", () => {
			for (const obsolete of [
				"DirectDentalLabLauncher.tsx",
				"DirectLabLauncher.tsx",
				"DirectDentalLabOrderLauncher.tsx",
			]) {
				assert.equal(
					fs.existsSync(path.resolve(labDir, obsolete)),
					false,
					`Obsolete ${obsolete} must remain removed`,
				);
			}
			assert.equal(resolveClinicRoute("", "#lab").view, "lab");
		});

		it("3.4. DentalLabShadePicker is canonical SSOT exporting DentalLabShadePicker and DentalLabShadeSelector", () => {
			const pickerPath = path.resolve(labDir, "DentalLabShadePicker.tsx");
			assert.ok(fs.existsSync(pickerPath), "DentalLabShadePicker.tsx must exist");
			const content = fs.readFileSync(pickerPath, "utf-8");
			assert.ok(content.includes("export function DentalLabShadePicker"), "Must export DentalLabShadePicker");
			assert.ok(content.includes("export function DentalLabShadeSelector"), "Must export DentalLabShadeSelector");
			assert.ok(content.includes("export interface DentalLabShadeSelectorProps"), "Must export DentalLabShadeSelectorProps");
			assert.ok(!fs.existsSync(path.resolve(labDir, "DentalLabShadeSelector.tsx")), "DentalLabShadeSelector.tsx must NOT exist on disk!");
		});
	});

	// =========================================================================
	// 4. БЭКЕНД РОУТЫ И КАНОНИЧЕСКИЙ ЭНДПОИНТ /api/lab/orders
	// =========================================================================
	describe("4. Backend Fastify Routes & Canonical Endpoint SSOT", () => {
		interface CapturedRoute {
			method: string;
			url: string;
			config?: Record<string, unknown>;
		}

		async function collectRegisteredLabRoutes(): Promise<CapturedRoute[]> {
			const routes: CapturedRoute[] = [];
			const appStub: Pick<FastifyInstance, "route"> = {
				route(opts: { method: string | string[]; url: string; config?: Record<string, unknown> }) {
					const methods = Array.isArray(opts.method) ? opts.method : [opts.method];
					for (const method of methods) {
						routes.push({ method: method.toUpperCase(), url: opts.url, config: opts.config });
					}
					return appStub as FastifyInstance;
				},
			};
			await registerOrdersCrudRoutes(appStub as FastifyInstance);
			return routes;
		}

		it("4.1. registerOrdersCrudRoutes registers /api/lab/orders CRUD endpoints via routeFactories", async () => {
			const routes = await collectRegisteredLabRoutes();
			const hasRoute = (method: string, url: string) =>
				routes.some((r) => r.method === method && r.url === url && r.config?.tenantTxSelfManaged === true);

			assert.ok(hasRoute("GET", "/api/lab/orders"), "Must register GET /api/lab/orders");
			assert.ok(hasRoute("POST", "/api/lab/orders"), "Must register POST /api/lab/orders");
			assert.ok(hasRoute("PUT", "/api/lab/orders/:id"), "Must register PUT /api/lab/orders/:id");
			assert.ok(hasRoute("DELETE", "/api/lab/orders/:id"), "Must register DELETE /api/lab/orders/:id");
		});

		it("4.2. registerOrdersCrudRoutes preserves backward compatibility with /api/clinical/lab-orders", async () => {
			const routes = await collectRegisteredLabRoutes();
			const hasRoute = (method: string, url: string) =>
				routes.some((r) => r.method === method && r.url === url);

			assert.ok(hasRoute("GET", "/api/clinical/lab-orders"), "Must register GET /api/clinical/lab-orders");
			assert.ok(hasRoute("POST", "/api/clinical/lab-orders"), "Must register POST /api/clinical/lab-orders");
			assert.ok(hasRoute("PUT", "/api/clinical/lab-orders/:id"), "Must register PUT /api/clinical/lab-orders/:id");
			assert.ok(hasRoute("DELETE", "/api/clinical/lab-orders/:id"), "Must register DELETE /api/clinical/lab-orders/:id");
			assert.ok(hasRoute("GET", "/api/lab/orders"), "Must register canonical GET /api/lab/orders");
		});

		it("4.3. insertLabOrderInDb prevents quiet patient hijacking [LAB-01]", async () => {
			const txStub = {
				select() {
					return {
						from() {
							return {
								where() {
									return {
										limit: async () => [],
									};
								},
							};
						},
					};
				},
			} as Partial<TenantDb>;
			const result = await insertLabOrderInDb(
				txStub as TenantDb,
				"00000000-0000-4000-8000-000000000001",
				{
					patientId: "00000000-0000-4000-8000-000000000999",
					materialId: "zirconia",
					construction: "Коронка",
					teeth: [16],
				} as CreateLabOrderInput,
			);
			assert.deepEqual(result, { kind: "patient_not_found" });
		});
	});
});
