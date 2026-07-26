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
		const body = (request.body || {}) as VkWebhookBody;

		// VK Callback API Server Confirmation
		if (body.type === "confirmation") {
			// БЫЛО: публичный дефолт "8a12b45f" — кто угодно мог подтвердить
			// чужой сервер приёма событий VK.
			const confirmationToken = process.env.VK_CONFIRMATION_TOKEN?.trim();
			if (!confirmationToken) {
				return reply.code(503).send({
					error: "VkConfirmationTokenMissing",
					message: "Не задан VK_CONFIRMATION_TOKEN в окружении сервера.",
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
