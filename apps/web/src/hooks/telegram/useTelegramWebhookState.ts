import {
	denteTelegramBotStatusSchema,
	denteTelegramChatLinkListResponseSchema,
	denteTelegramFeatureSchema,
	denteTelegramLinkCodeListResponseSchema,
	denteTelegramOutboxResponseSchema,
	type Dashboard,
	type DenteTelegramBotStatus,
	type DenteTelegramChatLinkListResponse,
	type DenteTelegramFeature,
	type DenteTelegramLinkCodeListResponse,
	type DenteTelegramOutboxResponse,
} from "@dental/shared";
import { responseErrorMessage, type TelegramFeaturePlan } from "../../AppHelpers.js";
import { isPlainRecord, parseJsonEnvelope } from "../../lib/apiResponseHandler.js";
import type {
	TelegramOutboxStatusFilter,
	TelegramOutboxTemplateFilter,
} from "../../utils/TelegramHelpers.js";

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isTelegramFeaturePlan(value: unknown): value is TelegramFeaturePlan {
	if (!isPlainRecord(value)) return false;
	if (typeof value.productName !== "string") return false;
	if (value.botUsername !== null && typeof value.botUsername !== "string") return false;
	if (!isStringArray(value.modes)) return false;
	if (
		!Array.isArray(value.enabledFeatures) ||
		!value.enabledFeatures.every((f): f is DenteTelegramFeature =>
			denteTelegramFeatureSchema.safeParse(f).success,
		)
	) {
		return false;
	}
	return (
		isStringArray(value.patientSafeActions) &&
		isStringArray(value.staffSafeActions) &&
		isStringArray(value.blockedByDefault)
	);
}

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

	const [status, featurePlan, outbox, linkCodeLedger, chatLinkLedger] = await Promise.all([
		parseJsonEnvelope(statusResponse, denteTelegramBotStatusSchema, "Статус Telegram"),
		parseJsonEnvelope(featurePlanResponse, isTelegramFeaturePlan, "План Telegram"),
		parseJsonEnvelope(outboxResponse, denteTelegramOutboxResponseSchema, "Очередь Telegram"),
		parseJsonEnvelope(linkCodesResponse, denteTelegramLinkCodeListResponseSchema, "Коды Telegram"),
		parseJsonEnvelope(chatLinksResponse, denteTelegramChatLinkListResponseSchema, "Связанные Telegram-чаты"),
	]);

	return {
		status,
		featurePlan,
		outbox,
		linkCodeLedger,
		chatLinkLedger,
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
	return parseJsonEnvelope(
		response,
		denteTelegramBotStatusSchema,
		"Настройки Telegram не сохранены",
	);
}
