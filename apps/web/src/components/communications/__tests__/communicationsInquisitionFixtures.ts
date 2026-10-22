import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppLogicContextType } from "../../../contexts/AppLogicContext";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const commDir = path.resolve(__dirname, "..");

export const mockResponse = (data: unknown) =>
	({
		ok: true, status: 200, json: async () => data,
	}) as unknown as Response;

export const mockAppContext = {
	getGatewayStatus: async () =>
		mockResponse({
			channels: {
				sms: { configured: true, provider: "smsru", sender: "DENTE", balance: { amount: 1543.2, currency: "RUB" }, balanceError: null },
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
	getChatQuota: async () => mockResponse({ remaining: 50, smsQuotaLimit: 100 }),
	previewTemplate: async () =>
		mockResponse({ text: "Приём завтра в 14:00", fits: true, problems: [], length: 20, limit: 70, sms: { encoding: "ucs2", characters: 20, segments: 1, charactersLeftInSegment: 50 } }),
	getCampaigns: async () => mockResponse({ campaigns: [] }),
	getCampaignsTemplates: async () => mockResponse({ templates: [] }),
	getCampaignsVariables: async () => mockResponse({ variables: [] }),
	auth: { currentUser: { name: "Доктор Иванов" } },
} as unknown as AppLogicContextType;
