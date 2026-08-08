import { and, eq, inArray, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import {
	denteTelegramBotConfigs,
	denteTelegramChatLinks,
	outgoingNotifications,
} from "../db/schema.js";
import { sendTelegramTextMessage } from "../telegramTransport.js";

async function attemptTelegramDelivery(
	chatLink: typeof denteTelegramChatLinks.$inferSelect | undefined,
	botConfig: typeof denteTelegramBotConfigs.$inferSelect | undefined,
	messageText: string,
): Promise<{ deliveryStatus: string; failureReason: string }> {
	if (!chatLink?.chatTransportRef) {
		return {
			deliveryStatus: "failed",
			failureReason:
				"skipped: no telegram bot token configured or patient not linked",
		};
	}

	// tokenSecretRef stores the key reference; in production this would be resolved
	// from a secrets manager. Here we fall back to env var directly.
	const token: string | undefined =
		process.env.DENTE_TELEGRAM_BOT_TOKEN ||
		botConfig?.tokenSecretRef ||
		undefined;

	if (!token) {
		return {
			deliveryStatus: "failed",
			failureReason:
				"skipped: no telegram bot token configured or patient not linked",
		};
	}

	const res = await sendTelegramTextMessage({
		botToken: token,
		chatId: chatLink.chatTransportRef as string,
		text: messageText,
	});

	if (res.ok) {
		return { deliveryStatus: "sent", failureReason: "" };
	} else {
		return {
			deliveryStatus: "failed",
			failureReason: `telegram_error: ${res.errorClass}`,
		};
	}
}

async function _scheduleNotification(input: {
	organizationId: string;
	patientId: string;
	type: string;
	payload: any;
	scheduledAt?: Date;
}) {
	await db.insert(outgoingNotifications).values({
		organizationId: input.organizationId,
		patientId: input.patientId,
		type: input.type,
		payload: input.payload,
		scheduledAt: input.scheduledAt ?? new Date(),
		status: "pending",
	});
}

// Neon styling for console
const colors = {
	reset: "\x1b[0m",
	neonGreen: "\x1b[38;2;57;255;20px\x1b[1m",
	neonBlue: "\x1b[38;2;0;255;255px\x1b[1m",
	gray: "\x1b[90m",
};

async function processNotificationQueue() {
	try {
		const pending = await db
			.select()
			.from(outgoingNotifications)
			.where(
				and(
					eq(outgoingNotifications.status, "pending"),
					lte(outgoingNotifications.scheduledAt, new Date()),
				),
			)
			.limit(10);

		if (pending.length === 0) {
			return;
		}

		const uniqueOrganizationIds = Array.from(
			new Set(pending.map((n) => n.organizationId)),
		);
		const uniquePatientIds = Array.from(
			new Set(pending.map((n) => n.patientId)),
		);

		// Pre-fetch configs and chat links for pending notifications
		const botConfigs = await db.query.denteTelegramBotConfigs.findMany({
			where: inArray(
				denteTelegramBotConfigs.organizationId,
				uniqueOrganizationIds,
			),
		});
		const chatLinks = await db.query.denteTelegramChatLinks.findMany({
			where: and(
				inArray(denteTelegramChatLinks.subjectId, uniquePatientIds),
				eq(denteTelegramChatLinks.status, "active"),
			),
		});

		const botConfigsMap = new Map(botConfigs.map((c) => [c.organizationId, c]));
		const chatLinksMap = new Map(chatLinks.map((l) => [l.subjectId, l]));

		for (const notif of pending) {
			const messageText: string = String(
				(notif.payload as Record<string, unknown>)?.text ??
					JSON.stringify(notif.payload),
			);

			// Try to find telegram link
			const chatLink = chatLinksMap.get(notif.patientId);
			const botConfig = botConfigsMap.get(notif.organizationId);

			const { deliveryStatus, failureReason } = await attemptTelegramDelivery(
				chatLink,
				botConfig,
				messageText,
			);

			console.log(
				`\n${colors.gray}--- [OUTGOING MESSAGE GATEWAY] ---${colors.reset}`,
			);
			console.log(
				`${colors.neonBlue}TO PATIENT:${colors.reset} ${notif.patientId}`,
			);
			console.log(`${colors.neonGreen}TYPE:${colors.reset} ${notif.type}`);
			console.log(`${colors.neonGreen}MESSAGE:${colors.reset} ${messageText}`);
			console.log(
				`${colors.neonGreen}STATUS:${colors.reset} ${deliveryStatus} ${failureReason ? `(${failureReason})` : ""}`,
			);
			console.log(
				`${colors.gray}----------------------------------${colors.reset}\n`,
			);

			await db
				.update(outgoingNotifications)
				.set({
					status: deliveryStatus as any,
					sentAt: deliveryStatus === "sent" ? new Date() : null,
				})
				.where(eq(outgoingNotifications.id, notif.id));
		}
	} catch (e) {
		console.error("Failed to process notification queue:", e);
	}
}

let notificationInterval: NodeJS.Timeout | null = null;

/**
 * Запускает разбор очереди исходящих сообщений.
 *
 * БЫЛО: `setInterval` без сохранённого handle, без `unref()` и без парного
 * `clearInterval` во всём файле. Таймер нельзя было остановить, он пинил event
 * loop, и процесс не выходил по SIGTERM без форс-килла. Образец взят из
 * backupWorker.ts:670-722: модульный handle, защита от повторного старта,
 * unref() на таймере, парная функция остановки.
 *
 * ВНИМАНИЕ: этот воркер — СИРОТА. `startNotificationWorker` не зовёт никто,
 * кроме notificationWorker.test.ts; живой разбор очереди делает
 * services/communications/dispatchWorker.ts, подключённый в server.ts:740.
 * Здесь починен только жизненный цикл таймера — подключать воркер к серверу
 * НЕЛЬЗЯ, иначе очередь получит второго разборщика на те же строки.
 */
export function startNotificationWorker() {
	if (notificationInterval) return;

	notificationInterval = setInterval(() => {
		processNotificationQueue().catch(console.error);
	}, 10000); // 10s for fast demo feedback

	// unref, чтобы таймер не удерживал процесс: без него выход только по форс-киллу.
	// Через optional call, потому что тесты подменяют setInterval и возвращают число.
	(notificationInterval as unknown as { unref?: () => void }).unref?.();
}

function _stopNotificationWorker(): void {
	if (notificationInterval) {
		clearInterval(notificationInterval);
		notificationInterval = null;
	}
}
