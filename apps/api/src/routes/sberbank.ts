import { eq, and } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db/client.js";
import { sberbankTransactions } from "../db/schema.js";
import { requirePermission } from "../security/permissions.js";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../accessGuard.js";

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

			const _req = request as unknown as Record<string, unknown>;
			const organizationId = _req.tenantId as string;
			if (!organizationId) {
				return reply.status(403).send({ error: "No organization context" });
			}

			const { patientId, amount } = request.body as {
				patientId: string;
				amount: number;
			};

			// Simulate external API call
			const orderId = `SBER-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

			try {
				// We assume there's an external Sberbank API: /payment/rest/register.do
				// For the sake of the task, we store the transaction in pending state.
				await db.insert(sberbankTransactions).values({
					organizationId,
					orderId,
					amount,
					status: "pending",
					patientId,
				});

				return { success: true, orderId };
			} catch (err) {
				return reply.status(500).send({ error: "Failed to initiate payment" });
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

			// Simulate external Sberbank API: /payment/rest/getOrderStatusExtended.do
			if (transaction.status === "pending") {
				await db
					.update(sberbankTransactions)
					.set({ status: "success", updatedAt: new Date() })
					.where(eq(sberbankTransactions.orderId, orderId));
				transaction.status = "success";
			}

			return {
				success: true,
				status: transaction.status,
				amount: transaction.amount,
			};
		},
	);
}
