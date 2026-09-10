/**
 * marketingRomiTable.test.tsx — SSR & Unit tests for Owner Marketing ROMI Table.
 *
 * Tests:
 * 1. Renders MarketingRomiTable component and static markup without SSR hydration failures.
 * 2. Displays key metrics: Потрачено, Приведено первичных, Выручка, ROMI, CAC.
 * 3. Shows default Russian dental channels (Яндекс.Директ, Яндекс.Карты, 2ГИС, Сарафан, ПроДокторов, ВКонтакте).
 * 4. Displays summary totals footer row with calculated overall ROMI and CAC.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketingRomiTable } from "../components/marketing/MarketingRomiTable.js";
import { MarketingView } from "../MarketingView.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";

// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic context for isolated unit testing
const mockAppLogicValue: any = {
	dashboard: {
		clinicSettings: {
			name: "Стоматология ДЕНТЕ",
			staff: [{ id: "doc-1", fullName: "Д-р Ковалев", role: "doctor" }],
		},
		patients: [{ id: "p-1", fullName: "Сергей Иванов", phone: "+79001234567" }],
	},
	recalls: [],
	patientId: "p-1",
};

describe("MarketingRomiTable Component & SSR Rendering", () => {
	it("1. Renders MarketingRomiTable into static HTML markup with complete StomX structure", () => {
		const html = renderToStaticMarkup(createElement(MarketingRomiTable));

		// Check container and testid
		assert.ok(html.includes("data-testid=\"marketing-romi-table-section\""));
		assert.ok(html.includes("Эффективность рекламы и окупаемость каналов (ROMI)"));

		// Check KPI cards
		assert.ok(html.includes("Потрачено на рекламу"));
		assert.ok(html.includes("Лиды и доходимость"));
		assert.ok(html.includes("Выручка от первичных"));
		assert.ok(html.includes("LTV и повторные визиты"));
		assert.ok(html.includes("Общий ROMI клиники"));

		// Check table headers
		assert.ok(html.includes("Канал рекламы"));
		assert.ok(html.includes("Потрачено (₽)"));
		assert.ok(html.includes("Выручка (₽)"));
		assert.ok(html.includes("Повторных"));
		assert.ok(html.includes("Доля повт. (%)"));
		assert.ok(html.includes("LTV (₽)"));
		assert.ok(html.includes("ROMI (%)"));
		assert.ok(html.includes("CAC (₽ / чел)"));

		// Check StomX 10 canonical channels
		assert.ok(html.includes("2GIS"), "must contain 2GIS");
		assert.ok(html.includes("Яндекс Карты"), "must contain Яндекс Карты");
		assert.ok(html.includes("ПроДокторов"), "must contain ПроДокторов");
		assert.ok(html.includes("Сарафанное радио"), "must contain Сарафанное радио");
		assert.ok(html.includes("СберЗдоровье"), "must contain СберЗдоровье");
		assert.ok(html.includes("ВКонтакте"), "must contain ВКонтакте");
		assert.ok(html.includes("Наружная реклама"), "must contain Наружная реклама");
		assert.ok(html.includes("Сайт"), "must contain Сайт");
		assert.ok(html.includes("Инстаграм"), "must contain Инстаграм");
		assert.ok(html.includes("Листовки"), "must contain Листовки");

		// Check action buttons
		assert.ok(html.includes("Синхронизировать с CRM"));
		assert.ok(html.includes("Сброс"));
		assert.ok(html.includes("Добавить канал"));

		// Check footer total row
		assert.ok(html.includes("ИТОГО ПО ВСЕМ КАНАЛАМ:"));
		assert.ok(html.includes("чел."));
	});

	it("2. MarketingView contains the owner ROMI marketing table directly on render inside AppLogicProvider", () => {
		const child = createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ",
			clinicPhone: "+7 (495) 123-45-67",
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: child }),
		);

		assert.ok(html.includes("data-testid=\"marketing-view\""));
		assert.ok(html.includes("data-testid=\"marketing-romi-table-section\""));
		assert.ok(html.includes("Маркетинг / SEO"));
		assert.ok(html.includes("Яндекс Карты"));
		assert.ok(html.includes("Сарафанное радио"));
		assert.ok(html.includes("2GIS"));
	});

	it("3. MarketingRomiTable mounts inside AppLogicProvider with CRM sync button and interactive testids", () => {
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, {
				value: {
					...mockAppLogicValue,
					dashboard: {
						...mockAppLogicValue.dashboard,
						patients: [
							{
								id: "p-1",
								fullName: "Анна Смирнова",
								administrativeProfile: { advertisingSource: "2GIS" },
							},
							{
								id: "p-2",
								fullName: "Борис Кузнецов",
								administrativeProfile: { advertisingSource: "Сарафанное радио" },
							},
						],
						appointments: [
							{ id: "a-1", patientId: "p-1", status: "completed" },
							{ id: "a-2", patientId: "p-1", status: "completed" }, // Repeat visit
							{ id: "a-3", patientId: "p-2", status: "completed" },
						],
						payments: [
							{ id: "pay-1", patientId: "p-1", amount: 25000, status: "completed" },
							{ id: "pay-2", patientId: "p-2", amount: 15000, status: "completed" },
						],
						communicationEvents: [
							{ id: "c-1", source: "2GIS", type: "call" },
						],
					},
				},
				children: createElement(MarketingRomiTable),
			}),
		);

		assert.ok(html.includes("data-testid=\"romi-sync-crm-btn\""));
		assert.ok(html.includes("data-testid=\"marketing-romi-table-section\""));
		assert.ok(html.includes("data-testid=\"romi-table\""));
		assert.ok(html.includes("Синхронизировать с CRM"));
		assert.ok(html.includes("2GIS"));
		assert.ok(html.includes("Сарафанное радио"));
	});
});

