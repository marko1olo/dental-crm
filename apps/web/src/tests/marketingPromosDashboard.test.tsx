/**
 * marketingPromosDashboard.test.tsx — Unit & SSR tests for Balanced Marketing Dashboard.
 * Mandate 8b, 8c, 8e, 8n (Anti-Void, 2-Column Balance, Message Simulator, 1-Click Launch).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketingView } from "../MarketingView.js";
import { MarketingPromosList } from "../components/marketing/MarketingPromosList.js";
import { MarketingCampaignDetail } from "../components/marketing/MarketingCampaignDetail.js";
import { DEFAULT_MARKETING_PROMOS } from "../components/marketing/marketingPresets.js";
import { AppLogicProvider } from "../contexts/AppLogicContext.js";

// biome-ignore lint/suspicious/noExplicitAny: mock AppLogic context
const mockAppLogicValue: any = {
	clinicName: "Стоматология ДЕНТЕ Премиум",
	dashboard: {
		clinicSettings: {
			name: "Стоматология ДЕНТЕ Премиум",
			staff: [{ id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner" }],
		},
		patients: [{ id: "p-1", fullName: "Ковалёв Роман", phone: "+7 (999) 888-77-66" }],
	},
	recalls: [],
};

describe("Marketing 2-Column Balanced Dashboard (Mandates 8c, 8e, 8n)", () => {
	it("1. Renders MarketingView with 2-column balanced grid container and tabs", () => {
		const child = createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			clinicPhone: "+7 (495) 123-45-67",
		});
		const html = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: child }),
		);

		// Container checks
		assert.ok(html.includes("data-testid=\"marketing-view\""), "must have marketing-view testid");
		assert.ok(html.includes("data-testid=\"marketing-two-col-dashboard\""), "must render 2-column dashboard");
		assert.ok(html.includes("Акции и реклама клиники"), "must have primary header");
		assert.ok(html.includes("активен"), "must have status pill");

		// Tab navigations
		assert.ok(html.includes("data-testid=\"tab-nav-promos\""), "must have promos tab");
		assert.ok(html.includes("data-testid=\"tab-nav-recalls\""), "must have recalls tab");
		assert.ok(html.includes("data-testid=\"tab-nav-romi\""), "must have romi tab");
	});

	it("2. Left Column (MarketingPromosList) renders promotional offers and segmented controls", () => {
		const html = renderToStaticMarkup(
			createElement(MarketingPromosList, {
				promos: DEFAULT_MARKETING_PROMOS,
				selectedPromoId: DEFAULT_MARKETING_PROMOS[0]?.id ?? "",
				onSelectPromo: () => {},
				onOpenNewPromoModal: () => {},
			}),
		);

		// Controls
		assert.ok(html.includes("data-testid=\"marketing-promos-list\""));
		assert.ok(html.includes("data-testid=\"tab-promos-active\""));
		assert.ok(html.includes("data-testid=\"tab-promos-archived\""));
		assert.ok(html.includes("data-testid=\"btn-new-promo\""));
		assert.ok(html.includes("data-testid=\"marketing-promos-search\""));

		// Active promos
		assert.ok(html.includes("HYGIENE3500"), "must show hygiene promo code");
		assert.ok(html.includes("Комплексная профгигиена Air-Flow"), "must show hygiene title");
		assert.ok(html.includes("3 500 ₽ (вместо 5 000 ₽)"), "must show discount text");
		assert.ok(html.includes("BIRTHDAY10"), "must show birthday promo code");
		assert.ok(html.includes("FAMILY5000"), "must show family promo code");
		assert.ok(html.includes("CHECKUP19"), "must show checkup promo code");
	});

	it("3. Right Column (MarketingCampaignDetail) renders complete workspace without void", () => {
		const promo = DEFAULT_MARKETING_PROMOS[0]!;
		const html = renderToStaticMarkup(
			createElement(MarketingCampaignDetail, {
				promo,
				clinicName: "Стоматология ДЕНТЕ Премиум",
				onTogglePromoStatus: () => {},
			}),
		);

		// Workspace testids
		assert.ok(html.includes("data-testid=\"marketing-campaign-detail\""));
		assert.ok(html.includes("data-testid=\"marketing-analytics-section\""));
		assert.ok(html.includes("data-testid=\"marketing-preview-section\""));
		assert.ok(html.includes("data-testid=\"marketing-launch-section\""));

		// 1. Header & Codes
		assert.ok(html.includes("HYGIENE3500"));
		assert.ok(html.includes("data-testid=\"btn-copy-promo\""));
		assert.ok(html.includes("data-testid=\"btn-toggle-promo-status\""));

		// 2. Analytics KPIs
		assert.ok(html.includes("Охват рассылки"));
		assert.ok(html.includes("Конверсия в визиты"));
		assert.ok(html.includes("Выручка по промокоду"));
		assert.ok(html.includes("Окупаемость (ROMI)"));
		assert.ok(html.includes("497") && html.includes("₽"));
		assert.ok(html.includes("+412%"));

		// 3. Message Simulator & Variables
		assert.ok(html.includes("data-testid=\"channel-sms-btn\""));
		assert.ok(html.includes("data-testid=\"channel-whatsapp-btn\""));
		assert.ok(html.includes("data-testid=\"channel-telegram-btn\""));
		assert.ok(html.includes("{Имя}"));
		assert.ok(html.includes("{Скидка}"));
		assert.ok(html.includes("{Ссылка}"));

		// 4. Audience Segments & 1-Click Launch
		assert.ok(html.includes("Пациенты без визита") && html.includes("6 мес."));
		assert.ok(html.includes("data-testid=\"btn-launch-campaign\""));
		assert.ok(html.includes("data-testid=\"btn-test-send\""));
	});

	it("4. Switches smoothly to Recalls Hub and ROMI when initialTab is set", () => {
		// Recalls tab
		const recallsChild = createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "recalls",
		});
		const recallsHtml = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: recallsChild }),
		);
		assert.ok(recallsHtml.includes("data-testid=\"marketing-recalls-container\""));
		assert.ok(recallsHtml.includes("data-testid=\"recall-list-panel\""));

		// ROMI tab
		const romiChild = createElement(MarketingView, {
			clinicName: "Стоматология ДЕНТЕ Премиум",
			initialTab: "romi",
		});
		const romiHtml = renderToStaticMarkup(
			createElement(AppLogicProvider, { value: mockAppLogicValue, children: romiChild }),
		);
		assert.ok(romiHtml.includes("data-testid=\"marketing-romi-container\""));
		assert.ok(romiHtml.includes("data-testid=\"marketing-romi-table-section\""));
	});
});
