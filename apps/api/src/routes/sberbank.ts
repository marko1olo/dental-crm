import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";
import { db } from "../db/client.js";
import { payments, sberbankTransactions } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { SberbankClient } from "../services/sberbankClient.js";

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
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			const orderNumber = crypto.randomUUID();
			const origin = request.headers.origin;
			const returnUrl = origin
				? `${origin}/cabinet`
				: "http://localhost:3000/cabinet";

			try {
				const res = await client.registerOrder(orderNumber, amount, returnUrl);

				if (!res.orderId || !res.formUrl) {
					return reply.status(500).send({
						error: "SberbankError",
						message: res.errorMessage || "Ошибка регистрации заказа в Сбербанке",
					});
				}

				await db.insert(sberbankTransactions).values({
					organizationId,
					patientId,
					orderId: res.orderId,
					amount,
					status: "pending",
				});

				return { success: true, orderId: res.orderId, formUrl: res.formUrl };
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
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
			} catch (error) {
				return reply.status(501).send({
					error: "PaymentGatewayNotConfigured",
					message:
						"Платёжный шлюз Сбербанка не подключён: интеграция отсутствует в сборке.",
				});
			}

			try {
				const sberStatus = await client.getOrderStatusExtended(orderId);
				const code = sberStatus.orderStatus;

				let mappedStatus = "pending";
				if (code === 2) {
					mappedStatus = "success";
				} else if (code === 3 || code === 6) {
					mappedStatus = "failed";
				}

				if (mappedStatus !== transaction.status) {
					await db
						.update(sberbankTransactions)
						.set({ status: mappedStatus, updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.orderId, orderId),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);

					if (
						transaction.status === "pending" &&
						mappedStatus === "success"
					) {
						await db.insert(payments).values({
							organizationId: orgId,
							patientId: transaction.patientId,
							method: "card",
							status: "paid",
							amountRub: transaction.amount / 100,
						});
					}
				}

				return {
					success: true,
					status: mappedStatus,
					amount: transaction.amount,
				};
			} catch (error) {
				return reply.status(500).send({
					error: "SberbankError",
					message: error instanceof Error ? error.message : "Неизвестная ошибка",
				});
			}
		},
	);
}
