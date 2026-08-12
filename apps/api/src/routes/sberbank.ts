import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";
import { db } from "../db/client.js";
import { payments, sberbankTransactions } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { SberbankClient } from "../services/sberbankClient.js";
import { randomUUID } from "node:crypto";

export async function registerSberbankRoutes(app: FastifyInstance) {
	app.post(
		"/api/sberbank/pay",
		{
			schema: {
				body: {
					type: "object",
					required: ["patientId", "amount"],
					properties: {
						patientId: { type: "string", format: "uuid" },
						amount: { type: "integer", minimum: 1 },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;

			const organizationId = await requireOrganizationContext(request, reply);
			if (!organizationId) return;

			const { patientId, amount } = request.body as {
				patientId: string;
				amount: number;
			};

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch (e) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: отсутствуют учётные данные в окружении.",
				});
			}

			// Конвертируем рубли в копейки
			const amountKopecks = Math.round(amount * 100);
			const internalOrderNumber = randomUUID();
			
			// Формируем обратный URL, куда вернётся пользователь.
			// По-хорошему он должен зависеть от хоста, но для шлюза важно его наличие
			const origin = request.headers.origin ?? "https://dente.clinic";
			const returnUrl = `${origin}/payment/success`;

			try {
				const sberbankResponse = await client.registerOrder(
					internalOrderNumber,
					amountKopecks,
					returnUrl,
				);

				if (sberbankResponse.errorCode) {
					return reply.status(400).send({
						error: "SberbankRegistrationFailed",
						message: sberbankResponse.errorMessage || "Ошибка регистрации заказа в банке",
					});
				}

				if (!sberbankResponse.orderId) {
					return reply.status(500).send({
						error: "SberbankInvalidResponse",
						message: "Банк не вернул orderId",
					});
				}

				await db.insert(sberbankTransactions).values({
					id: internalOrderNumber,
					organizationId,
					orderId: sberbankResponse.orderId,
					amount: amountKopecks,
					status: "CREATED",
					patientId,
				});

				return {
					success: true,
					orderId: sberbankResponse.orderId,
					formUrl: sberbankResponse.formUrl,
				};
			} catch (err) {
				request.log.error(err, "Sberbank API Error");
				return reply.status(502).send({
					error: "PaymentGatewayError",
					message: "Ошибка связи с платёжным шлюзом",
				});
			}
		},
	);

	app.get(
		"/api/sberbank/status/:orderId",
		{
			schema: {
				params: {
					type: "object",
					required: ["orderId"],
					properties: {
						orderId: { type: "string" },
					},
				},
			},
		},
		async (request, reply) => {
			const perm = await requirePermission(request, reply, "finance.write");
			if (!perm) return;
			const { orderId } = request.params as { orderId: string };
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return;

			const [transaction] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.orderId, orderId),
						eq(sberbankTransactions.organizationId, orgId),
					),
				)
				.limit(1);

			if (!transaction) {
				return reply.status(404).send({ error: "Transaction not found" });
			}

			let client: SberbankClient;
			try {
				client = new SberbankClient();
			} catch (e) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message: "Платёжный шлюз не сконфигурирован",
				});
			}

			try {
				const statusData = await client.getOrderStatusExtended(transaction.orderId);
				const sberStatus = statusData.orderStatus?.toString() || "UNKNOWN";
				
				// Обновляем статус транзакции
				await db
					.update(sberbankTransactions)
					.set({ status: sberStatus, updatedAt: new Date() })
					.where(eq(sberbankTransactions.id, transaction.id));

				// Если оплата успешна (status 2 в Сбербанке означает полную авторизацию суммы)
				// и мы еще не зафиксировали это в таблице payments (предотвращаем двойное зачисление)
				if (sberStatus === "2" && transaction.status !== "2") {
					await db.insert(payments).values({
						organizationId: orgId,
						patientId: transaction.patientId,
						amountRub: transaction.amount / 100, // возвращаем рубли
						method: "card",
						status: "paid",
						note: `Оплата картой через терминал Сбербанка, заказ #${transaction.orderId}`,
					});
				}

				return {
					success: true,
					status: sberStatus,
					amount: transaction.amount,
					bankData: statusData,
				};
			} catch (err) {
				request.log.error(err, "Sberbank API Error checking status");
				return reply.status(502).send({
					error: "PaymentGatewayError",
					message: "Не удалось получить статус от шлюза",
				});
			}
		},
	);
}
