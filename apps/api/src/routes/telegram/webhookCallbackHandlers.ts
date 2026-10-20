/**
 * webhookCallbackHandlers.ts — Layer 5 Facade: Единая точка маршрутизации коллбеков Telegram Webhook.
 * Делегирует исполнение специализированным изолированным модулям в webhookModules/.
 */

import type { FastifyRequest } from "fastify";
import type {
	DenteTelegramBotSettings,
	DenteTelegramUpdateKind,
	DenteTelegramWebhookResponse,
} from "@dental/shared";
import type {
	TelegramRuntimeContext,
	UnknownRecord,
} from "./types.js";
import { detectSpecializedCallbackKind } from "./webhookModules/telegramCallbackParser.js";
import {
	handleNpsCallback,
	handlePostOpCallback,
	handleTriageCallback,
	handleCloserCallback,
} from "./webhookModules/specializedPatientCallbacks.js";
import {
	handleIntercomAckCallback,
	handleCockpitCallback,
	handlePresetNavCallback,
} from "./webhookModules/specializedStaffCallbacks.js";
import type { WebhookSpecializedCallbackParams } from "./webhookModules/telegramWebhookTypes.js";

export type {
	ParsedAppointmentActionCallback,
	ParsedNpsCallback,
	ParsedPostOpCallback,
	ParsedPresetNavCallback,
	SpecializedCallbackHandlerResult,
	TelegramCallbackDataKind,
	WebhookSpecializedCallbackParams,
} from "./webhookModules/telegramWebhookTypes.js";

export {
	detectSpecializedCallbackKind,
	extractMessageIdFromUpdate,
	parseAppointmentActionCallbackPayload,
	parseNpsCallbackPayload,
	parsePostOpCallbackPayload,
	parsePresetNavCallbackPayload,
} from "./webhookModules/telegramCallbackParser.js";

export {
	recordPostOpCriticalAlertInDb,
	resolveLatestAppointmentForPatient,
	updateAppointmentStatusFromTelegram,
} from "./webhookModules/telegramCallbackMutations.js";

export {
	handleNpsCallback,
	handlePostOpCallback,
	handleTriageCallback,
	handleCloserCallback,
} from "./webhookModules/specializedPatientCallbacks.js";

export {
	handleIntercomAckCallback,
	handleCockpitCallback,
	handlePresetNavCallback,
} from "./webhookModules/specializedStaffCallbacks.js";

/**
 * Единый фасад маршрутизации специализированных inline callback кнопок Telegram.
 */
export async function handleWebhookSpecializedCallbacks(params: {
	request: FastifyRequest;
	runtime: TelegramRuntimeContext;
	settings: DenteTelegramBotSettings;
	callbackData: string | null;
	callbackQueryId: string | null;
	chatHash: string | null;
	chatId: string | null;
	update: UnknownRecord & { update_id: number };
	updateKind: DenteTelegramUpdateKind;
	warnings: string[];
}): Promise<DenteTelegramWebhookResponse | null> {
	const kind = detectSpecializedCallbackKind(params.callbackData);
	if (!kind) return null;

	const callbackParams: WebhookSpecializedCallbackParams = params;

	switch (kind) {
		case "nps":
			return handleNpsCallback(callbackParams);
		case "intercom_ack":
			return handleIntercomAckCallback(callbackParams);
		case "cockpit":
			return handleCockpitCallback(callbackParams);
		case "preset_nav":
			return handlePresetNavCallback(callbackParams);
		case "postop":
			return handlePostOpCallback(callbackParams);
		case "triage":
			return handleTriageCallback(callbackParams);
		case "closer":
			return handleCloserCallback(callbackParams);
		default:
			return null;
	}
}
