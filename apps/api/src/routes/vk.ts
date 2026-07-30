import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { communicationEvents, patients } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";

type VkWebhookBody = {
	type?: string;
	object?: {
		message?: {
			from_id?: number | string;
			text?: string;
		};
	};
};

export async function registerVkRoutes(server: FastifyInstance) {
	server.post<{
		Params: { organizationId: string };
		Body: VkWebhookBody;
	}>("/api/public/:organizationId/vk/webhook", async (request, reply) => {
		// БЫЛО: вебхук принимал любой POST без проверки — посторонний мог
		// создавать пациентов и вбрасывать сообщения в чужую клинику.
		if (!verifyWebhookSecret(request, reply, {
			channel: "vk",
			secretEnvNames: ["VK_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
			extraHeaderNames: ["x-vk-secret"],
		})) return reply;

		const { organizationId } = request.params;
		// Shape-guard: null/string/array must not TypeError on body.type / body.object.
		// VK retries on non-200 for events; silent "ok" matches Callback API ACK contract
		// (same idea as max/whatsapp cast-after-200, without pre-ACK because confirmation
		// must return the plain token string).
		if (
			!request.body ||
			typeof request.body !== "object" ||
			Array.isArray(request.body)
		) {
			return reply.code(200).send("ok");
		}
		const body = request.body as VkWebhookBody;

		// VK Callback API Server Confirmation
		if (body.type === "confirmation") {
			// БЫЛО: публичный дефолт "8a12b45f" — кто угодно мог подтвердить
			// чужой сервер приёма событий VK.
			const confirmationToken = process.env.VK_CONFIRMATION_TOKEN?.trim();
			if (!confirmationToken) {
				// Имя переменной окружения ушло из тела ответа в журнал сервера:
				// маршрут публичный, и называть в его ответе внутренние настройки
				// значит выдавать их первому, кто постучится. Тому, кто настраивает
				// приём событий, имя нужно — но он читает журнал сервера.
				request.log.error(
					{ requiredEnv: ["VK_CONFIRMATION_TOKEN"] },
					"Подтверждение сервера событий ВКонтакте отклонено: токен подтверждения не задан в окружении сервера",
				);
				return reply.code(503).send({
					error: "VkConfirmationTokenMissing",
					message: "Приём сообщений из ВКонтакте на этом сервере не настроен: токен подтверждения не задан.",
				});
			}
			return confirmationToken;
		}

		// VK New Message Event
		if (body.type === "message_new") {
			const vkId = body.object?.message?.from_id?.toString();
			const text = body.object?.message?.text || "";

			if (!vkId) return { success: true };

			let patient: typeof patients.$inferSelect | null = null;
			const searchResult = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						ilike(patients.notes, `%VK:${vkId}%`)
					)
				)
				.limit(1);

			if (searchResult.length > 0) {
				patient = searchResult[0] || null;
			} else {
				const insertedPatients = await db
					.insert(patients)
					.values({
						organizationId,
						fullName: `VK User ${vkId}`,
						notes: `Создан автоматически из ВКонтакте. VK:${vkId}`,
						status: "active",
					})
					.returning();
				patient = insertedPatients[0] || null;
			}

			if (!patient) return { success: false };

			const [newEvent] = await db.insert(communicationEvents).values({
				organizationId,
				patientId: patient.id,
				channel: "vk", 
				direction: "inbound",
				status: "delivered",
				message: text,
			}).returning();

			if (newEvent) {
				wsBroker.broadcastToOrganization(organizationId, {
					type: "INBOX_NEW_MESSAGE",
					payload: {
						id: newEvent.id,
						channel: "vk",
						patientId: patient.id,
						patientName: patient.fullName,
						text,
						direction: "inbound",
						createdAt: newEvent.createdAt.toISOString()
					},
				});
			}
		}

		return "ok"; // VK requires exact string "ok" to acknowledge message_new
	});
}
