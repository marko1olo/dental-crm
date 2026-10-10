import type { FastifyRequest } from "fastify";
import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import { messengerInboundEvents } from "../../db/schema.js";
import { updateAppointmentInDb } from "../../db/appointmentsQuery.js";
import { processInboundEvents } from "../../services/messengerIngestion.js";
import {
	denteTelegramWebhookResponseSchema,
	type DenteTelegramBotSettings,
	type DenteTelegramUpdateKind,
	type DenteTelegramWebhookEvent,
	type DenteTelegramWebhookResponse,
} from "@dental/shared";
import type { TenantBotRuntime } from "../../services/telegram/TelegramMultiTenantSupervisor.js";
import {
	type DomainState,
	extractDenteTelegramLinkCode,
	consumeDenteTelegramLinkCode,
	recordDenteTelegramWebhookEvent,
	updateTelegramDialogSession,
} from "../../services/telegram/telegramLegacyMemoryStore.js";
import { answerTelegramCallbackQuery } from "../../telegramTransport.js";
import { TelegramInteractiveTriageService } from "../../services/telegram/TelegramInteractiveTriageService.js";
import type {
	TelegramRuntimeContext,
	UnknownRecord,
	TelegramSafeCallbackAction,
	TelegramWebhookReplyPackage,
} from "./types.js";
import {
	isRecord,
	readableTelegramPayload,
	readableTelegramText,
	telegramCallbackTransportFailureWarning,
} from "./telegramUtils.js";
import { safeCommandKeyboard } from "./telegramKeyboards.js";
import {
	patientMenuCardPhoto,
	suggestedReplyFor,
} from "./telegramReplyWizards.js";
import { telegramLinkCodeRateLimitExceeded } from "./webhookUpdateParser.js";
import {
	persistTelegramChatLinkToDatabase,
	configuredSendTimeoutMs,
} from "./telegramRuntimeContext.js";

export interface WebhookAppointmentCallbackResult {
	handled: boolean;
	ok: boolean;
	action: string;
	appointmentId: string | null;
	taskId: string | null;
	eventId: string | null;
	suggestedReply: string | null;
	callbackAnswerText: string;
	warnings: string[];
}

