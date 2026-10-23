import { randomUUID } from "node:crypto";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { doctorShiftRosters } from "../../../db/schema.js";
import { shiftsPayloadSchema } from "../types.js";

export async function handleDoctorShiftsGet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	const orgId = (await resolveOrganizationId(req)) || DEMO_SHOWCASE_ORG_ID;

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
	const orgId = (await resolveOrganizationId(req)) || DEMO_SHOWCASE_ORG_ID;
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
