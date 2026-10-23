/**
 * apps/api/src/routes/sanpin/sterilizationModules/handlers/psoLogHandlers.ts
 *
 * Журнал контроля качества предстерилизационной очистки (азопирам и фенолфталеин).
 * Мандат 8b: строго <= 120 строк.
 */

import { SanPiNSterilizationEngine, createPsoCleaningLogSchema } from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../../accessGuard.js";
import { db } from "../../../../db/client.js";
import { preSterilizationCleaningLogs, users } from "../../../../db/schema.js";

export async function handleGetPsoTests(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "read pso tests");
	if (!organizationId) return;

	return db
		.select({
			id: preSterilizationCleaningLogs.id,
			organizationId: preSterilizationCleaningLogs.organizationId,
			testType: preSterilizationCleaningLogs.testType,
			batchItemCount: preSterilizationCleaningLogs.batchItemCount,
			testedSampleCount: preSterilizationCleaningLogs.testedSampleCount,
			isAzopyramNegative: preSterilizationCleaningLogs.isAzopyramNegative,
			isPhenolphthaleinNegative: preSterilizationCleaningLogs.isPhenolphthaleinNegative,
			isBatchApproved: preSterilizationCleaningLogs.isBatchApproved,
			detergentBrand: preSterilizationCleaningLogs.detergentBrand,
			rejectionReason: preSterilizationCleaningLogs.rejectionReason,
			operatorId: preSterilizationCleaningLogs.operatorId,
			operatorName: users.fullName,
			notes: preSterilizationCleaningLogs.notes,
			timestamp: preSterilizationCleaningLogs.timestamp,
			createdAt: preSterilizationCleaningLogs.createdAt,
		})
		.from(preSterilizationCleaningLogs)
		.leftJoin(users, eq(users.id, preSterilizationCleaningLogs.operatorId))
		.where(eq(preSterilizationCleaningLogs.organizationId, organizationId))
		.orderBy(desc(preSterilizationCleaningLogs.timestamp));
}

export async function handleCreatePsoTest(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization pso test");
	if (!organizationId) return;

	const parsed = createPsoCleaningLogSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные параметры контроля очистки.",
			details: parsed.error.format(),
		});
	}
	const data = parsed.data;
	const evaluation = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(
		data.batchItemCount,
		data.testedSampleCount,
		data.isAzopyramNegative,
		data.isPhenolphthaleinNegative,
	);

	const [log] = await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: data.testType,
			batchItemCount: data.batchItemCount,
			testedSampleCount: data.testedSampleCount,
			isAzopyramNegative: data.isAzopyramNegative,
			isPhenolphthaleinNegative: data.isPhenolphthaleinNegative,
			isBatchApproved: evaluation.isBatchApproved,
			detergentBrand: data.detergentBrand ?? null,
			rejectionReason: evaluation.rejectionReason,
			operatorId: data.operatorId ?? null,
			notes: data.notes ?? null,
			timestamp: new Date(),
		})
		.returning();

	return reply.code(201).send({ success: true, log, evaluation });
}

export async function handlePsoQuickNorm(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "sterilization pso quick norm");
	if (!organizationId) return;

	const body = (req.body as any) || {};
	const batchItemCount = typeof body.batchItemCount === "number" ? body.batchItemCount : 100;
	const testedSampleCount = typeof body.testedSampleCount === "number" ? body.testedSampleCount : Math.max(3, Math.ceil(batchItemCount * 0.01));
	const detergentBrand = body.detergentBrand || "Биолот 0.5% + Аламинол 1%";
	const notes = body.notes || "[Предстерилизационная очистка] Азопирамовая и фенолфталеиновая пробы отрицательные, норма. Допущено к автоклавированию.";

	const evaluation = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(batchItemCount, testedSampleCount, true, true);

	const [log] = await db
		.insert(preSterilizationCleaningLogs)
		.values({
			organizationId,
			testType: "both",
			batchItemCount,
			testedSampleCount,
			isAzopyramNegative: true,
			isPhenolphthaleinNegative: true,
			isBatchApproved: true,
			detergentBrand,
			rejectionReason: null,
			operatorId: body.operatorId ?? null,
			notes,
			timestamp: new Date(),
		})
		.returning();

	return reply.code(201).send({
		success: true,
		log,
		evaluation,
		indicators: { azopyram: "negative_norm", phenolphthalein: "negative_norm" },
	});
}
