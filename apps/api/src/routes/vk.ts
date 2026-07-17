import { ilike } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { communicationEvents, patients } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

export async function registerVkRoutes(server: FastifyInstance) {
	server.post<{
		Params: { organizationId: string };
		Body: any;
	}>("/api/public/:organizationId/vk/webhook", async (request, reply) => {
		const { organizationId } = request.params;
		const body = request.body as any;

		// VK Callback API Server Confirmation
		if (body.type === "confirmation") {
			return process.env.VK_CONFIRMATION_TOKEN || "8a12b45f";
		}

		// VK New Message Event
		if (body.type === "message_new") {
			const vkId = body.object?.message?.from_id?.toString();
			const text = body.object?.message?.text || "";

			if (!vkId) return { success: true };

			let patient: any = null;
			const searchResult = await db
				.select()
				.from(patients)
				.where(ilike(patients.notes, `%VK:${vkId}%`))
				.limit(1);

			if (searchResult.length > 0) {
				patient = searchResult[0];
			} else {
				const insertedPatients = (await db
					.insert(patients)
					.values({
						organizationId,
						fullName: `VK User ${vkId}`,
						notes: `Создан автоматически из ВКонтакте. VK:${vkId}`,
						status: "active",
					})
					.returning()) as any;
				patient = insertedPatients[0];
			}

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
