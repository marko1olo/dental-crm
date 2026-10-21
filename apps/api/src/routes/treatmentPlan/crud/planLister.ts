import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../../db/client.js";
import { treatmentPlans } from "../../../db/schema.js";
import { listTreatmentPlansQuerySchema } from "./schemas.js";

export async function handleListTreatmentPlans(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
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

	const plans = await db
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
			discountMode: treatmentPlans.discountMode,
			planDiscountPercent: treatmentPlans.planDiscountPercent,
			planDiscountRub: treatmentPlans.planDiscountRub,
			createdAt: treatmentPlans.createdAt,
			updatedAt: treatmentPlans.updatedAt,
			approvedAt: treatmentPlans.approvedAt,
		})
		.from(treatmentPlans)
		.where(and(...conditions))
		.orderBy(desc(treatmentPlans.createdAt))
		.limit(limit)
		.offset(offset);

	return reply.code(200).send({
		success: true,
		plans,
		totalCount: plans.length,
	});
}
