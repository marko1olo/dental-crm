import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { doctorShiftRosters } from "../../../db/schema.js";
import { shiftsPayloadSchema } from "../types.js";

/**
 * Смены врачей (сетка кресел). Гард по образцу соседних diary-хендлеров:
 * чтение — requireClinicalReadAccess, запись — requireClinicalMutationAccess,
 * организация — только из подписанного токена (requireResolvedOrganizationId).
 * Раньше здесь был молчаливый фолбэк на демо-организацию: любой запрос без
 * авторизации получал сетку смен витринной демо-клиники. Теперь нет токена — 401.
 */
export async function handleDoctorShiftsGet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalReadAccess(req, reply, "read doctor shifts"))) return;
	const orgId = await requireResolvedOrganizationId(req, reply, "read doctor shifts");
	if (!orgId) return;

	const rows = await db
		.select()
		.from(doctorShiftRosters)
		.where(eq(doctorShiftRosters.organizationId, orgId));

	const shifts = rows.map((s) => ({
		id: s.id,
		doctorId: s.doctorId,
		doctorName: s.doctorName,
		cabinetId: s.cabinetId ?? "",
		chairId: s.chairId ?? "",
		dateIso: s.dateIso,
		startTime: s.startTime,
		endTime: s.endTime,
		role: s.role ?? undefined,
		specialty: s.specialty ?? undefined,
	}));

	return reply.send({ ok: true, shifts });
}

export async function handleDoctorShiftsPost(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalMutationAccess(req, reply, "save doctor shifts"))) return;
	const orgId = await requireResolvedOrganizationId(req, reply, "save doctor shifts");
	if (!orgId) return;

	const parsed = shiftsPayloadSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректная структура смен врачей (поле shifts обязательно).",
		});
	}
	const { shifts } = parsed.data;
	const rawObj = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
	const explicitDate = typeof rawObj.dateIso === "string" ? rawObj.dateIso.trim() : "";
	const targetDates = Array.from(new Set([...shifts.map((s) => s.dateIso), explicitDate].filter(Boolean)));

	await db.transaction(async (tx) => {
		const deleteCond =
			rawObj.replaceAll !== true && targetDates.length > 0
				? and(eq(doctorShiftRosters.organizationId, orgId), inArray(doctorShiftRosters.dateIso, targetDates))
				: eq(doctorShiftRosters.organizationId, orgId);
		await tx.delete(doctorShiftRosters).where(deleteCond);

		if (shifts.length > 0) {
			await tx.insert(doctorShiftRosters).values(
				shifts.map((s) => ({
					id: s.id || randomUUID(),
					organizationId: orgId,
					doctorId: s.doctorId,
					doctorName: s.doctorName,
					cabinetId: s.cabinetId || null,
					chairId: s.chairId || null,
					dateIso: s.dateIso,
					startTime: s.startTime,
					endTime: s.endTime,
					role: (s as Record<string, unknown>).role ? String((s as Record<string, unknown>).role) : null,
					specialty: (s as Record<string, unknown>).specialty ? String((s as Record<string, unknown>).specialty) : null,
					updatedAt: new Date(),
				})),
			);
		}
	});

	return reply.send({ ok: true, savedCount: shifts.length });
}