export async function dispatchWebhookMessage(params: {
	request: FastifyRequest;
	runtime: TelegramRuntimeContext;
	settings: DenteTelegramBotSettings;
	update: UnknownRecord & { update_id: number };
	updateKind: DenteTelegramUpdateKind;
	messageText: string | null;
	command: string | null;
	callbackAction: TelegramSafeCallbackAction | null;
	callbackQueryId: string | null;
	chatHash: string | null;
	chatId: string | null;
	chatType: string | null;
	suppressPublicChatReply: boolean;
	supervisorBot: TenantBotRuntime | null | undefined;
	appointmentCallbackResult: WebhookAppointmentCallbackResult;
	webhookClaim: { claimed: boolean; event: DenteTelegramWebhookEvent };
	domainState: DomainState;
	expectedSecret: string | null;
	sendWebhookSuggestedReply: (
		chatId: string | null,
		suggestedReply: TelegramWebhookReplyPackage,
		botToken: string | null,
	) => Promise<string | null>;
}): Promise<DenteTelegramWebhookResponse> {
	const {
		request,
		runtime,
		settings,
		update,
		updateKind,
		messageText,
		command,
		callbackAction,
		callbackQueryId,
		chatHash,
		chatId,
		chatType,
		suppressPublicChatReply,
		supervisorBot,
		appointmentCallbackResult,
		webhookClaim,
		domainState,
		expectedSecret,
		sendWebhookSuggestedReply,
	} = params;

		// Режим перехвата диалога человеком (Human Live Chat Takeover)
		if (
			chatHash &&
			TelegramInteractiveTriageService.isChatInHumanMode(
				chatHash,
				runtime.organizationId,
				runtime.botConfigId,
			) &&
			messageText &&
			!command
		) {
			const event = recordDenteTelegramWebhookEvent({
				updateId: update.update_id,
				organizationId: runtime.organizationId,
				botConfigId: runtime.botConfigId,
				chatFingerprint: chatHash,
				updateKind,
				command: null,
				status: "processed",
				action: "telegram_human_mode_patient_message",
				warnings: [],
			});

			try {
				await withTenantCtx(runtime.organizationId, async (tx) => {
					await tx.insert(messengerInboundEvents).values({
						organizationId: runtime.organizationId,
						channel: "telegram" as const,
						externalId: `tg_${update.update_id}`,
						externalChatId: chatId || chatHash,
						messageText,
						eventKind: "message" as const,
						rawPayload: update as Record<string, unknown>,
					});
				});
				void processInboundEvents().catch(() => {});
			} catch (humanErr) {
				request.log.warn({ humanErr }, "Failed to record human_mode message");
			}

			return denteTelegramWebhookResponseSchema.parse(
				readableTelegramPayload({
					ok: true,
					duplicate: false,
					action: "telegram_human_mode_patient_message",
					suggestedReply: null,
					suggestedReplyMarkup: null,
					suggestedPhotoUrl: null,
					warnings: [],
					event,
				}),
			);
		}

		if (
			appointmentCallbackResult.handled &&
			appointmentCallbackResult.ok &&
			appointmentCallbackResult.action === "telegram_appointment_confirmed" &&
			appointmentCallbackResult.appointmentId
		) {
			try {
				await updateAppointmentInDb(
					runtime.organizationId,
					appointmentCallbackResult.appointmentId,
					{ status: "confirmed" },
				);
			} catch (updateError) {
				request.log.error(
					{
						err: updateError,
						organizationId: runtime.organizationId,
						appointmentId: appointmentCallbackResult.appointmentId,
					},
					"[Telegram] Не удалось обновить статус записи на confirmed в базе",
				);
			}
		}
		const linkCode = appointmentCallbackResult.handled
			? null
			: extractDenteTelegramLinkCode(messageText);
		const linkCodeRejectedByChatType = Boolean(
			linkCode && chatType !== "private",
		);
		const linkCodeRejectedByRateLimit = Boolean(
			linkCode &&
				!linkCodeRejectedByChatType &&
				telegramLinkCodeRateLimitExceeded(
					chatHash,
					runtime.organizationId,
					runtime.botConfigId,
				),
		);
		const linkResult =
			linkCode && !linkCodeRejectedByChatType && !linkCodeRejectedByRateLimit
				? consumeDenteTelegramLinkCode(linkCode, chatHash, chatId, {
						organizationId: runtime.organizationId,
						clinicId: runtime.clinicId,
						botConfigId: runtime.botConfigId,
					})
				: null;
		if (linkResult?.ok === true && linkResult.chatLink) {
			await persistTelegramChatLinkToDatabase(
				request,
				runtime,
				linkResult.chatLink,
			);
			if (chatHash) {
				updateTelegramDialogSession(
					chatHash,
					runtime.organizationId,
					{
						clinicId: runtime.clinicId,
						chatId: chatId ? String(chatId) : null,
						subjectType: linkResult.subjectType,
						subjectId: linkResult.chatLink.subjectId,
						currentStep: "linked",
						lastCommand: command,
						lastMessageText: messageText ? messageText.slice(0, 200) : null,
					},
					runtime.botConfigId,
				);
			}
		} else if (chatHash) {
			updateTelegramDialogSession(
				chatHash,
				runtime.organizationId,
				{
					clinicId: runtime.clinicId,
					chatId: chatId ? String(chatId) : null,
					currentStep: appointmentCallbackResult.handled
						? appointmentCallbackResult.action
						: command
							? `command:${command}`
							: "message",
					lastCommand: command,
					lastMessageText: messageText ? messageText.slice(0, 200) : null,
				},
				runtime.botConfigId,
			);
		}
		const warnings = [
			...webhookClaim.event.warnings,
			...appointmentCallbackResult.warnings,
			...(expectedSecret
				? []
				: [
						"Webhook secret не настроен; update принимается только для локальной разработки.",
					]),
		];

		if (linkCodeRejectedByChatType) {
			warnings.push(
				"Одноразовый код Telegram можно использовать только в личном чате с ботом; привязка в группах и каналах заблокирована.",
			);
		}
		if (linkCodeRejectedByRateLimit) {
			warnings.push(
				"Слишком много неверных кодов Telegram-привязки за короткое время; прием кодов для этого чата временно ограничен.",
			);
		}
		if (updateKind === "voice" && !settings.allowVoiceIntake) {
			warnings.push(
				"Голосовой ввод отключен; аудио из Telegram не должно попадать в медицинскую запись по умолчанию.",
			);
		}
		if (updateKind === "photo" || updateKind === "document") {
			warnings.push(
				"Передача файлов Telegram не принимается для меддокументов и снимков в безопасной политике по умолчанию.",
			);
		}
		if (linkResult && !linkResult.ok) {
			if (linkResult.reason === "chat_encryption_key_missing") {
				warnings.push(
					"Защищенная связка Telegram-чата не настроена; одноразовый код Telegram не был использован.",
				);
			} else if (
				linkResult.reason === "missing_chat_transport" ||
				linkResult.reason === "chat_encryption_failed"
			) {
				warnings.push(
					"Чат Telegram не удалось сохранить в защищенной связке; одноразовый код Telegram не был использован.",
				);
			} else {
				warnings.push(
					"Одноразовый код Telegram неверный, истек, уже использован или отозван.",
				);
			}
		}

		const action = appointmentCallbackResult.handled
			? appointmentCallbackResult.action
			: linkCodeRejectedByChatType
				? "rejected_non_private_telegram_link_chat"
				: linkCodeRejectedByRateLimit
					? "rate_limited_telegram_link_code"
					: suppressPublicChatReply
						? "rejected_non_private_telegram_chat"
						: linkResult?.ok === true
							? `linked_${linkResult.subjectType}_telegram_chat`
							: linkResult
								? "rejected_telegram_link_code"
								: updateKind === "unsupported"
									? "ignored_unsupported_update"
									: "queued_safe_triage";
		const suggestedReply = appointmentCallbackResult.handled
			? {
					text: appointmentCallbackResult.suggestedReply,
					replyMarkup: safeCommandKeyboard(settings, "appointment_callback"),
					photoUrl: patientMenuCardPhoto(settings, "appointment"),
				}
			: linkCodeRejectedByRateLimit
				? {
						text: null,
						replyMarkup: null,
					}
				: linkCodeRejectedByChatType || suppressPublicChatReply
					? {
							text: linkCodeRejectedByChatType
								? "Код DENTE не принят в публичном чате. Откройте личный чат с ботом и попросите клинику показать QR подключения или отправьте одноразовый код там."
								: "DENTE отвечает только в личном чате с ботом. Откройте личный чат, чтобы подключить уведомления клиники.",
							replyMarkup: safeCommandKeyboard(settings, "rejected"),
							photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
						}
					: linkResult?.ok === true
						? {
								text: "Привязка DENTE завершена. Telegram будет получать только безопасные уведомления клиники. Медицинские документы остаются в защищенном портале.",
								replyMarkup: safeCommandKeyboard(settings, "linked"),
								photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
							}
						: linkResult
							? {
									text:
										linkResult.reason === "chat_encryption_key_missing" ||
										linkResult.reason === "missing_chat_transport" ||
										linkResult.reason === "chat_encryption_failed"
											? "DENTE временно не может безопасно привязать Telegram. Попросите клинику проверить настройки бота и повторить код после исправления."
											: "Код DENTE не принят. Попросите клинику показать новый QR подключения или выдать новый одноразовый код.",
									replyMarkup: safeCommandKeyboard(settings, "rejected"),
									photoUrl: patientMenuCardPhoto(settings, "mainMenu"),
								}
							: suggestedReplyFor(
									command,
									callbackAction,
									settings,
									chatHash,
									updateKind,
									messageText,
									{
										organizationId: runtime.organizationId,
										clinicId: runtime.clinicId,
										botConfigId: runtime.botConfigId,
										state: domainState,
									},
								);

		const botToken = runtime.botToken;
		if (callbackQueryId && botToken) {
			const callbackAnswer = await answerTelegramCallbackQuery({
				botToken,
				callbackQueryId,
				text: appointmentCallbackResult.handled
					? appointmentCallbackResult.callbackAnswerText
					: "DENTE: безопасный ответ отправлен.",
				timeoutMs: Math.min(configuredSendTimeoutMs(), 5000),
			});
			if (!callbackAnswer.ok)
				warnings.push(telegramCallbackTransportFailureWarning(callbackAnswer));
		}

		const replyWarning = suppressPublicChatReply
			? null
			: await sendWebhookSuggestedReply(
					chatId,
					suggestedReply,
					runtime.botToken,
				);
		if (suppressPublicChatReply) {
			warnings.push(
				"Ответ Telegram не отправлен в группу или канал: DENTE отвечает только в личном чате.",
			);
		}
		if (replyWarning) warnings.push(replyWarning);

		const event = recordDenteTelegramWebhookEvent({
			updateId: update.update_id,
			organizationId: runtime.organizationId,
			botConfigId: runtime.botConfigId,
			chatFingerprint: chatHash,
			updateKind,
			command,
			status:
				(appointmentCallbackResult.handled && !appointmentCallbackResult.ok) ||
				linkCodeRejectedByChatType ||
				linkCodeRejectedByRateLimit ||
				suppressPublicChatReply ||
				(linkResult ? !linkResult.ok : false)
					? "rejected"
					: updateKind === "unsupported"
						? "ignored"
						: "processed",
			action,
			warnings,
		});

		// Омни-канальная интеграция: сохраняем входящее сообщение пациента в messenger_inbound_events
		if (
			runtime.organizationId &&
			chatId &&
			(messageText || updateKind === "photo" || updateKind === "document" || updateKind === "voice") &&
			!appointmentCallbackResult.handled &&
			!command
		) {
			try {
				await withTenantCtx(runtime.organizationId, async (tx) => {
					const msgId = `tg_${update.update_id}`;
					const existing = await tx
						.select({ id: messengerInboundEvents.id })
						.from(messengerInboundEvents)
						.where(
							and(
								eq(messengerInboundEvents.organizationId, runtime.organizationId),
								eq(messengerInboundEvents.externalId, msgId),
							),
						)
						.limit(1);

					if (existing.length === 0) {
						let textPayload = messageText ?? null;
						if (!textPayload) {
							if (updateKind === "photo") textPayload = "[Фото]";
							else if (updateKind === "document") textPayload = "[Документ]";
							else if (updateKind === "voice") textPayload = "[Голосовое сообщение]";
						}

						await tx.insert(messengerInboundEvents).values({
							organizationId: runtime.organizationId,
							channel: "telegram" as const,
							externalId: msgId,
							externalChatId: chatId,
							messageText: textPayload,
							eventKind: "message" as const,
							rawPayload: update as Record<string, unknown>,
						});
					}
				});

				void processInboundEvents().catch((err) =>
					request.log.warn({ err }, "Telegram messenger ingestion trigger failed"),
				);
			} catch (ingestErr) {
				request.log.warn({ ingestErr }, "Failed to record Telegram inbound event to messengerInboundEvents");
			}
		}

		if (supervisorBot) {
			supervisorBot.metrics.totalUpdates++;
			supervisorBot.metrics.successfulUpdates++;
		}

		return denteTelegramWebhookResponseSchema.parse(
			readableTelegramPayload({
				ok: true,
				duplicate: false,
				action: event.action,
				suggestedReply: readableTelegramText(suggestedReply.text),
				suggestedReplyMarkup: readableTelegramPayload(
					suggestedReply.replyMarkup,
				),
				suggestedPhotoUrl: suggestedReply.photoUrl?.trim() || null,
				warnings,
				event,
			}),
		);
}
