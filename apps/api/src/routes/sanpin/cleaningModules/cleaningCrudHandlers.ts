/**
 * apps/api/src/routes/sanpin/cleaningModules/cleaningCrudHandlers.ts
 * CRUD обработчики журнала генеральных уборок и дезинфекции.
 * Мандат 8b: строго <= 120 строк.
 */

import { createGeneralCleaningLogDtoSchema } from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { generalCleaningLogs, users } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetCleaning(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"cleaning read",
	);
	if (!organizationId) return;

	const logs = await db
		.select({
			id: generalCleaningLogs.id,
			organizationId: generalCleaningLogs.organizationId,
			cleaningType: generalCleaningLogs.cleaningType,
			scheduledDate: generalCleaningLogs.scheduledDate,
			actualDateTime: generalCleaningLogs.actualDateTime,
			roomName: generalCleaningLogs.roomName,
			treatedAreaM2: generalCleaningLogs.treatedAreaM2,
			disinfectantName: generalCleaningLogs.disinfectantName,
			activeIngredient: generalCleaningLogs.activeIngredient,
			solutionConcentrationPercent: generalCleaningLogs.solutionConcentrationPercent,
			applicationMethod: generalCleaningLogs.applicationMethod,
			exposureTimeMinutes: generalCleaningLogs.exposureTimeMinutes,
			uvIrradiationMinutes: generalCleaningLogs.uvIrradiationMinutes,
			ventilationMinutes: generalCleaningLogs.ventilationMinutes,
			operatorId: generalCleaningLogs.operatorId,
			operatorName: users.fullName,
			inspectorId: generalCleaningLogs.inspectorId,
			status: generalCleaningLogs.status,
			notes: generalCleaningLogs.notes,
			createdAt: generalCleaningLogs.createdAt,
		})
		.from(generalCleaningLogs)
		.leftJoin(users, eq(users.id, generalCleaningLogs.operatorId))
		.where(eq(generalCleaningLogs.organizationId, organizationId))
		.orderBy(desc(generalCleaningLogs.scheduledDate), desc(generalCleaningLogs.actualDateTime));

	return logs.map((l) => ({
		...l,
		treatedAreaM2: Number(l.treatedAreaM2),
		solutionConcentrationPercent: Number(l.solutionConcentrationPercent),
	}));
}

export async function handlePostCleaning(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"cleaning create",
	);
	if (!organizationId) return;

	const parsed = createGeneralCleaningLogDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры генеральной уборки.",
		});
	}
	const data = parsed.data;

	const [log] = await db
		.insert(generalCleaningLogs)
		.values({
			organizationId,
			cleaningType: data.cleaningType,
			scheduledDate: data.scheduledDate,
			actualDateTime: new Date(data.actualDateTime),
			roomName: data.roomName,
			treatedAreaM2: String(data.treatedAreaM2),
			disinfectantName: data.disinfectantName,
			activeIngredient: data.activeIngredient ?? null,
			solutionConcentrationPercent: String(data.solutionConcentrationPercent),
			applicationMethod: data.applicationMethod,
			exposureTimeMinutes: data.exposureTimeMinutes,
			uvIrradiationMinutes: data.uvIrradiationMinutes,
			ventilationMinutes: data.ventilationMinutes,
			operatorId: data.operatorId ?? null,
			inspectorId: data.inspectorId ?? null,
			status: data.status,
			notes: data.notes ?? null,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_CLEANING_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}

export async function handleVerifyCleaning(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"cleaning verify",
	);
	if (!organizationId) return;

	const { id } = req.params as { id: string };
	const [updated] = await db
		.update(generalCleaningLogs)
		.set({ status: "verified_by_inspector" })
		.where(
			and(
				eq(generalCleaningLogs.id, id),
				eq(generalCleaningLogs.organizationId, organizationId),
			),
		)
		.returning();

	return updated;
}
