import assert from "node:assert/strict";
import fs from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppLogicProvider } from "../../../contexts/AppLogicContext";
import {
	calculateMessagingCostKopecks, calculateSmsCostKopecks,
	DEFAULT_SMS_SEGMENT_COST_KOPECKS, formatSmsBalance, formatSmsCostRu,
} from "../communicationsCostEngine";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { commDir, mockAppContext } from "./communicationsInquisitionFixtures";

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
	it("1. Single-click reminder: enqueueMessage does not require double-click when body is empty", () => {
		const hookPath = fs.existsSync(path.resolve(commDir, "deliveryConsole/useMessageDeliveryConsole.ts"))
			? path.resolve(commDir, "deliveryConsole/useMessageDeliveryConsole.ts")
			: path.resolve(commDir, "MessageDeliveryConsole.tsx");
		const consoleSrc = fs.readFileSync(hookPath, "utf-8");
		assert.ok(!consoleSrc.includes("showToast(\"Заполнен текст напоминания по умолчанию. Нажмите кнопку ещё раз для отправки\""));
		assert.ok(consoleSrc.includes("Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Ждём вас!"));
	});

	it("2. Solo doctor sovereignty: empty templates view provides 1-click button to fill default reminder", () => {
		const html = renderToStaticMarkup(
			React.createElement(AppLogicProvider, { value: mockAppContext }, React.createElement(MessageDeliveryConsole)),
		);
		assert.match(html, /data-testid="btn-fill-default-confirmation-template"/);
		assert.match(html, /Заполнить шаблон подтверждения по умолчанию/);
	});

	it("3. CampaignPanel defaults to service scope for clinical recall without marketing barriers", () => {
		const hookPath = fs.existsSync(path.resolve(commDir, "campaignPanel/useCampaignPanel.ts"))
			? path.resolve(commDir, "campaignPanel/useCampaignPanel.ts")
			: path.resolve(commDir, "CampaignPanel.tsx");
		const campaignSrc = fs.readFileSync(hookPath, "utf-8");
		assert.ok(campaignSrc.includes('useState<"service" | "marketing">("service")'));
	});

	it("4. CampaignPanel includes 1-click quick recall presets for solo doctor", () => {
		const presetsPath = fs.existsSync(path.resolve(commDir, "campaignPanel/CampaignAudienceFilter.tsx"))
			? path.resolve(commDir, "campaignPanel/CampaignAudienceFilter.tsx")
			: path.resolve(commDir, "CampaignPanel.tsx");
		const campaignSrc = fs.readFileSync(presetsPath, "utf-8");
		assert.ok(campaignSrc.includes('data-testid="preset-recall-6m"'));
		assert.ok(campaignSrc.includes('data-testid="preset-recall-12m"'));
		assert.ok(campaignSrc.includes('data-testid="preset-hygiene-3m"'));
	});
});
