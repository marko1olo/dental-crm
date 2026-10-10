/**
 * communicationsAutonomyInquisition.test.ts
 *
 * Subagent 7: Red Team Inquisitor for Communications, Messaging & Delivery Console.
 *
 * CRITICAL AUDIT & INQUISITION TEST SUITE:
 * - Mandate 8s: Solo Doctor & Small Clinic Sovereignty
 * - Mandate 8i: CRM != Reality Simulator
 * - Mandate 8b: Kopeck-Exact Arithmetic (zero float drift in SMS segment costing & balances)
 * - Mandate 8d pt 7: Zero Cartoon Emojis (pure clinical typography)
 * - Mandate 8d pt 6 & pt 3: Anti-Matryoshka (max modal depth = 1, desktop density, no inline 44px bloat)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	AppLogicProvider,
	type AppLogicContextType,
} from "../../../contexts/AppLogicContext";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";
import { CampaignPanel } from "../CampaignPanel";
import {
	calculateMessagingCostKopecks,
	calculateSmsCostKopecks,
	DEFAULT_SMS_SEGMENT_COST_KOPECKS,
	formatSmsBalance,
	formatSmsCostRu,
} from "../communicationsCostEngine";
import {
	describeDispatchReport,
	describeReminderReport,
	formatMoment,
} from "../deliveryReportNotice";
import {
	journalDirectionLabel,
	journalEntryNotice,
	summarizeJournal,
} from "../journalDigest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commDir = path.resolve(__dirname, "..");

const mockResponse = (data: unknown) =>
	({
		ok: true,
		status: 200,
		json: async () => data,
	}) as unknown as Response;

const mockAppContext = {
	getGatewayStatus: async () =>
		mockResponse({
			channels: {
				sms: {
					configured: true,
					provider: "smsru",
					sender: "DENTE",
					balance: { amount: 1543.2, currency: "RUB" },
					balanceError: null,
				},
				email: { configured: false, host: null, from: null, requireTls: false },
				whatsapp: { configured: true },
				telegram: { configured: true },
				vk: { configured: false, detail: "" },
				max: { configured: false, detail: "" },
			},
			automaticSending: {
				enabled: true,
				intervalSeconds: 60,
				batchSize: 25,
				detail: "",
				enableWith: "",
				waiting: 0,
				oldestWaitingAt: null,
			},
			deliverableChannels: ["sms", "whatsapp", "telegram"],
		}),
	getTemplates: async () => mockResponse({ templates: [] }),
	getOutbox: async () => mockResponse({ items: [], summary: {} }),
	getSettings: async () =>
		mockResponse({
			settings: {
				timezone: "Europe/Moscow",
				quietHoursStartMinute: 1320,
				quietHoursEndMinute: 540,
				deferServiceInQuietHours: false,
				blockMarketingInQuietHours: true,
				dailyLimitPerPatient: 3,
				channelFallback: ["whatsapp", "telegram", "sms"],
				appointmentReminderEnabled: true,
				appointmentReminderLeadHours: [24],
				appointmentReminderWindowMinutes: 60,
			},
		}),
	getVariables: async () => mockResponse({ variables: [] }),
	getChatQuota: async () => mockResponse({ remaining: 50, smsQuotaLimit: 100 }),
	previewTemplate: async () =>
		mockResponse({
			text: "Приём завтра в 14:00",
			fits: true,
			problems: [],
			length: 20,
			limit: 70,
			sms: {
				encoding: "ucs2",
				characters: 20,
				segments: 1,
				charactersLeftInSegment: 50,
			},
		}),
	getCampaigns: async () => mockResponse({ campaigns: [] }),
	getCampaignsTemplates: async () => mockResponse({ templates: [] }),
	getCampaignsVariables: async () => mockResponse({ variables: [] }),
	auth: {
		currentUser: { name: "Доктор Иванов" },
	},
} as unknown as AppLogicContextType;

describe("Red Team Inquisition: Mandate 8b — Kopeck-Exact Arithmetic & SMS Segment Costing", () => {
	it("1. calculateSmsCostKopecks computes exact integer kopecks without float drift", () => {
		// Test standard SMS segment calculation
		const cost = calculateSmsCostKopecks(2, 50, DEFAULT_SMS_SEGMENT_COST_KOPECKS);
		// 2 segments * 50 recipients * 250 kopecks = 25,000 kopecks (250.00 RUB)
		assert.equal(cost, 25000);
		assert.equal(Number.isInteger(cost), true);

		// Prove absence of IEEE-754 drift with irregular numbers (e.g. 3 segments, 7 recipients, 249 kopecks)
		// Float: (3 * 7) * 2.49 = 52.290000000000006
		// Integer kopecks: 21 * 249 = 5229
		const irregularCost = calculateSmsCostKopecks(3, 7, 249);
		assert.equal(irregularCost, 5229);
		assert.equal(formatSmsCostRu(irregularCost).replace(/\s/g, " "), "52,29 ₽");
	});

	it("2. calculateSmsCostKopecks handles zero and boundary cases cleanly", () => {
		assert.equal(calculateSmsCostKopecks(0, 100), 0);
		assert.equal(calculateSmsCostKopecks(2, 0), 0);
		assert.equal(calculateSmsCostKopecks(-1, 50), 0);
		assert.equal(calculateSmsCostKopecks(2, -10), 0);
		// Float truncation
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
			React.createElement(
				AppLogicProvider,
				{ value: mockAppContext },
				React.createElement(MessageDeliveryConsole as any, {
					initialGateways: {
						channels: {
							sms: {
								configured: true,
								provider: "smsru",
								sender: "DENTE",
								balance: { amount: 1543.2, currency: "RUB" },
								balanceError: null,
							},
							email: { configured: false, host: null, from: null, requireTls: false },
							whatsapp: { configured: true },
							telegram: { configured: true },
							vk: { configured: false, detail: "" },
							max: { configured: false, detail: "" },
						},
						automaticSending: {
							enabled: true,
							intervalSeconds: 60,
							batchSize: 25,
							detail: "",
							enableWith: "",
							waiting: 0,
							oldestWaitingAt: null,
						},
						deliverableChannels: ["sms", "whatsapp", "telegram"],
					},
				}),
			),
		);
		// Balance 1543.2 -> "1543.20 RUB"
		assert.match(html, /Остаток 1543\.20 RUB/);
	});
});

describe("Red Team Inquisition: Mandate 8s — Solo Doctor & Small Clinic Sovereignty", () => {
	it("1. Single-click reminder: enqueueMessage does not require double-click when body is empty", () => {
		const hookPath = fs.existsSync(
			path.resolve(commDir, "deliveryConsole/useMessageDeliveryConsole.ts"),
		)
			? path.resolve(commDir, "deliveryConsole/useMessageDeliveryConsole.ts")
			: path.resolve(commDir, "MessageDeliveryConsole.tsx");
		const consoleSrc = fs.readFileSync(hookPath, "utf-8");
		// Must not have double-click blocker
		assert.ok(
			!consoleSrc.includes("showToast(\"Заполнен текст напоминания по умолчанию. Нажмите кнопку ещё раз для отправки\""),
			"Double-click requirement must be removed",
		);
		// Must set default body and proceed directly
		assert.ok(
			consoleSrc.includes("Здравствуйте! Напоминаем о вашей записи на приём в клинику ДЕНТЕ. Ждём вас!"),
		);
	});

	it("2. Solo doctor sovereignty: empty templates view provides 1-click button to fill default reminder", () => {
		const html = renderToStaticMarkup(
			React.createElement(
				AppLogicProvider,
				{ value: mockAppContext },
				React.createElement(MessageDeliveryConsole),
			),
		);
		assert.match(html, /data-testid="btn-fill-default-confirmation-template"/);
		assert.match(html, /Заполнить шаблон подтверждения по умолчанию/);
	});

	it("3. CampaignPanel defaults to service scope for clinical recall without marketing barriers", () => {
		const hookPath = fs.existsSync(
			path.resolve(commDir, "campaignPanel/useCampaignPanel.ts"),
		)
			? path.resolve(commDir, "campaignPanel/useCampaignPanel.ts")
			: path.resolve(commDir, "CampaignPanel.tsx");
		const campaignSrc = fs.readFileSync(hookPath, "utf-8");
		assert.ok(
			campaignSrc.includes('useState<"service" | "marketing">("service")'),
			"Default scope must be service so recall reaches patients without explicit ad consent",
		);
	});

	it("4. CampaignPanel includes 1-click quick recall presets for solo doctor", () => {
		const presetsPath = fs.existsSync(
			path.resolve(commDir, "campaignPanel/CampaignAudienceFilter.tsx"),
		)
			? path.resolve(commDir, "campaignPanel/CampaignAudienceFilter.tsx")
			: path.resolve(commDir, "CampaignPanel.tsx");
		const campaignSrc = fs.readFileSync(presetsPath, "utf-8");
		assert.ok(campaignSrc.includes('data-testid="preset-recall-6m"'));
		assert.ok(campaignSrc.includes('data-testid="preset-recall-12m"'));
		assert.ok(campaignSrc.includes('data-testid="preset-hygiene-3m"'));
	});
});

describe("Red Team Inquisition: Mandate 8i — CRM != Reality Simulator", () => {
	it("1. No fake spam simulation or academic multi-tier campaign bloat in target files", () => {
		const targetFiles = [
			"MessageDeliveryConsole.tsx",
			"CampaignPanel.tsx",
			"deliveryReportNotice.ts",
			"journalDigest.ts",
		];
		for (const file of targetFiles) {
			const content = fs.readFileSync(path.resolve(commDir, file), "utf-8");
			assert.ok(!content.includes("fakeSimulation"), `${file} must not have fakeSimulation`);
			assert.ok(!content.includes("spamScore"), `${file} must not have spamScore`);
			assert.ok(!content.includes("mockDispatch"), `${file} must not have mockDispatch`);
		}
	});

	it("2. Real queue states and direct channel logging supported", () => {
		const report = describeDispatchReport({
			claimed: 3,
			sent: 3,
			retried: 0,
			failed: 0,
			suppressed: 0,
			notConfigured: 0,
			deferred: 0,
			releasedStuck: 0,
			awaitingRetry: 0,
			awaitingSchedule: 0,
		});
		assert.equal(report.kind, "done");
		assert.match(report.text, /Отправлено: 3 сообщения/);

		const digest = summarizeJournal([
			{ direction: "outbound", status: "delivered" },
			{ direction: "inbound", status: "delivered" },
		]);
		assert.equal(digest.phase, "ready");
		assert.equal(digest.total, 2);
		assert.equal(digest.undelivered, 0);
	});
});

describe("Red Team Inquisition: Mandate 8d pt 7 — Zero Cartoon Emojis", () => {
	it("1. Zero raw emojis in notification templates, buttons, and status badges", () => {
		const targetFiles = [
			"MessageDeliveryConsole.tsx",
			"CampaignPanel.tsx",
			"deliveryReportNotice.ts",
			"journalDigest.ts",
			"communicationsCostEngine.ts",
		];
		// Extended Pictographic regex matching all Unicode emoji sequences
		const emojiRegex = /\p{Extended_Pictographic}/u;

		for (const file of targetFiles) {
			const fullPath = path.resolve(commDir, file);
			if (!fs.existsSync(fullPath)) continue;
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
			lines.forEach((line, index) => {
				assert.ok(
					!emojiRegex.test(line),
					`Found cartoon emoji in ${file}:${index + 1} -> ${line.trim()}`,
				);
			});
		}
	});
});

describe("Red Team Inquisition: Mandate 8d pt 3 & pt 6 — Anti-Matryoshka & Desktop Density", () => {
	it("1. Max modal depth = 1: no nested modal dialogs or layered cards in communications", () => {
		const targetFiles = [
			"MessageDeliveryConsole.tsx",
			"CampaignPanel.tsx",
		];
		for (const file of targetFiles) {
			const content = fs.readFileSync(path.resolve(commDir, file), "utf-8");
			// Check for modal-inside-modal
			const modalCount = (content.match(/<dialog|<Modal/g) || []).length;
			assert.ok(modalCount <= 1, `${file} must not have nested modals`);
			// Check for nested card bloat (card inside card)
			assert.ok(!content.includes("card-body card"), `${file} must not nest cards`);
		}
	});

	it("2. Desktop Density First: No hardcoded minHeight 44px inline style bloat in CampaignPanel", () => {
		const campaignSrc = fs.readFileSync(
			path.resolve(commDir, "CampaignPanel.tsx"),
			"utf-8",
		);
		// All hardcoded style={{ minHeight: "44px" }} must be eliminated
		assert.ok(
			!campaignSrc.includes('style={{ minHeight: "44px" }}'),
			"Hardcoded minHeight 44px must be eliminated from desktop controls",
		);
	});
});
