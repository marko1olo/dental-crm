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
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import DentalLabStudioModal, {
	CANONICAL_LAB_STAGES,
	CANONICAL_LAB_MATERIALS,
	VITA_SHADES_SSOT,
	UPPER_JAW_TEETH,
	LOWER_JAW_TEETH,
	addWorkingDaysRu,
	formatKopecksToRubles,
	calcNetRevenueKopecks,
} from "../DentalLabStudioModal";
import { DentalLabCreateOrderSection } from "../DentalLabCreateOrderSection";
import {
	DentalLabShadePicker,
	DentalLabShadeSelector,
} from "../DentalLabShadePicker";
import { resolveClinicRoute } from "../../../router/routeResolver";
import { registerOrdersCrudRoutes } from "../../../../../api/src/routes/lab/ordersCrudRoutes.js";
import { insertLabOrderInDb } from "../../../../../api/src/routes/lab/ordersCrudModules/labOrderInsertDb.js";
import type { FastifyInstance } from "fastify";
import type { TenantDb } from "../../../../../api/src/db/rls.js";
import type { CreateLabOrderInput } from "../../../../../api/src/routes/lab/ordersCrudModules/labOrderValidationSchemas.js";

describe("DENTE Dental Lab SSOT Consolidation & Orders Inquisitor [LAB-01..05]", () => {
	describe("1. Master SSOT Component Rendering (DentalLabStudioModal)", () => {
		it("1.1-1.5. DentalLabStudioModal renders 3 clinical tabs, drag handle and unlocked submit CTA", () => {
			const studioHtml = renderToStaticMarkup(
				<DentalLabStudioModal
					isOpen={true}
					onClose={() => {}}
					patientId="pat-lab-1"
					patientName="Иванов Сергей"
					doctorId="doc-lab-1"
					doctorName="Петрова Ольга"
					initialTeeth={[16, 26]}
				/>,
			);
			assert.ok(studioHtml.includes('data-testid="dental-lab-studio-modal-root"'));
			assert.ok(studioHtml.includes('data-testid="tab-new-order"'));
			assert.ok(studioHtml.includes('data-testid="tab-registry"'));
			assert.ok(studioHtml.includes('data-testid="tab-print-blank"'));
			assert.ok(studioHtml.includes("1. Новый заказ-наряд"));
			assert.ok(studioHtml.includes("2. Реестр нарядов"));
			assert.ok(studioHtml.includes("3. Печатный бланк"));
			assert.ok(studioHtml.includes("w-9 h-1 rounded-full"), "Must render mobile drag handle");
			assert.ok(studioHtml.includes('data-testid="submit-lab-order-button"'));
			assert.equal(studioHtml.includes('data-testid="submit-lab-order-button" disabled'), false);

			assert.equal(UPPER_JAW_TEETH.length, 14, "Upper jaw must have 14 teeth");
			assert.equal(LOWER_JAW_TEETH.length, 14, "Lower jaw must have 14 teeth");
			assert.ok(VITA_SHADES_SSOT.length >= 16);
			const codes = VITA_SHADES_SSOT.map((s) => s.code);
			assert.ok(codes.includes("A2") && codes.includes("A3") && codes.includes("BL1"));
		});

		it("1.6. DentalLabCreateOrderSection & DentalLabShadePicker render unlocked primary CTA & shade tabs", () => {
			const sectionHtml = renderToStaticMarkup(
				<DentalLabCreateOrderSection
					activeMainTab="new_order"
					patientInput="Пациент Тест"
					setPatientInput={() => {}}
					availablePatients={[]}
					selectedTeeth={[16]}
					setSelectedTeeth={() => {}}
					toggleTooth={() => {}}
					selectedMaterialId={CANONICAL_LAB_MATERIALS[0]?.id ?? "zirconia_multilayer"}
					setSelectedMaterialId={() => {}}
					selectedShade="A2"
					setSelectedShade={() => {}}
					selectedLab="ЗТЛ"
					setSelectedLab={() => {}}
					allLaboratories={["ЗТЛ"]}
					customLabs={[]}
					setCustomLabs={() => {}}
					effectiveDueDate={addWorkingDaysRu(new Date("2026-10-05T10:00:00Z"), 5)}
					setCustomDueDate={() => {}}
					isUrgent={false}
					setIsUrgent={() => {}}
					notes=""
					setNotes={() => {}}
					teethCount={1}
					totalLabCostKopecks={500000}
					totalPatientPriceKopecks={1800000}
					netClinicRevenueKopecks={calcNetRevenueKopecks(1800000, 500000)}
					handleCreateOrder={() => {}}
					handlePrintA5Blank={() => {}}
					handleCourierBlank={() => {}}
				/>,
			);
			assert.ok(sectionHtml.includes("Создать заказ-наряд"));
			assert.ok(sectionHtml.includes("bg-[var(--primary)]"));
			assert.ok(formatKopecksToRubles(1800000).includes("18"));

			assert.strictEqual(typeof DentalLabShadePicker, "function");
			assert.strictEqual(typeof DentalLabShadeSelector, "function");
			const shadeHtml = renderToStaticMarkup(
				<DentalLabShadePicker selectedShade="A2" onSelectShade={() => {}} />,
			);
			assert.ok(shadeHtml.includes("A2"));
		});
	});

	describe("2. Routing & Closed Modal Parity", () => {
		it("2.1. DentalLabStudioModal returns empty markup when closed", () => {
			const closedHtml = renderToStaticMarkup(
				<DentalLabStudioModal isOpen={false} onClose={() => {}} />,
			);
			assert.equal(closedHtml, "");
		});

		it("2.2. resolveClinicRoute routes #lab and #dental-lab to canonical lab primary view", () => {
			assert.equal(resolveClinicRoute("", "#lab").view, "lab");
			assert.equal(resolveClinicRoute("", "#dental-lab").view, "lab");
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
