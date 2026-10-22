import assert from "node:assert/strict";
import type { AppLogicContextType } from "../../../contexts/AppLogicContext";

export const expect = (actual: any) => ({
	toBe: (expected: any) => assert.equal(actual, expected),
	toBeTruthy: () => assert.ok(actual),
	toContain: (expected: string) => assert.ok(String(actual).includes(expected), `expected to contain ${expected}`),
	toMatch: (regex: RegExp) => assert.match(String(actual), regex),
	not: {
		toContain: (expected: string) => assert.ok(!String(actual).includes(expected), `expected not to contain ${expected}`),
		toMatch: (regex: RegExp) => assert.doesNotMatch(String(actual), regex),
	},
});

export const mockResponse = (data: unknown) =>
	({
		ok: true, status: 200, json: async () => data,
	}) as unknown as Response;

export const mockAppContext = {
	getGatewayStatus: async () =>
		mockResponse({
			channels: {
				sms: { configured: true, provider: "uis", sender: "CLINIC", balance: null, balanceError: null },
				email: { configured: false, host: null, from: null, requireTls: false },
				whatsapp: { configured: true }, telegram: { configured: true },
				vk: { configured: false, detail: "" }, max: { configured: false, detail: "" },
			},
			automaticSending: {
				enabled: true, intervalSeconds: 60, batchSize: 25, detail: "",
				enableWith: "", waiting: 0, oldestWaitingAt: null,
			},
			deliverableChannels: ["sms", "whatsapp", "telegram"],
		}),
	getTemplates: async () => mockResponse({ templates: [] }),
	getOutbox: async () => mockResponse({ items: [], summary: {} }),
	getSettings: async () =>
		mockResponse({
			settings: {
				timezone: "Europe/Moscow", quietHoursStartMinute: 1320, quietHoursEndMinute: 540,
				deferServiceInQuietHours: false, blockMarketingInQuietHours: true, dailyLimitPerPatient: 3,
				channelFallback: ["whatsapp", "telegram", "sms"], appointmentReminderEnabled: true,
				appointmentReminderLeadHours: [24], appointmentReminderWindowMinutes: 60,
			},
		}),
	getVariables: async () => mockResponse({ variables: [] }),
	getChatQuota: async () => mockResponse({ remaining: 0, smsQuotaLimit: 100 }),
	previewTemplate: async () =>
		mockResponse({ text: "", fits: true, problems: [], length: 0, limit: 70, sms: null }),
	auth: { currentUser: { name: "Администратор" } },
} as unknown as AppLogicContextType;
