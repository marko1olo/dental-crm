import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireOrganizationId } from "../../security/identity.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { bonusTransactions } from "../../db/schema.js";
import { redeemPointsBodySchema } from "./loyaltySchemas.js";
import { executeBonusRedeem } from "./bonusRedemptionService.js";

export async function registerLoyaltyLedgerRoutes(app: FastifyInstance) {
	app.get("/api/loyalty/transactions/:patientId", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const { patientId } = request.params as { patientId: string };

		return withTenantCtx(orgId, async () => {
			const rows = await db
				.select()
				.from(bonusTransactions)
				.where(and(eq(bonusTransactions.organizationId, orgId), eq(bonusTransactions.patientId, patientId)))
				.orderBy(desc(bonusTransactions.createdAt))
				.limit(100);

			return reply.send({
				patientId,
				transactions: rows.map((r) => ({
					id: r.id,
					amountPoints: Number(r.amountPoints),
					balanceAfterPoints: Number(r.balanceAfterPoints),
					type: r.type,
					description: r.description,
					expiresAt: r.expiresAt?.toISOString() || null,
					createdAt: r.createdAt.toISOString(),
				})),
			});
		});
	});

	app.post("/api/loyalty/redeem", async (request, reply) => {
		const orgId = requireOrganizationId(request, reply);
		if (!orgId) return;
		const parsed = redeemPointsBodySchema.safeParse(request.body);
		if (!parsed.success) return reply.status(400).send({ message: "Некорректные параметры списания", errors: parsed.error.format() });

		return withTenantCtx(orgId, async () => {
			const res = await executeBonusRedeem({ orgId, ...parsed.data });
			if ("notFound" in res) return reply.status(404).send({ message: "Пациент не найден" });
			if ("invalidInvoice" in res) return reply.status(res.code ?? 400).send({ message: res.message });
			if ("limitExceeded" in res) return reply.status(400).send({ message: `Превышен лимит (${res.maxAllowedPoints} б.)`, maxAllowedPoints: res.maxAllowedPoints });
			if ("insufficientPoints" in res) return reply.status(400).send({ message: `Недостаточно баллов (${res.activePoints})`, activePoints: res.activePoints });
			return reply.status(200).send(res);
		});
	});
}
