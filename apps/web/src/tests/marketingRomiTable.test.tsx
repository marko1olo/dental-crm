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
	it("1. Renders MarketingRomiTable into static HTML markup with complete structure", () => {
		const html = renderToStaticMarkup(createElement(MarketingRomiTable));

		// Check container and testid
		assert.ok(html.includes("data-testid=\"marketing-romi-table-section\""));
		assert.ok(html.includes("Эффективность рекламы и окупаемость каналов (ROMI)"));

		// Check KPI cards
		assert.ok(html.includes("Потрачено на рекламу"));
		assert.ok(html.includes("Приведено первичных"));
		assert.ok(html.includes("Выручка от первичных"));
		assert.ok(html.includes("Общий ROMI клиники"));

		// Check table headers
		assert.ok(html.includes("Канал рекламы"));
		assert.ok(html.includes("Потрачено (₽)"));
		assert.ok(html.includes("Выручка (₽)"));
		assert.ok(html.includes("ROMI (%)"));
		assert.ok(html.includes("CAC (₽ / чел)"));

		// Check default channels
		assert.ok(html.includes("Яндекс.Директ (Контекстная реклама)"));
		assert.ok(html.includes("Яндекс.Карты (Гео-приоритет клиники)"));
		assert.ok(html.includes("2ГИС (Рекламный профиль и онлайн-запись)"));
		assert.ok(html.includes("Сарафанное радио / Рекомендации пациентов"));
		assert.ok(html.includes("ПроДокторов / СберЗдоровье (Агрегаторы)"));
		assert.ok(html.includes("ВКонтакте (Таргетированная реклама)"));

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
		assert.ok(html.includes("Яндекс.Директ"));
		assert.ok(html.includes("Сарафанное радио"));
	});
});
