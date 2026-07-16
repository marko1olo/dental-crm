import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { db } from "../db/client.js";
import { communicationEvents, patients } from "../db/schema.js";
import { wsBroker } from "../services/websocketBroker.js";

export const telephonyRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Webhook для АТС (Mango, Задарма, UIS)
	server.post<{
		Params: { organizationId: string };
		Body: {
			event: "ringing" | "answered" | "ended";
			from: string;
			to: string;
			call_id?: string;
		};
	}>("/:organizationId/webhook", async (request, reply) => {
		const { organizationId } = request.params;
		const { event, from } = request.body;

		if (!from) {
			return reply.status(400).send({ error: "Missing 'from' phone number" });
		}

		if (event === "ringing") {
			// Пытаемся найти пациента по номеру телефона
			// Убираем всё лишнее из номера, оставляя только цифры для поиска
			const rawPhone = from.replace(/\D/g, "");
			let patient: any = null;

			if (rawPhone.length >= 10) {
				// Ищем по последним 10 цифрам, строго в пределах этой организации,
				// чтобы номер не сматчился с пациентом другой клиники.
				const phoneSuffix = rawPhone.slice(-10);
				const searchResult = await db
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							ilike(patients.phone, `%${phoneSuffix}%`),
						),
					)
					.limit(1);
				patient = searchResult[0] || null;
			}

			// Броадкастим всем админам этой клиники
			wsBroker.broadcastToOrganization(organizationId, {
				type: "TELEPHONY_INCOMING_CALL",
				payload: {
					phone: from,
					patientId: patient?.id || null,
					// Схема пациента хранит единое поле fullName (нет lastName/firstName),
					// поэтому берём его напрямую, иначе имя в тосте было бы пустым.
					patientName: patient?.fullName?.trim() || "Неизвестный номер",
					timestamp: new Date().toISOString(),
				},
			});
		}

		// Возвращаем 200 OK чтобы АТС поняла, что хук принят
		return { success: true };
	});

	// Webhook для SMS (Android App SMS Forwarder)
	server.post<{
		Params: { organizationId: string };
		Body: {
			from: string;
			message: string;
		};
	}>("/:organizationId/sms/webhook", async (request, reply) => {
		const { organizationId } = request.params;
		const { from, message } = request.body;

		if (!from || !message) {
			return reply.status(400).send({ error: "Missing 'from' or 'message'" });
		}

		const rawPhone = from.replace(/\D/g, "");
		let patient: any = null;

		if (rawPhone.length >= 10) {
			const phoneSuffix = rawPhone.slice(-10);
			const searchResult = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						ilike(patients.phone, `%${phoneSuffix}%`),
					),
				)
				.limit(1);
			patient = searchResult[0] || null;
		}

		if (!patient) {
			// Создаем лида, если пришла SMS с неизвестного номера
			const insertedPatients = (await db
				.insert(patients)
				.values({
					organizationId,
					fullName: `SMS User ${from}`,
					phone: from,
					notes: `Лид из SMS`,
					status: "active",
				})
				.returning()) as any;
			patient = insertedPatients[0];
		}

		// Сохраняем входящее SMS в Inbox
		const { communicationEvents } = await import("../db/schema.js");
		await db.insert(communicationEvents).values({
			organizationId,
			patientId: patient.id,
			channel: "sms",
			direction: "inbound",
			status: "delivered",
			message,
		});

		// Броадкастим в Omnichannel Inbox
		wsBroker.broadcastToOrganization(organizationId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "sms",
				patientId: patient.id,
				text: message,
			},
		});

		return { success: true };
	});
};
