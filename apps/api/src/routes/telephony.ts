import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { communicationEvents, patients } from "../db/schema.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { wsBroker } from "../services/websocketBroker.js";

/**
 * Тела вебхуков АТС/SMS раньше читались через bare destructure `const { … } = request.body`.
 * При null/undefined body деструктуризация бросала TypeError → 500 вместо 400.
 * Zod safeParse после verifyWebhookSecret закрывает путь; тексты отказов сохранены.
 */
const telephonyCallBodySchema = z.object({
	event: z.enum(["ringing", "answered", "ended"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	call_id: z.string().optional(),
});

const telephonySmsBodySchema = z.object({
	from: z.string().optional(),
	message: z.string().optional(),
});

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
		// БЫЛО: вебхук АТС принимал любой POST — посторонний мог показывать
		// врачам всплывающие уведомления о фиктивных звонках и заводить
		// пациентов/лиды в чужой клинике.
		if (
			!verifyWebhookSecret(request, reply, {
				channel: "telephony",
				secretEnvNames: ["TELEPHONY_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
			})
		)
			return reply;

		const { organizationId } = request.params;
		return withTenantCtx(organizationId, async () => {
			const parsedCall = telephonyCallBodySchema.safeParse(request.body);
			if (!parsedCall.success) {
				return reply.status(400).send({ error: "Missing 'from' phone number" });
			}
			const { event, from } = parsedCall.data;

			if (!from) {
				return reply.status(400).send({ error: "Missing 'from' phone number" });
			}

			if (event === "ringing") {
				// Пытаемся найти пациента по номеру телефона
				// Убираем всё лишнее из номера, оставляя только цифры для поиска
				const rawPhone = from.replace(/\D/g, "");
				let patient: typeof patients.$inferSelect | null = null;
				const phoneSuffix =
					rawPhone.length >= 10 ? rawPhone.slice(-10) : rawPhone;

				if (rawPhone.length >= 10) {
					// Ищем по последним 10 цифрам, строго в пределах этой организации,
					// чтобы номер не сматчился с пациентом другой клиники.
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

				// Если пациент не найден — создаем черновик лида в crmLeads (идемпотентно, без гонки потоков)
				if (!patient && phoneSuffix.length >= 7) {
					try {
						const { crmLeads } = await import("../db/schema.js");
						const existingLeads = await db
							.select()
							.from(crmLeads)
							.where(
								and(
									eq(crmLeads.organizationId, organizationId),
									ilike(crmLeads.phone, `%${phoneSuffix}%`),
								),
							)
							.limit(1);

						if (existingLeads.length === 0) {
							await db.insert(crmLeads).values({
								organizationId,
								name: `Входящий звонок ${from}`,
								patientName: `Звонок ${from}`,
								phone: from,
								source: "telephony",
								status: "new",
								notes: "Автоматический черновик лида из входящего звонка АТС",
							});
						}
					} catch (leadErr) {
						console.warn(
							"[Telephony Idempotent Lead Creation Warning]:",
							leadErr,
						);
					}
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
	});

	// Webhook для SMS (Android App SMS Forwarder)
	server.post<{
		Params: { organizationId: string };
		Body: {
			from: string;
			message: string;
		};
	}>("/:organizationId/sms/webhook", async (request, reply) => {
		// БЫЛО: вебхук АТС принимал любой POST — посторонний мог показывать
		// врачам всплывающие уведомления о фиктивных звонках и заводить
		// пациентов/лиды в чужой клинике.
		if (
			!verifyWebhookSecret(request, reply, {
				channel: "telephony",
				secretEnvNames: ["TELEPHONY_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
			})
		)
			return reply;

		const { organizationId } = request.params;
		return withTenantCtx(organizationId, async () => {
			const parsedSms = telephonySmsBodySchema.safeParse(request.body);
			if (!parsedSms.success) {
				return reply.status(400).send({ error: "Missing 'from' or 'message'" });
			}
			const { from, message } = parsedSms.data;

			if (!from || !message) {
				return reply.status(400).send({ error: "Missing 'from' or 'message'" });
			}

			const rawPhone = from.replace(/\D/g, "");
			let patient: typeof patients.$inferSelect | null = null;

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
				const insertedPatients = await db
					.insert(patients)
					.values({
						organizationId,
						fullName: `SMS User ${from}`,
						phone: from,
						notes: `Лид из SMS`,
						status: "active",
					})
					.returning();
				patient = insertedPatients[0] || null;
			}

			if (!patient) return { success: false };

			// Сохраняем входящее SMS в Inbox
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
	});
};
