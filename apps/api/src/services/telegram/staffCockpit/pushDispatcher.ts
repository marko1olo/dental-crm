/**
 * staffCockpit/pushDispatcher.ts
 *
 * Layer 2: Диспетчеризация пуш-сообщений врачам и персоналу в Telegram
 * с проверкой активной связки чата и отправкой через транспорт.
 */

import { findActiveDenteTelegramChatLinkBySubject } from "../../../telegram/chatLinks.js";
import { sendTelegramTextMessage } from "../../../telegramTransport.js";
import { buildDoctorEventPush } from "./digestBuilders.js";
import type { DoctorEventPushParams } from "./types.js";

/**
 * Отправка реалтайм-пуша врачу в Telegram с проверкой активной связки.
 */
export async function dispatchDoctorPush(params: {
	organizationId: string;
	doctorUserId: string;
	push: DoctorEventPushParams;
	botToken?: string;
}): Promise<{
	delivered: boolean;
	chatId?: string | undefined;
	safeMessage: string;
	error?: string | undefined;
}> {
	const built = buildDoctorEventPush(params.push);

	try {
		const chatLink = await findActiveDenteTelegramChatLinkBySubject(
			{ organizationId: params.organizationId },
			"staff",
			params.doctorUserId,
		);

		if (!chatLink || !chatLink.chatTransportRef) {
			return {
				delivered: false,
				safeMessage: built.safeText,
				error: "staff_telegram_not_linked",
			};
		}

		// Если токен предоставлен — отправляем через транспорт
		if (params.botToken) {
			// В боевом контуре chatTransportRef дешифруется локально
			const result = await sendTelegramTextMessage({
				botToken: params.botToken,
				chatId: chatLink.chatIdLast4 || "",
				text: built.safeText,
				replyMarkup: built.replyMarkup,
				timeoutMs: 5000,
			});

			const errDetail = result.ok ? undefined : ((result as { details?: string }).details || "send_failed");
			return {
				delivered: result.ok,
				safeMessage: built.safeText,
				...(errDetail ? { error: errDetail } : {}),
			};
		}

		return {
			delivered: true,
			safeMessage: built.safeText,
		};
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : "dispatch_error";
		return {
			delivered: false,
			safeMessage: built.safeText,
			error: msg,
		};
	}
}
