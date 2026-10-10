import {
	denteTelegramWebhookResponseSchema,
	type DenteTelegramUpdateKind,
	type DenteTelegramWebhookResponse,
} from "@dental/shared";
import { recordDenteTelegramWebhookEvent } from "../../services/telegram/telegramLegacyMemoryStore.js";
import { TelegramInteractiveTriageService } from "../../services/telegram/TelegramInteractiveTriageService.js";
import { TelegramVoiceIntakeService } from "../../services/telegram/TelegramVoiceIntakeService.js";
import { TelegramRedFlagDetector } from "../../services/telegram/TelegramRedFlagDetector.js";
import { TelegramEmergencyEscalationService } from "../../services/telegram/TelegramEmergencyEscalationService.js";
import { sendTelegramTextMessage } from "../../telegramTransport.js";
import type {
	TelegramRuntimeContext,
	UnknownRecord,
} from "./types.js";
import {
	isRecord,
	readableTelegramPayload,
	readableTelegramText,
	stringFromUnknown,
} from "./telegramUtils.js";

export async function handleWebhookMediaAndEmergency(params: {
	runtime: TelegramRuntimeContext;
	update: UnknownRecord & { update_id: number };
	updateKind: DenteTelegramUpdateKind;
	messageText: string | null;
	command: string | null;
	chatHash: string | null;
	chatId: string | null;
	warnings: string[];
}): Promise<DenteTelegramWebhookResponse | null> {
	const {
		runtime,
		update,
		updateKind,
		messageText,
		command,
		chatHash,
		chatId,
		warnings,
	} = params;

		if (updateKind === "photo" && chatId && runtime.botToken) {
			const message = isRecord(update.message) ? update.message : null;
			const photos = Array.isArray(message?.photo) ? message.photo : [];
			const bestPhoto = photos[photos.length - 1];
			const fileId =
				isRecord(bestPhoto) && typeof bestPhoto.file_id === "string"
					? bestPhoto.file_id
					: null;

			if (fileId) {
				const photoResult =
					await TelegramInteractiveTriageService.handlePhotoIntake({
						botToken: runtime.botToken,
						organizationId: runtime.organizationId,
						clinicId: runtime.clinicId,
						botConfigId: runtime.botConfigId,
						chatId,
						fileId,
						caption: stringFromUnknown(message?.caption),
						updateId: update.update_id,
					});

				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: null,
					status: photoResult.ok ? "processed" : "rejected",
					action: "telegram_patient_photo_received",
					warnings: [],
				});

				if (chatId) {
					await sendTelegramTextMessage({
						botToken: runtime.botToken,
						chatId,
						text: photoResult.responseScreen.text,
						replyMarkup: photoResult.responseScreen.replyMarkup,
					});
				}

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_patient_photo_received",
						suggestedReply: readableTelegramText(photoResult.responseScreen.text),
						suggestedReplyMarkup: readableTelegramPayload(
							photoResult.responseScreen.replyMarkup,
						),
						suggestedPhotoUrl: null,
						warnings: [],
						event,
					}),
				);
			}
		}

		// Приём голосовых обращений пациентов (Voice Note Intake & Transcription)
		if (updateKind === "voice" && chatId && runtime.botToken) {
			const message = isRecord(update.message) ? update.message : null;
			const voice = isRecord(message?.voice) ? message.voice : null;
			const fileId =
				voice && typeof voice.file_id === "string" ? voice.file_id : null;

			if (fileId) {
				const voiceResult =
					await TelegramVoiceIntakeService.handleVoiceIntake({
						botToken: runtime.botToken,
						organizationId: runtime.organizationId,
						clinicId: runtime.clinicId,
						botConfigId: runtime.botConfigId,
						chatId,
						chatFingerprint: chatHash,
						fileId,
						duration: typeof voice?.duration === "number" ? voice.duration : undefined,
						mimeType: typeof voice?.mime_type === "string" ? voice.mime_type : "audio/ogg",
						updateId: update.update_id,
					});

				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: null,
					status: voiceResult.ok ? "processed" : "rejected",
					action: voiceResult.isEmergency
						? "telegram_patient_voice_emergency"
						: "telegram_patient_voice_received",
					warnings: voiceResult.redFlags.hasRedFlags
						? [voiceResult.redFlags.doctorAlertSummary]
						: [],
				});

				if (chatId) {
					await sendTelegramTextMessage({
						botToken: runtime.botToken,
						chatId,
						text: voiceResult.responseScreen.text,
						replyMarkup: voiceResult.responseScreen.replyMarkup,
					});
				}

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: voiceResult.isEmergency
							? "telegram_patient_voice_emergency"
							: "telegram_patient_voice_received",
						suggestedReply: readableTelegramText(voiceResult.responseScreen.text),
						suggestedReplyMarkup: readableTelegramPayload(
							voiceResult.responseScreen.replyMarkup,
						),
						suggestedPhotoUrl: null,
						warnings: voiceResult.redFlags.hasRedFlags
							? [voiceResult.redFlags.doctorAlertSummary]
							: [],
						event,
					}),
				);
			}
		}

		// Детектор красных флагов в текстовых сообщениях пациентов (Red Flag Text Emergency Alert)
		if (messageText && chatId && runtime.botToken && !command) {
			const textRedFlags = TelegramRedFlagDetector.evaluateText(messageText);
			if (textRedFlags.hasRedFlags) {
				const escResult = await TelegramEmergencyEscalationService.escalateEmergency({
					organizationId: runtime.organizationId,
					clinicId: runtime.clinicId,
					chatId,
					chatFingerprint: chatHash,
					source: "text_message",
					redFlagResult: textRedFlags,
					rawMessageText: messageText,
					botToken: runtime.botToken,
				});

				const event = recordDenteTelegramWebhookEvent({
					updateId: update.update_id,
					organizationId: runtime.organizationId,
					botConfigId: runtime.botConfigId,
					chatFingerprint: chatHash,
					updateKind,
					command: null,
					status: "processed",
					action: "telegram_patient_text_emergency",
					warnings: [textRedFlags.doctorAlertSummary],
				});

				await sendTelegramTextMessage({
					botToken: runtime.botToken,
					chatId,
					text: escResult.emergencyScreen.text,
					replyMarkup: escResult.emergencyScreen.replyMarkup,
				});

				return denteTelegramWebhookResponseSchema.parse(
					readableTelegramPayload({
						ok: true,
						duplicate: false,
						action: "telegram_patient_text_emergency",
						suggestedReply: readableTelegramText(escResult.emergencyScreen.text),
						suggestedReplyMarkup: readableTelegramPayload(
							escResult.emergencyScreen.replyMarkup,
						),
						suggestedPhotoUrl: null,
						warnings: [textRedFlags.doctorAlertSummary],
						event,
					}),
				);
			}
		}

	return null;
}
