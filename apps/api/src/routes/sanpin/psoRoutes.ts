import {
	SanPiNRegulatoryEngine,
	createPsoCleaningLogDtoSchema,
} from "@dental/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { preSterilizationCleaningLogs, users } from "../../db/schema.js";
import { wsBroker } from "../../services/websocketBroker.js";

export function registerSanpinPsoRoutes(app: FastifyInstance) {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. ЖУРНАЛ ПСО (ФОРМА № 366/у)
	// ─────────────────────────────────────────────────────────────────────────

	app.get("/api/registers/pso", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso read",
		);
		if (!organizationId) return;

		const logs = await db
			.select({
				id: preSterilizationCleaningLogs.id,
				organizationId: preSterilizationCleaningLogs.organizationId,
				instrumentName: sql<string>`coalesce(nullif(pre_sterilization_cleaning_logs.notes, ''), 'Стоматологический инструментарий')`,
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

		return logs;
	});

	app.post("/api/registers/pso", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso create",
		);
		if (!organizationId) return;

		const parsed = createPsoCleaningLogDtoSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: parsed.error.issues[0]?.message ?? "Некорректные параметры ПСО.",
			});
		}
		const data = parsed.data;

		const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
			data.batchItemCount,
			data.testedSampleCount,
			data.isAzopyramNegative,
			data.isPhenolphthaleinNegative,
			data.isSudanNegative ?? true,
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
				notes: data.notes
					? `${data.instrumentName} | ${data.notes}`
					: data.instrumentName,
				timestamp: new Date(),
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_PSO_ADDED",
			payload: log,
		});

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
		});
	});

	app.post("/api/registers/pso/quick-norm", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso quick norm",
		);
		if (!organizationId) return;

		const body = (req.body as any) || {};
		const batchItemCount = typeof body.batchItemCount === "number" ? body.batchItemCount : 100;
		const testedSampleCount =
			typeof body.testedSampleCount === "number"
				? body.testedSampleCount
				: Math.max(3, Math.ceil(batchItemCount * 0.01));
		const detergentBrand = body.detergentBrand || "Биолот 0.5% + Аламинол 1%";
		const instrumentName =
			body.instrumentName ||
			"Стоматологические боры, наконечники, терапевтические и хирургические наборы (зеркала, зонды, гладилки)";
		const notesText =
			body.notes ||
			"⚡ Азопирамовая проба — 1 клик норма (реакция отрицательная, следов крови и моющих средств не обнаружено по СанПиН 3.3686-21)";

		const evaluation = SanPiNRegulatoryEngine.evaluatePsoSampling(
			batchItemCount,
			testedSampleCount,
			true,
			true,
		);

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
				notes: `${instrumentName} | ${notesText}`,
				timestamp: new Date(),
			})
			.returning();

		wsBroker.broadcastToOrganization(organizationId, {
			type: "SANPIN_PSO_ADDED",
			payload: log,
		});

		return reply.code(201).send({
			success: true,
			log,
			evaluation,
		});
	});

	app.delete("/api/registers/pso/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"pso delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const [deleted] = await db
			.delete(preSterilizationCleaningLogs)
			.where(
				and(
					eq(preSterilizationCleaningLogs.id, id),
					eq(preSterilizationCleaningLogs.organizationId, organizationId),
				),
			)
			.returning();

		if (!deleted) {
			return reply.code(404).send({ error: "NotFound", message: "Запись не найдена" });
		}
		return { success: true, id };
	});
}
