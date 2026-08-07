import { and, eq, ilike } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { withTenantCtx } from "../db/rls.js";
import {
	communicationEvents,
	messengerInboundEvents,
	patients,
} from "../db/schema.js";
import { verifyWebhookSecret } from "../security/webhookAuth.js";
import { wsBroker } from "../services/websocketBroker.js";

type VkWebhookBody = {
	type?: string;
	event_id?: string;
	object?: {
		message?: {
			id?: number | string;
			from_id?: number | string;
			text?: string;
			date?: number;
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
		if (
			!verifyWebhookSecret(request, reply, {
				channel: "vk",
				secretEnvNames: ["VK_WEBHOOK_SECRET", "DENTE_WEBHOOK_SECRET"],
				extraHeaderNames: ["x-vk-secret"],
			})
		)
			return reply;

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
					message:
						"Приём сообщений из ВКонтакте на этом сервере не настроен: токен подтверждения не задан.",
				});
			}
			return confirmationToken;
		}

		// VK New Message Event
		if (body.type === "message_new") {
			const vkId = body.object?.message?.from_id?.toString();
			const text = body.object?.message?.text || "";

			if (!vkId) return "ok";

			const msgDate =
				body.object?.message?.date ?? (body as { date?: number }).date;
			if (typeof msgDate === "number" && msgDate > 0) {
				const msgTsSec = msgDate > 1e11 ? Math.floor(msgDate / 1000) : msgDate;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					request.log.warn(
						{ msgTsSec, nowSec },
						"VK webhook message timestamp drift > 300s, skipping ingestion",
					);
					return "ok";
				}
			}

			const rawExternalId =
				body.object?.message?.id != null
					? String(body.object.message.id).trim()
					: body.event_id
						? String(body.event_id).trim()
						: null;
			const externalId =
				rawExternalId && rawExternalId.length > 0 ? rawExternalId : null;

			/*
			 * КОНТЕКСТ АРЕНДАТОРА НА ПУБЛИЧНОМ ВЕБХУКЕ. Событие присылает
			 * ВКонтакте, токена клиники в нём нет, поэтому `request.tenantId` не
			 * выставлен и глобальная обёртка server.ts обработчик не
			 * оборачивает. Под FORCE RLS поиск пациента отдавал ноль строк
			 * ВСЕГДА — то есть на каждое сообщение уходила ветка «завести
			 * нового», — а сама вставка падала с 42501, и ВКонтакте получал 500 и
			 * повторял событие бесконечно.
			 *
			 * Обхода здесь не нужно: клиника названа в адресе вебхука (и уже
			 * подтверждена общим секретом выше). Под контекстом чужую картотеку
			 * этот обработчик не увидит и не тронет.
			 */
			await withTenantCtx(organizationId, async (tx) => {
				if (externalId) {
					const existingInbound = await tx
						.select({ id: messengerInboundEvents.id })
						.from(messengerInboundEvents)
						.where(
							and(
								eq(messengerInboundEvents.organizationId, organizationId),
								eq(messengerInboundEvents.externalId, externalId),
							),
						)
						.limit(1);
					if (existingInbound.length > 0) {
						request.log.info(
							{ externalId, organizationId },
							"VK message already ingested (replay skipped)",
						);
						return;
					}

					await tx.insert(messengerInboundEvents).values({
						organizationId,
						channel: "vk",
						externalId,
						externalChatId: vkId,
						messageText: text,
						eventKind: "message",
						rawPayload: body as Record<string, unknown>,
					});
				}

				let patient: typeof patients.$inferSelect | null = null;
				const searchResult = await tx
					.select()
					.from(patients)
					.where(
						and(
							eq(patients.organizationId, organizationId),
							ilike(patients.notes, `%VK:${vkId}%`),
						),
					)
					.limit(1);

				if (searchResult.length > 0) {
					patient = searchResult[0] || null;
				} else {
					const insertedPatients = await tx
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

				if (!patient) return;

				const [newEvent] = await tx
					.insert(communicationEvents)
					.values({
						organizationId,
						patientId: patient.id,
						channel: "vk",
						direction: "inbound",
						status: "delivered",
						message: text,
					})
					.returning();

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
							createdAt: newEvent.createdAt.toISOString(),
						},
					});
				}
			});
		}

		return "ok"; // VK requires exact string "ok" to acknowledge message_new
	});
}
