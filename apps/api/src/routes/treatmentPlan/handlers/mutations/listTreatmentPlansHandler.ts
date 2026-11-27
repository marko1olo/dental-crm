import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantReadCtx, type TenantDb } from "../../../../db/rls.js";
import { treatmentPlans } from "../../../../db/schema.js";
import { listTreatmentPlansQuerySchema } from "./schemas.js";

/**
 * listTreatmentPlansHandler.ts — Получение списка планов лечения организации с пагинацией и фильтрами.
 * Мандат 8b/8zi: компактный изолированный модуль запросов.
 */
export async function handleListTreatmentPlans(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
	tx?: TenantDb,
) {
	const parsed = listTreatmentPlansQuerySchema.safeParse(request.query);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры фильтра планов лечения.",
			issues: parsed.error.issues,
		});
	}

	const { patientId, status, limit, offset } = parsed.data;

	const conditions = [eq(treatmentPlans.organizationId, organizationId)];
	if (patientId) {
		conditions.push(eq(treatmentPlans.patientId, patientId));
	}
	if (status) {
		conditions.push(eq(treatmentPlans.status, status));
	}

	const run = async (executor: TenantDb) =>
		executor
			.select({
				id: treatmentPlans.id,
				organizationId: treatmentPlans.organizationId,
				patientId: treatmentPlans.patientId,
				doctorId: treatmentPlans.doctorId,
				name: treatmentPlans.name,
				title: treatmentPlans.title,
				status: treatmentPlans.status,
				totalPriceRub: treatmentPlans.totalPriceRub,
				totalPrice: treatmentPlans.totalPrice,
				totalPriceKopecks: treatmentPlans.totalPriceKopecks,
				discountMode: treatmentPlans.discountMode,
				planDiscountPercent: treatmentPlans.planDiscountPercent,
				planDiscountRub: treatmentPlans.planDiscountRub,
				planDiscountKopecks: treatmentPlans.planDiscountKopecks,
				createdAt: treatmentPlans.createdAt,
				updatedAt: treatmentPlans.updatedAt,
				approvedAt: treatmentPlans.approvedAt,
			})
			.from(treatmentPlans)
			.where(and(...conditions))
			.orderBy(desc(treatmentPlans.createdAt))
			.limit(limit)
			.offset(offset);

	const plans = tx ? await run(tx) : await withTenantReadCtx(organizationId, run);

	return reply.code(200).send({
		success: true,
		plans,
		totalCount: plans.length,
	});
}
