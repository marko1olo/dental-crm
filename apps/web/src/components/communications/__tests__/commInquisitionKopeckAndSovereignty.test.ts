import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
	calculateMessagingCostKopecks, calculateSmsCostKopecks,
	DEFAULT_SMS_SEGMENT_COST_KOPECKS, formatSmsBalance, formatSmsCostRu,
} from "../communicationsCostEngine";
import { CampaignPanel, useCampaignPanel } from "../CampaignPanel";
import { CampaignAudienceFilter, CampaignQuickPresets } from "../campaignPanel/CampaignAudienceFilter";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { mockAppContext } from "./communicationsInquisitionFixtures";

(globalThis as { React?: typeof React }).React = React;

describe("Red Team Inquisition: Mandate 8b — Kopeck-Exact Arithmetic & SMS Segment Costing", () => {
	it("1. calculateSmsCostKopecks computes exact integer kopecks without float drift", () => {
		const cost = calculateSmsCostKopecks(2, 50, DEFAULT_SMS_SEGMENT_COST_KOPECKS);
		assert.equal(cost, 25000);
		assert.equal(Number.isInteger(cost), true);

		const irregularCost = calculateSmsCostKopecks(3, 7, 249);
		assert.equal(irregularCost, 5229);
		assert.equal(formatSmsCostRu(irregularCost).replace(/\s/g, " "), "52,29 ₽");
	});

	it("2. calculateSmsCostKopecks handles zero and boundary cases cleanly", () => {
		assert.equal(calculateSmsCostKopecks(0, 100), 0);
		assert.equal(calculateSmsCostKopecks(2, 0), 0);
		assert.equal(calculateSmsCostKopecks(-1, 50), 0);
		assert.equal(calculateSmsCostKopecks(2, -10), 0);
		assert.equal(calculateSmsCostKopecks(2.9, 10.5, 250), 20 * 250);
	});

	it("3. calculateMessagingCostKopecks is free (0 kopecks) for WhatsApp, Telegram, Email", () => {
		assert.equal(calculateMessagingCostKopecks("whatsapp", 500), 0);
		assert.equal(calculateMessagingCostKopecks("telegram", 500), 0);
		assert.equal(calculateMessagingCostKopecks("email", 500), 0);
		assert.equal(calculateMessagingCostKopecks("sms", 100, 250), 25000);
	});

	it("4. formatSmsBalance formats float amounts into kopeck-exact ruble strings", () => {
		assert.equal(formatSmsBalance({ amount: 1543.2, currency: "RUB" }), "1543.20");
		assert.equal(formatSmsBalance({ amount: 4122.56, currency: "RUB" }), "4122.56");
		assert.equal(formatSmsBalance({ amount: 0, currency: "RUB" }), "0.00");
		assert.equal(formatSmsBalance(null), "0.00");
		assert.equal(formatSmsBalance(undefined), "0.00");
	});

	it("5. MessageDeliveryConsole renders exact kopecks for SMS balance", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole as any, {
				initialGateways: {
					channels: {
						sms: { configured: true, provider: "smsru", sender: "DENTE", balance: { amount: 1543.2, currency: "RUB" }, balanceError: null },
						email: { configured: false, host: null, from: null, requireTls: false },
						whatsapp: { configured: true }, telegram: { configured: true },
						vk: { configured: false, detail: "" }, max: { configured: false, detail: "" },
					},
					automaticSending: { enabled: true, intervalSeconds: 60, batchSize: 25, detail: "", enableWith: "", waiting: 0, oldestWaitingAt: null },
					deliverableChannels: ["sms", "whatsapp", "telegram"],
				},
			})),
		);
		assert.match(html, /Остаток 1543\.20 RUB/);
	});
});

describe("Red Team Inquisition: Mandate 8s — Solo Doctor & Small Clinic Sovereignty", () => {
	it("1. Single-click reminder: MessageDeliveryConsole renders unlocked enqueue CTA ready for empty-body default send", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		assert.match(html, /data-testid="outbox-enqueue-submit"/);
		assert.equal(/<button[^>]*data-testid="outbox-enqueue-submit"[^>]*disabled/i.test(html), false);
	});

	it("2. Solo doctor sovereignty: empty templates view provides 1-click button to fill default reminder", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		assert.match(html, /data-testid="btn-fill-default-confirmation-template"/);
		assert.match(html, /Заполнить шаблон подтверждения по умолчанию/);
	});

	it("3. useCampaignPanel defaults to service scope for clinical recall without marketing barriers", () => {
		let capturedScope = "";
		function CampaignScopeProbe() {
			const panel = useCampaignPanel();
			capturedScope = panel.scope;
			return React.createElement(CampaignAudienceFilter, {
				scope: panel.scope,
				setScope: panel.setScope,
				monthsSinceVisit: panel.monthsSinceVisit,
				setMonthsSinceVisit: panel.setMonthsSinceVisit,
				excludeBooked: panel.excludeBooked,
				setExcludeBooked: panel.setExcludeBooked,
			});
		}
		const html = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(CampaignScopeProbe)),
		);
		assert.equal(capturedScope, "service");
		assert.match(html, /<option value="service" selected=""/i);
	});

	it("4. CampaignQuickPresets renders quick recall presets and applies service scope on click", () => {
		let applied: { title: string; scope: "service" | "marketing"; months: string; excludeBooked: boolean } | null = null;
		const html = renderToStaticMarkup(
			React.createElement(CampaignQuickPresets, {
				onApplyPreset: (preset) => {
					applied = preset;
				},
			}),
		);
		assert.ok(html.includes('data-testid="preset-recall-6m"'));
		assert.ok(html.includes('data-testid="preset-recall-12m"'));
		assert.ok(html.includes('data-testid="preset-hygiene-3m"'));
		assert.equal(applied, null);
	});
});
