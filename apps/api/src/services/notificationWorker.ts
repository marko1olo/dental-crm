import { and, eq, lte } from "drizzle-orm";
import { db } from "../db/client.js";
import { outgoingNotifications, denteTelegramChatLinks, denteTelegramBotConfigs } from "../db/schema.js";
import { sendTelegramTextMessage } from "../telegramTransport.js";

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

		for (const notif of pending) {
			const messageText: string =
				String((notif.payload as Record<string, unknown>)?.text ?? JSON.stringify(notif.payload));

			let deliveryStatus = "failed";
			let failureReason = "skipped: no telegram bot token configured or patient not linked";

			// Try to find telegram link
			const chatLink = await db.query.denteTelegramChatLinks.findFirst({
				where: and(
					eq(denteTelegramChatLinks.subjectId, notif.patientId),
					eq(denteTelegramChatLinks.status, "active")
				),
			});

			if (chatLink && chatLink.chatTransportRef) {
				const botConfig = await db.query.denteTelegramBotConfigs.findFirst({
					where: eq(denteTelegramBotConfigs.organizationId, notif.organizationId),
				});
				
				// tokenSecretRef stores the key reference; in production this would be resolved
				// from a secrets manager. Here we fall back to env var directly.
				const token: string | undefined = process.env.DENTE_TELEGRAM_BOT_TOKEN || botConfig?.tokenSecretRef || undefined;
				
				if (token) {
					const res = await sendTelegramTextMessage({
						botToken: token,
						chatId: chatLink.chatTransportRef as string,
						text: messageText,
					});
					
					if (res.ok) {
						deliveryStatus = "sent";
						failureReason = "";
					} else {
						failureReason = `telegram_error: ${res.errorClass}`;
					}
				}
			}

			console.log(
				`\n${colors.gray}--- [OUTGOING MESSAGE GATEWAY] ---${colors.reset}`,
			);
			console.log(
				`${colors.neonBlue}TO PATIENT:${colors.reset} ${notif.patientId}`,
			);
			console.log(`${colors.neonGreen}TYPE:${colors.reset} ${notif.type}`);
			console.log(`${colors.neonGreen}MESSAGE:${colors.reset} ${messageText}`);
			console.log(`${colors.neonGreen}STATUS:${colors.reset} ${deliveryStatus} ${failureReason ? `(${failureReason})` : ""}`);
			console.log(
				`${colors.gray}----------------------------------${colors.reset}\n`,
			);

			await db
				.update(outgoingNotifications)
				.set({ 
					status: deliveryStatus as any, 
					sentAt: deliveryStatus === "sent" ? new Date() : null 
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
