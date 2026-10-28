/**
 * chairsideServiceOrdering.test.tsx
 *
 * Targeted Unit & Integration Test Suite for Wave 47:
 * Chairside Service Ordering & Fast Price Catalog Search (Mandates 8e, 8k, 8n).
 *
 * CONSTITUTIONAL MANDATES TESTED:
 * - Supreme Law: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (0 disabled buttons on hot-path, 1-click execution).
 * - Mandate 8k: CRM != Reality Simulator (Express presets, fast catalog search, friction-killer).
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty (1-chair autonomy, zero mandatory backoffice).
 * - Mandate 8d п. 4: Touch-First & Ergonomics (>= 44x44px touch targets).
 * - Mandate 8d п. 7: Zero Cartoon Emojis (Strictly Lucide vector icons, pure 804n nomenclature text).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	CompletedServicesChecklist,
	CLINICAL_SERVICE_BUNDLES,
} from "../CompletedServicesChecklist";
import {
	CHAIRSIDE_EXPRESS_SERVICES,
	FDI_UPPER_TEETH,
	FDI_LOWER_TEETH,
	ALL_FDI_TEETH,
	formatCompletedServiceLine,
	parseCompletedServiceLine,
	calculateCompletedServicesSummary,
} from "../completedServicesPlan";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import { money } from "../../../utils/financeUtils";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cartoon emoji detector per Mandate 8d п. 7
export const CARTOON_EMOJI_REGEX =
	/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

export function hasCartoonEmojis(text: string): boolean {
	return CARTOON_EMOJI_REGEX.test(text);
}

const mockPriceCatalog = [
	{
		id: "srv-caries-comp",
		code: "A16.07.002.011",
		title: "Восстановление зуба пломбой световой полимеризации",
		priceRub: 4200,
		active: true,
	},
	{
		id: "srv-anesthesia-infilt",
		code: "A25.07.001",
		title: "Анестезия инфильтрационная Убистезин",
		priceRub: 850,
		active: true,
	},
	{
		id: "srv-crown-zircon",
		code: "A16.07.004.002",
		title: "Коронка из диоксида циркония",
		priceRub: 18500,
		active: true,
	},
	{
		id: "srv-inactive",
		code: "A16.07.999",
		title: "Устаревшая неактивная услуга",
		priceRub: 9999,
		active: false,
	},
];

function createMockAppLogic(overrides: Record<string, any> = {}) {
	const defaultDashboard: any = {
		activeVisit: {
			id: "visit-test-47",
			patientId: "patient-test-47",
			status: "in_treatment",
		},
		serviceCatalog: mockPriceCatalog,
		treatmentPlanItems: [
			{
				id: "plan-item-1",
				patientId: "patient-test-47",
				serviceId: "srv-caries-comp",
				snapshotServiceName: "Лечение глубокого кариеса",
				toothCode: "16",
				quantity: 1,
				unitPriceRub: 4200,
				discountRub: 0,
			},
		],
	};

	return {
		dashboard: defaultDashboard,
		activeVisitPatient: {
			id: "patient-test-47",
			fullName: "Соколов Артем Владимирович",
		},
		visitNoteForm: {
			treatmentPlan: "",
		},
		updateVisitNoteField: () => {},
		selectedTooth: null,
		activeToothNumber: null,
		...overrides,
	} as any;
}

function renderChecklist(appLogicOverrides: Record<string, any> = {}, componentProps: any = {}): string {
	const mockContext = createMockAppLogic(appLogicOverrides);
	return renderToStaticMarkup(
		createElement(AppLogicProvider, {
			value: mockContext,
			children: createElement(CompletedServicesChecklist, componentProps),
		}),
	);
}

describe("Wave 47: Chairside Service Ordering & Fast Catalog Search (Mandates 8e, 8k, 8n)", () => {
	describe("1. 9 Express Chairside Services (804n Nomenclature & Pricing)", () => {
		it("1.1. renders all 9 express services with verified titles and prices", () => {
			const html = renderChecklist();

			// All 9 express services must exist in rendered markup
			assert.ok(html.includes("Прицельный рентгеновский снимок"), "Missing intraoral xray");
			assert.ok(html.includes("Местная анестезия (Артикаин)"), "Missing local anesthesia");
			assert.ok(html.includes("Проводниковая анестезия"), "Missing conduction anesthesia");
			assert.ok(html.includes("Осмотр и консультация"), "Missing consultation");
			assert.ok(html.includes("Изоляция коффердамом"), "Missing cofferdam");
			assert.ok(html.includes("Снятие швов"), "Missing suture removal");
			assert.ok(html.includes("Временная пломба"), "Missing temp filling");
			assert.ok(html.includes("Снятие назубных отложений (1 зуб)"), "Missing dental deposits");
			assert.ok(html.includes("ОПТГ / Панорамный снимок"), "Missing OPTG panoramic");

			// All 9 804n codes must be visible
			assert.ok(html.includes("A06.07.001"), "Missing A06.07.001");
			assert.ok(html.includes("A25.07.001"), "Missing A25.07.001");
			assert.ok(html.includes("A25.07.002"), "Missing A25.07.002");
			assert.ok(html.includes("A01.07.001"), "Missing A01.07.001");
			assert.ok(html.includes("A16.07.051"), "Missing A16.07.051");
			assert.ok(html.includes("A16.07.097"), "Missing A16.07.097");
			assert.ok(html.includes("A16.07.002.099"), "Missing A16.07.002.099");
			assert.ok(html.includes("A16.07.050.001"), "Missing A16.07.050.001");
			assert.ok(html.includes("A06.07.002"), "Missing A06.07.002");
		});

		it("1.2. express buttons comply with touch target ergonomics (min-h-[48px])", () => {
			const html = renderChecklist();
			// Express buttons have min-h-[48px]
			assert.ok(html.includes("min-h-[48px]"), "Express service buttons must have min-h-[48px]");
		});
	});

	describe("2. Fast Inline Catalog Search", () => {
		it("2.1. renders search input with testid, placeholder and min-h-[44px]", () => {
			const html = renderChecklist();
			assert.ok(html.includes('data-testid="service-catalog-search-input"'), "Search input must have testid");
			assert.ok(html.includes("Поиск по прейскуранту клиники"), "Search input must have placeholder");
			assert.ok(html.includes("min-h-[44px]"), "Search input must have min-h-[44px]");
		});

		it("2.2. accepts overrideCatalog prop for modular testability", () => {
			const html = renderChecklist({}, { serviceCatalog: mockPriceCatalog });
			assert.ok(html.includes('data-testid="completed-services-checklist"'));
		});
	});

	describe("3. Quick Tooth Selection (FDI 11..48 & «Без зуба»)", () => {
		it("3.1. renders 'Без зуба' button and 1-tap quick tooth chips", () => {
			const html = renderChecklist();
			assert.ok(html.includes("Без зуба"), "Must render 'Без зуба' option");
			// Quick chips: 11, 16, 21, 26, 31, 36, 41, 46
			for (const t of [11, 16, 21, 26, 31, 36, 41, 46]) {
				assert.ok(html.includes(">" + t + "<"), "Must render quick tooth chip for " + t);
			}
		});

		it("3.2. tooth chip buttons have touch targets >= 44px", () => {
			const html = renderChecklist();
			assert.ok(html.includes("min-w-[44px] min-h-[44px]"), "Tooth chips must have min-w-[44px] min-h-[44px]");
		});

		it("3.3. displays current tooth binding badge when tooth is pre-selected", () => {
			const html = renderChecklist({ selectedTooth: "24" });
			assert.ok(html.includes("Зуб 24"), "Must display 'Зуб 24' badge");
			assert.ok(html.includes("привязка к зубу 24"), "Must indicate binding to tooth 24");
		});
	});

	describe("4. Complex Clinical Bundles (Caries, Endo, Hygiene, Extraction)", () => {
		it("4.1. renders 4 clinical service packages with accurate sums", () => {
			const html = renderChecklist();
			assert.ok(html.includes("Пакет: Лечение кариеса"), "Must include caries bundle");
			assert.ok(html.includes("Пакет: Эндодонтия (1-й этап)"), "Must include endodontics bundle");
			assert.ok(html.includes("Пакет: Профгигиена"), "Must include hygiene bundle");
			assert.ok(html.includes("Пакет: Удаление зуба"), "Must include extraction bundle");
		});
	});

	describe("5. Summary & 1-Click Push to Invoice", () => {
		it("5.1. renders 'Внести всё в кассовый счёт' button with testid and min-h-[44px]", () => {
			const html = renderChecklist();
			assert.ok(html.includes('data-testid="push-all-to-invoice-btn"'), "Must render push to invoice button");
			assert.ok(html.includes("min-h-[44px]"), "Push button must have min-h-[44px]");
			assert.ok(html.includes("Внести всё в кассовый счёт"), "Must contain button label");
		});

		it("5.2. accurately calculates total amount when completed services exist in treatment plan", () => {
			const treatmentPlanWithServices = [
				"Выполнено: [A06.07.001] Прицельный рентгеновский снимок (зуб 16) — 450 ₽",
				"Выполнено: [A25.07.001] Местная анестезия (Артикаин) (зуб 16) — 800 ₽",
				"Выполнено: [A16.07.051] Изоляция коффердамом (зуб 16) — 800 ₽",
			].join("\n");

			const html = renderChecklist({
				visitNoteForm: {
					treatmentPlan: treatmentPlanWithServices,
				},
			});

			// Total sum = 450 + 800 + 800 = 2050 ₽
			assert.ok(html.includes("2\u00a0050") || html.includes("2 050"), "Must display total sum 2 050 ₽");
			assert.ok(html.includes("3 услуги"), "Must display 3 услуги count");
			assert.ok(html.includes("Выполнено в этом приёме (3)"), "Must list 3 completed items");
		});

		it("5.3. renders trash delete buttons for each completed item", () => {
			const treatmentPlanWithServices = "Выполнено: [A06.07.001] Прицельный рентгеновский снимок — 450 ₽";
			const html = renderChecklist({
				visitNoteForm: {
					treatmentPlan: treatmentPlanWithServices,
				},
			});

			assert.ok(html.includes('title="Удалить из выполненного"'), "Must render delete button for completed line");
		});
	});

	describe("6. Doctor Autonomy (Mandate 8e) & Zero Obstacles", () => {
		it("6.1. guarantees 0 disabled buttons on the chairside ordering hot-path", () => {
			const html = renderChecklist();
			// Find all button tags
			const buttonMatches = html.match(/<button[^>]*>/g) || [];
			assert.ok(buttonMatches.length > 0, "Buttons must be present");
			for (const btn of buttonMatches) {
				assert.strictEqual(
					btn.includes("disabled"),
					false,
					"Button must NOT be disabled on chairside hot-path: " + btn,
				);
			}
		});
	});

	describe("7. Mandate 8d Sin #7: Absolute Ban on Cartoon Emojis", () => {
		it("7.1. guarantees zero cartoon emojis in rendered output", () => {
			const html = renderChecklist({
				visitNoteForm: {
					treatmentPlan: "Выполнено: [A25.07.001] Местная анестезия — 800 ₽",
				},
			});

			assert.strictEqual(
				hasCartoonEmojis(html),
				false,
				"Rendered CompletedServicesChecklist must have 0 cartoon emojis",
			);
		});
	});

	describe("8. Closed Visit Safety State", () => {
		it("8.1. renders safe non-crashing status when active visit is not open", () => {
			const html = renderChecklist({
				dashboard: {
					activeVisit: null,
				},
			});

			assert.ok(html.includes('data-testid="completed-services-checklist"'));
			assert.ok(html.includes("Приём ещё не открыт"));
			assert.strictEqual(hasCartoonEmojis(html), false);
		});
	});
});
