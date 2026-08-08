import { fetchWithHandling } from "../../utils/networkUtils";

export function useCommunicationsQueries(options?: { auth?: any }) {
	const auth = options?.auth;

	const getGatewayStatus = async () =>
		fetchWithHandling("/api/communications/gateway-status", {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const getTemplates = async () =>
		fetchWithHandling("/api/communications/templates", {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const getOutbox = async (query = "") =>
		fetchWithHandling(`/api/communications/outbox${query}`, {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const getSettings = async () =>
		fetchWithHandling("/api/communications/settings", {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const getVariables = async () =>
		fetchWithHandling("/api/communications/variables", {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const getChatQuota = async () =>
		fetchWithHandling("/api/chat/quota", {
			headers: auth?.denteClinicalReadHeaders(),
		});
	const sendChatSms = async (payload: any) =>
		fetchWithHandling("/api/chat/sms/send", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const previewTemplate = async (_templateId: string | null, payload: any) =>
		fetchWithHandling("/api/communications/templates/preview", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const updateTemplate = async (editingId: string, payload: any) =>
		fetchWithHandling(`/api/communications/templates/${editingId}`, {
			method: "PATCH", // Fixed: server expects PATCH (communicationsOutbox.ts:276), not PUT
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const createTemplate = async (payload: any) =>
		fetchWithHandling("/api/communications/templates", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const outboxAction = async (outboxId: string, action: string) =>
		fetchWithHandling(`/api/communications/outbox/${outboxId}/${action}`, {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders(),
		});

	const dispatchOutbox = async () =>
		fetchWithHandling("/api/communications/outbox/dispatch", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify({ batchSize: 25 }),
		});

	const runReminders = async () =>
		fetchWithHandling("/api/communications/reminders/run", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders(),
		});

	const saveSettings = async (payload: any) =>
		fetchWithHandling("/api/communications/settings", {
			method: "PUT",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const addOutboxMessage = async (payload: any) =>
		fetchWithHandling("/api/communications/outbox", {
			method: "POST",
			headers: auth?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const getCampaigns = async (authObj?: any) =>
		fetchWithHandling("/api/communications/campaigns", {
			headers: (authObj || auth)?.denteClinicalReadHeaders(),
		});
	const getCampaignsTemplates = async (authObj?: any) =>
		fetchWithHandling("/api/communications/templates", {
			headers: (authObj || auth)?.denteClinicalReadHeaders(),
		});
	const getCampaignsVariables = async (authObj?: any) =>
		fetchWithHandling("/api/communications/variables", {
			headers: (authObj || auth)?.denteClinicalReadHeaders(),
		});

	const createCampaign = async (payload: any, authObj?: any) =>
		fetchWithHandling("/api/communications/campaigns", {
			method: "POST",
			headers: (authObj || auth)?.denteClinicalMutationHeaders({
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const previewCampaign = async (campaignId: string, authObj?: any) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/preview`, {
			headers: (authObj || auth)?.denteClinicalReadHeaders(),
		});
	const getCampaignProgress = async (campaignId: string, authObj?: any) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/progress`, {
			headers: (authObj || auth)?.denteClinicalReadHeaders(),
		});

	const campaignAction = async (
		campaignId: string,
		action: string,
		authObj?: any,
	) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/${action}`, {
			method: "POST",
			headers: (authObj || auth)?.denteClinicalMutationHeaders(),
		});

	return {
		getGatewayStatus,
		getTemplates,
		getOutbox,
		getSettings,
		getVariables,
		getChatQuota,
		sendChatSms,
		previewTemplate,
		updateTemplate,
		createTemplate,
		outboxAction,
		dispatchOutbox,
		runReminders,
		saveSettings,
		addOutboxMessage,
		getCampaigns,
		getCampaignsTemplates,
		getCampaignsVariables,
		createCampaign,
		previewCampaign,
		getCampaignProgress,
		campaignAction,
	};
}
