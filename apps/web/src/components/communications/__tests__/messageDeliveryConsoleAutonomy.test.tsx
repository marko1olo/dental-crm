/**
 * messageDeliveryConsoleAutonomy.test.tsx
 *
 * Communications Omnichannel Textarea Autonomy & Solo Doctor Invariants Unit Tests
 * CONSTITUTION: THE HAMMER MASTER PROMPT & .agents/AGENTS.md
 * - Mandate 8e: Doctor & Staff Autonomy (No disabled buttons/inputs without cause, seamless typing)
 * - Mandate 8n: Solo Doctor & Small Clinic Sovereignty
 *
 * Verifies:
 * 1. When enqueueChannel === "sms" and uisQuota.remaining <= 0, the textarea #enqueue-body
 *    is NOT disabled, allowing staff to freely type text and switch channels.
 * 2. The warning alert banner suggesting WhatsApp/Telegram is rendered below the textarea:
 *    «Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.»
 * 3. When SMS quota is available (remaining > 0), the warning banner is not displayed.
 * 4. When alternative channels (WhatsApp, Telegram) are selected, the SMS quota warning banner is not displayed.
 * 5. Source code invariant: textarea #enqueue-body has no disabled property in MessageDeliveryConsole.tsx.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
	AppLogicProvider,
	type AppLogicContextType,
} from "../../../contexts/AppLogicContext";
import { MessageDeliveryConsole } from "../MessageDeliveryConsole";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
					provider: "uis",
					sender: "CLINIC",
					balance: null,
					balanceError: null,
				},
				email: {
					configured: false,
					host: null,
					from: null,
					requireTls: false,
				},
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
	getChatQuota: async () =>
		mockResponse({ remaining: 0, smsQuotaLimit: 100 }),
	previewTemplate: async () =>
		mockResponse({
			text: "",
			fits: true,
			problems: [],
			length: 0,
			limit: 70,
			sms: null,
		}),
	auth: {
		currentUser: { name: "Администратор" },
	},
} as unknown as AppLogicContextType;

describe("MessageDeliveryConsole Omnichannel Textarea Autonomy (Mandates 8e & 8n)", () => {
	it("1. textarea #enqueue-body is NOT disabled when enqueueChannel === 'sms' and uisQuota.remaining <= 0", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole
					initialEnqueueChannel="sms"
					initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }}
				/>
			</AppLogicProvider>,
		);

		// Textarea is present in markup
		expect(html).toContain('id="enqueue-body"');
		expect(html).toContain('data-testid="outbox-enqueue-body"');

		// Textarea is NOT disabled
		expect(html).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(html).not.toMatch(/<textarea[^>]*disabled[^>]*id="enqueue-body"/);
	});

	it("2. displays helpful warning banner suggesting WhatsApp/Telegram when SMS quota is exhausted", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole
					initialEnqueueChannel="sms"
					initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }}
				/>
			</AppLogicProvider>,
		);

		// Exact warning banner text
		const expectedBannerText =
			"Лимит SMS исчерпан. Переключите канал на WhatsApp или Telegram для бесплатной отправки сообщения.";
		expect(html).toContain(expectedBannerText);

		// Warning banner testid and accessibility role
		expect(html).toContain('data-testid="sms-quota-warning-banner"');
		expect(html).toContain('role="alert"');
		expect(html).toContain("ops-notice--warn");
	});

	it("3. does NOT display SMS quota warning banner when remaining quota > 0", () => {
		const html = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole
					initialEnqueueChannel="sms"
					initialUisQuota={{ remaining: 45, smsQuotaLimit: 100 }}
				/>
			</AppLogicProvider>,
		);

		expect(html).toContain('id="enqueue-body"');
		expect(html).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(html).not.toContain("Лимит SMS исчерпан");
		expect(html).not.toContain('data-testid="sms-quota-warning-banner"');
	});

	it("4. does NOT display SMS quota warning banner when channel is WhatsApp or Telegram", () => {
		const htmlWhatsApp = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole
					initialEnqueueChannel="whatsapp"
					initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }}
				/>
			</AppLogicProvider>,
		);

		expect(htmlWhatsApp).toContain('id="enqueue-body"');
		expect(htmlWhatsApp).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(htmlWhatsApp).not.toContain("Лимит SMS исчерпан");
		expect(htmlWhatsApp).not.toContain('data-testid="sms-quota-warning-banner"');

		const htmlTelegram = renderToStaticMarkup(
			<AppLogicProvider value={mockAppContext}>
				<MessageDeliveryConsole
					initialEnqueueChannel="telegram"
					initialUisQuota={{ remaining: 0, smsQuotaLimit: 100 }}
				/>
			</AppLogicProvider>,
		);

		expect(htmlTelegram).toContain('id="enqueue-body"');
		expect(htmlTelegram).not.toMatch(/<textarea[^>]*id="enqueue-body"[^>]*disabled/);
		expect(htmlTelegram).not.toContain("Лимит SMS исчерпан");
		expect(htmlTelegram).not.toContain('data-testid="sms-quota-warning-banner"');
	});

	it("5. source code audit: textarea #enqueue-body has no disabled property", () => {
		const consolePath = path.resolve(
			__dirname,
			"../MessageDeliveryConsole.tsx",
		);
		const sourceCode = fs.readFileSync(consolePath, "utf-8");

		// Extract textarea block
		const textareaMatch = sourceCode.match(/<textarea[\s\S]*?id="enqueue-body"[\s\S]*?\/>/);
		expect(textareaMatch).toBeTruthy();
		if (textareaMatch) {
			expect(textareaMatch[0]).not.toContain("disabled");
		}
	});
});
