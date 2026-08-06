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
	if (!chatLink || !chatLink.chatTransportRef) {
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

export async function scheduleNotification(input: {
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

export async function processNotificationQueue() {
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

// In a real env, you would run setInterval(() => processNotificationQueue(), 60000)
// Exporting start worker
export function startNotificationWorker() {
	setInterval(() => {
		processNotificationQueue().catch(console.error);
	}, 10000); // 10s for fast demo feedback
}
