import type {
	Dashboard,
	DenteTelegramBotStatus,
	DenteTelegramChatLinkListResponse,
	DenteTelegramLinkCodeListResponse,
	DenteTelegramOutboxResponse,
} from "@dental/shared";
import { responseErrorMessage, type TelegramFeaturePlan } from "../../AppHelpers.js";
import type {
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
} from "../../utils/TelegramHelpers.js";

/**
 * Управление состоянием вебхуков, эндпоинтов и формированием параметров запросов.
 */
export function buildTelegramStatusEndpoint(
	dashboard: Dashboard | null | undefined,
	telegramModeDraft: string,
	telegramBotConfigId: string,
): string {
	const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim();
	const botConfigId = telegramBotConfigId.trim();
	if (
		telegramModeDraft === "clinic_owned_bot" &&
		organizationId &&
		botConfigId
	) {
		return `/api/telegram/status/${encodeURIComponent(organizationId)}/${encodeURIComponent(botConfigId)}`;
	}

	return "/api/telegram/status";
}

export function appendTelegramRuntimeScopeParams(
	params: URLSearchParams,
	dashboard: Dashboard | null | undefined,
	telegramModeDraft: string,
	telegramBotConfigId: string,
): URLSearchParams {
	const organizationId = dashboard?.clinicSettings?.profile?.organizationId?.trim();
	const botConfigId = telegramBotConfigId.trim();
	if (
		telegramModeDraft === "clinic_owned_bot" &&
		organizationId &&
		botConfigId
	) {
		params.set("botConfigId", botConfigId);
		params.set("organizationId", organizationId);
	}
	return params;
}

export function buildTelegramOutboxRequestParams(
	statusFilter: TelegramOutboxStatusFilter,
	templateFilter: TelegramOutboxTemplateFilter,
	cursor: string | null | undefined,
	dashboard: Dashboard | null | undefined,
	telegramModeDraft: string,
	telegramBotConfigId: string,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("limit", "80");
	if (cursor) params.set("cursor", cursor);
	if (statusFilter !== "all") params.set("status", statusFilter);
	if (templateFilter !== "all") params.set("templateKind", templateFilter);
	appendTelegramRuntimeScopeParams(params, dashboard, telegramModeDraft, telegramBotConfigId);
	return params;
}

export function buildTelegramLinkCodeLedgerRequestParams(
	cursor: string | null | undefined,
	dashboard: Dashboard | null | undefined,
	telegramModeDraft: string,
	telegramBotConfigId: string,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("limit", "8");
	if (cursor) params.set("cursor", cursor);
	appendTelegramRuntimeScopeParams(params, dashboard, telegramModeDraft, telegramBotConfigId);
	return params;
}

export function buildTelegramChatLinkLedgerRequestParams(
	cursor: string | null | undefined,
	dashboard: Dashboard | null | undefined,
	telegramModeDraft: string,
	telegramBotConfigId: string,
): URLSearchParams {
	const params = new URLSearchParams();
	params.set("limit", "8");
	if (cursor) params.set("cursor", cursor);
	appendTelegramRuntimeScopeParams(params, dashboard, telegramModeDraft, telegramBotConfigId);
	return params;
}

export interface TelegramControlPlaneBundle {
	status: DenteTelegramBotStatus;
	featurePlan: TelegramFeaturePlan;
	outbox: DenteTelegramOutboxResponse;
	linkCodeLedger: DenteTelegramLinkCodeListResponse;
	chatLinkLedger: DenteTelegramChatLinkListResponse;
}

export async function fetchTelegramControlPlaneBundle(
	statusUrl: string,
	headers: Record<string, string>,
	outboxParams: URLSearchParams,
	linkCodeParams: URLSearchParams,
	chatLinkParams: URLSearchParams,
): Promise<TelegramControlPlaneBundle> {
	const [
		statusResponse,
		featurePlanResponse,
		outboxResponse,
		linkCodesResponse,
		chatLinksResponse,
	] = await Promise.all([
		fetch(statusUrl, { cache: "no-store", headers }),
		fetch("/api/telegram/feature-plan", { cache: "no-store", headers }),
		fetch(`/api/telegram/outbox?${outboxParams.toString()}`, {
			cache: "no-store",
			headers,
		}),
		fetch(`/api/telegram/link-codes?${linkCodeParams.toString()}`, {
			cache: "no-store",
			headers,
		}),
		fetch(`/api/telegram/chat-links?${chatLinkParams.toString()}`, {
			cache: "no-store",
			headers,
		}),
	]);

	if (!statusResponse.ok) throw new Error(await responseErrorMessage(statusResponse, "Статус Telegram"));
	if (!featurePlanResponse.ok) throw new Error(await responseErrorMessage(featurePlanResponse, "План Telegram"));
	if (!outboxResponse.ok) throw new Error(await responseErrorMessage(outboxResponse, "Очередь Telegram"));
	if (!linkCodesResponse.ok) throw new Error(await responseErrorMessage(linkCodesResponse, "Коды Telegram"));
	if (!chatLinksResponse.ok) throw new Error(await responseErrorMessage(chatLinksResponse, "Связанные Telegram-чаты"));

	return {
		status: (await statusResponse.json()) as DenteTelegramBotStatus,
		featurePlan: (await featurePlanResponse.json()) as TelegramFeaturePlan,
		outbox: (await outboxResponse.json()) as DenteTelegramOutboxResponse,
		linkCodeLedger: (await linkCodesResponse.json()) as DenteTelegramLinkCodeListResponse,
		chatLinkLedger: (await chatLinksResponse.json()) as DenteTelegramChatLinkListResponse,
	};
}

export async function putTelegramSettingsRequest(
	payload: unknown,
	headers: Record<string, string>,
): Promise<DenteTelegramBotStatus> {
	const response = await fetch("/api/settings/telegram", {
		method: "PUT",
		headers: { ...headers, "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		throw new Error(await responseErrorMessage(response, "Настройки Telegram не сохранены"));
	}
	return (await response.json()) as DenteTelegramBotStatus;
}
