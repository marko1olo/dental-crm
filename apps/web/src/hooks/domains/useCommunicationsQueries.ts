import { fetchWithHandling } from "../../utils/networkUtils";

export interface CommunicationsAuthOptions {
	denteClinicalReadHeaders?: (extra?: Record<string, string>) => HeadersInit;
	denteClinicalMutationHeaders?: (extra?: Record<string, string>) => HeadersInit;
	[key: string]: unknown;
}

export interface UseCommunicationsQueriesOptions {
	auth?: CommunicationsAuthOptions | null | undefined;
}

export function useCommunicationsQueries(
	options?: UseCommunicationsQueriesOptions,
) {
	const auth = options?.auth;

	const getReadHeaders = (
		authObj?: CommunicationsAuthOptions | null | undefined,
		extra?: Record<string, string>,
	): HeadersInit => {
		const targetAuth = authObj || auth;
		if (targetAuth && typeof targetAuth.denteClinicalReadHeaders === "function") {
			return targetAuth.denteClinicalReadHeaders(extra);
		}
		return extra ?? {};
	};

	const getMutationHeaders = (
		authObj?: CommunicationsAuthOptions | null | undefined,
		extra?: Record<string, string>,
	): HeadersInit => {
		const targetAuth = authObj || auth;
		if (targetAuth && typeof targetAuth.denteClinicalMutationHeaders === "function") {
			return targetAuth.denteClinicalMutationHeaders(extra);
		}
		return extra ?? {};
	};

	const getGatewayStatus = async () =>
		fetchWithHandling("/api/communications/gateway-status", {
			headers: getReadHeaders(),
		});
	const getTemplates = async () =>
		fetchWithHandling("/api/communications/templates", {
			headers: getReadHeaders(),
		});
	const getOutbox = async (query = "") =>
		fetchWithHandling(`/api/communications/outbox${query}`, {
			headers: getReadHeaders(),
		});
	const getSettings = async () =>
		fetchWithHandling("/api/communications/settings", {
			headers: getReadHeaders(),
		});
	const getVariables = async () =>
		fetchWithHandling("/api/communications/variables", {
			headers: getReadHeaders(),
		});
	const getChatQuota = async () =>
		fetchWithHandling("/api/chat/quota", {
			headers: getReadHeaders(),
		});
	const sendChatSms = async (payload: unknown) =>
		fetchWithHandling("/api/chat/sms/send", {
			method: "POST",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const previewTemplate = async (_templateId: string | null, payload: unknown) =>
		fetchWithHandling("/api/communications/templates/preview", {
			method: "POST",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const updateTemplate = async (editingId: string, payload: unknown) =>
		fetchWithHandling(`/api/communications/templates/${editingId}`, {
			method: "PATCH",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const createTemplate = async (payload: unknown) =>
		fetchWithHandling("/api/communications/templates", {
			method: "POST",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const outboxAction = async (outboxId: string, action: string) =>
		fetchWithHandling(`/api/communications/outbox/${outboxId}/${action}`, {
			method: "POST",
			headers: getMutationHeaders(),
		});

	const dispatchOutbox = async () =>
		fetchWithHandling("/api/communications/outbox/dispatch", {
			method: "POST",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify({ batchSize: 25 }),
		});

	const runReminders = async () =>
		fetchWithHandling("/api/communications/reminders/run", {
			method: "POST",
			headers: getMutationHeaders(),
		});

	const saveSettings = async (payload: unknown) =>
		fetchWithHandling("/api/communications/settings", {
			method: "PUT",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const addOutboxMessage = async (payload: unknown) =>
		fetchWithHandling("/api/communications/outbox", {
			method: "POST",
			headers: getMutationHeaders(undefined, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const getCampaigns = async (
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling("/api/communications/campaigns", {
			headers: getReadHeaders(authObj),
		});
	const getCampaignsTemplates = async (
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling("/api/communications/templates", {
			headers: getReadHeaders(authObj),
		});
	const getCampaignsVariables = async (
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling("/api/communications/variables", {
			headers: getReadHeaders(authObj),
		});

	const createCampaign = async (
		payload: unknown,
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling("/api/communications/campaigns", {
			method: "POST",
			headers: getMutationHeaders(authObj, {
				"content-type": "application/json",
			}),
			body: JSON.stringify(payload),
		});

	const previewCampaign = async (
		campaignId: string,
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/preview`, {
			headers: getReadHeaders(authObj),
		});
	const getCampaignProgress = async (
		campaignId: string,
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/progress`, {
			headers: getReadHeaders(authObj),
		});

	const campaignAction = async (
		campaignId: string,
		action: string,
		authObj?: CommunicationsAuthOptions | null | undefined,
	) =>
		fetchWithHandling(`/api/communications/campaigns/${campaignId}/${action}`, {
			method: "POST",
			headers: getMutationHeaders(authObj),
		});

	async function fetchRecordingDetails(recordingId: string) {
		await fetch(`/api/telephony/recordings/${recordingId}`);
	}
	async function fetchRecordingStream(recordingId: string) {
		await fetch(`/api/telephony/recordings/${recordingId}/stream`);
	}
	return {
		fetchRecordingDetails,
		fetchRecordingStream,
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
