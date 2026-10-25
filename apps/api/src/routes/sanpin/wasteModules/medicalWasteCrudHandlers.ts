/**
 * apps/api/src/routes/sanpin/wasteModules/medicalWasteCrudHandlers.ts
 * CRUD обработчики журнала медицинских отходов.
 * Мандат 8b: строго <= 120 строк.
 */

import { createMedicalWasteLogDtoSchema } from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { medicalWasteLogs, users } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetMedicalWaste(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "waste read");
	if (!organizationId) return;

	const logs = await db
		.select({
			id: medicalWasteLogs.id,
			organizationId: medicalWasteLogs.organizationId,
			operationType: medicalWasteLogs.operationType,
			logDate: medicalWasteLogs.logDate,
			wasteClass: medicalWasteLogs.wasteClass,
			wasteDescription: medicalWasteLogs.wasteDescription,
			packageType: medicalWasteLogs.packageType,
			packageCount: medicalWasteLogs.packageCount,
			weightKg: medicalWasteLogs.weightKg,
			volumeLiters: medicalWasteLogs.volumeLiters,
			disinfectionMethod: medicalWasteLogs.disinfectionMethod,
			disinfectantUsed: medicalWasteLogs.disinfectantUsed,
			disposalCompany: medicalWasteLogs.disposalCompany,
			contractNumber: medicalWasteLogs.contractNumber,
			transferActNumber: medicalWasteLogs.transferActNumber,
			responsibleStaffId: medicalWasteLogs.responsibleStaffId,
			responsibleStaffName: users.fullName,
			notes: medicalWasteLogs.notes,
			createdAt: medicalWasteLogs.createdAt,
		})
		.from(medicalWasteLogs)
		.leftJoin(users, eq(users.id, medicalWasteLogs.responsibleStaffId))
		.where(eq(medicalWasteLogs.organizationId, organizationId))
		.orderBy(desc(medicalWasteLogs.logDate));

	return logs.map((l) => ({
		...l,
		weightKg: Number(l.weightKg),
		volumeLiters: l.volumeLiters ? Number(l.volumeLiters) : null,
	}));
}

export async function handlePostMedicalWaste(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(req, reply, "waste create");
	if (!organizationId) return;

	const parsed = createMedicalWasteLogDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры учета отходов.",
		});
	}
	const data = parsed.data;

	const [log] = await db
		.insert(medicalWasteLogs)
		.values({
			organizationId,
			operationType: data.operationType,
			logDate: new Date(data.logDate),
			wasteClass: data.wasteClass,
			wasteDescription: data.wasteDescription,
			packageType: data.packageType,
			packageCount: data.packageCount,
			weightKg: String(data.weightKg),
			volumeLiters: data.volumeLiters ? String(data.volumeLiters) : null,
			disinfectionMethod: data.disinfectionMethod,
			disinfectantUsed: data.disinfectantUsed ?? null,
			disposalCompany: data.disposalCompany ?? null,
			contractNumber: data.contractNumber ?? null,
			transferActNumber: data.transferActNumber ?? null,
			responsibleStaffId: data.responsibleStaffId ?? null,
			notes: data.notes ?? null,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_WASTE_LOG_ADDED",
		payload: log,
	});

	return reply.code(201).send(log);
}
