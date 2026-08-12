import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";
import { db } from "../db/client.js";
import { payments, sberbankTransactions } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { SberbankClient } from "../services/sberbankClient.js";

async function processSberbankTransaction(orgId: string, transactionId: string) {
	let client: SberbankClient;
	try {
		client = new SberbankClient();
	} catch (e) {
		throw new Error("PaymentGatewayNotConfigured");
	}

	return await db.transaction(async (tx) => {
		// Блокируем строку транзакции от параллельных гонок (Race Conditions).
		// Двойной GET /status или GET + Callback не создадут два платежа.
		const [transaction] = await tx
			.select()
			.from(sberbankTransactions)
			.where(
				and(
					eq(sberbankTransactions.id, transactionId),
					eq(sberbankTransactions.organizationId, orgId)
				)
			)
			.limit(1)
			.for("update");

		if (!transaction) {
			throw new Error("Transaction not found");
		}

		// Читаем единственный источник правды напрямую из шлюза банка
		const statusData = await client.getOrderStatusExtended(transaction.orderId);
		const sberStatus = statusData.orderStatus?.toString() || "UNKNOWN";
		const oldStatus = transaction.status;

		// Обновляем статус транзакции
		await tx
			.update(sberbankTransactions)
			.set({ status: sberStatus, updatedAt: new Date() })
			.where(eq(sberbankTransactions.id, transaction.id));

		// Логика переходов финансового состояния
		// 1. Успешная оплата (status 2 = полная авторизация суммы)
		if (sberStatus === "2" && oldStatus !== "2") {
			await tx.insert(payments).values({
				organizationId: orgId,
				patientId: transaction.patientId,
				amountRub: transaction.amount / 100, // Конвертация копеек в рубли
				method: "card",
				status: "paid",
				note: `Оплата картой через терминал Сбербанка, заказ #${transaction.orderId}`,
				clientMutationId: `sberbank_order_id:${transaction.orderId}`, // ЖЕСТКАЯ СВЯЗЬ
			});
		}

		// 2. Возврат (Refund = 4) или Отмена (Reversed = 3)
		// Если платеж уже был "paid", а банк прислал возврат, клиника не должна 
		// сохранять виртуальную выручку.
		if ((sberStatus === "4" || sberStatus === "3") && oldStatus === "2") {
			await tx
				.update(payments)
				.set({ status: "refunded" })
				.where(
					and(
						eq(payments.organizationId, orgId),
						eq(payments.clientMutationId, `sberbank_order_id:${transaction.orderId}`)
					)
				);
		}

		return {
			success: true,
			status: sberStatus,
			amount: transaction.amount,
			bankData: statusData,
			transaction,
		};
	});
}

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
						message:
							sberbankResponse.errorMessage || "Ошибка регистрации заказа в банке",
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

			try {
				const result = await processSberbankTransaction(orgId, transaction.id);
				return {
					success: true,
					status: result.status,
					amount: result.amount,
					bankData: result.bankData,
				};
			} catch (err: any) {
				if (err.message === "PaymentGatewayNotConfigured") {
					return reply.status(501).send({
						error: "PaymentGatewayNotConfigured",
						message: "Платёжный шлюз не сконфигурирован",
					});
				}
				request.log.error(err, "Sberbank API Error checking status");
				return reply.status(502).send({
					error: "PaymentGatewayError",
					message: "Не удалось получить статус от шлюза",
				});
			}
		},
	);

	// Webhook Callback. Вызывается Сбербанком (без токена Bearer).
	// Мы игнорируем любые параметры статуса из хука, используя его лишь как
	// триггер для самостоятельного запроса getOrderStatusExtended.
	app.get("/api/sberbank/callback", async (request, reply) => {
		const query = request.query as { mdOrder?: string; orderNumber?: string };
		const mdOrder = query.mdOrder;
		const orderNumber = query.orderNumber;

		if (!mdOrder && !orderNumber) {
			return reply.status(400).send({ error: "Missing order parameters" });
		}

		try {
			const [transaction] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					mdOrder
						? eq(sberbankTransactions.orderId, mdOrder)
						: eq(sberbankTransactions.id, orderNumber!)
				)
				.limit(1);

			if (!transaction) {
				return reply.status(404).send({ error: "Transaction not found" });
			}

			await processSberbankTransaction(transaction.organizationId, transaction.id);
			return reply.send({ success: true });
		} catch (err) {
			request.log.error(err, "Sberbank Callback Error");
			return reply.status(500).send({ error: "Internal Callback Processing Error" });
		}
	});

	// Support Sberbank POST webhooks as well
	app.post("/api/sberbank/callback", async (request, reply) => {
		// Some Acquiring gateways send parameters as url-encoded body, some as JSON
		const body = request.body as Record<string, string> | undefined;
		const query = request.query as Record<string, string> | undefined;

		const mdOrder = body?.mdOrder || query?.mdOrder;
		const orderNumber = body?.orderNumber || query?.orderNumber;

		if (!mdOrder && !orderNumber) {
			return reply.status(400).send({ error: "Missing order parameters" });
		}

		try {
			const [transaction] = await db
				.select()
				.from(sberbankTransactions)
				.where(
					mdOrder
						? eq(sberbankTransactions.orderId, mdOrder)
						: eq(sberbankTransactions.id, orderNumber!)
				)
				.limit(1);

			if (!transaction) {
				return reply.status(404).send({ error: "Transaction not found" });
			}

			await processSberbankTransaction(transaction.organizationId, transaction.id);
			return reply.send({ success: true });
		} catch (err) {
			request.log.error(err, "Sberbank Callback Error");
			return reply.status(500).send({ error: "Internal Callback Processing Error" });
		}
	});
}
