import { randomUUID } from "node:crypto";
import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	doctorShiftRosters,
	urgentScheduleRequests,
} from "../../db/schema.js";
import {
	requireClinicOrganizationId,
	requireScheduleMutationAccess,
} from "../scheduleAuthGuard.js";

const scheduleShiftsSchema = z.object({
	shifts: z.array(
		z
			.object({
				id: z.string(),
				doctorId: z.string(),
				doctorName: z.string(),
				cabinetId: z.string(),
				chairId: z.string(),
				dateIso: z.string(),
				startTime: z.string(),
				endTime: z.string(),
			})
			.passthrough(),
	),
});

/**
 * Управление графиками смен врачей, учет подмен,
 * экстренные запросы на добавление в расписание (urgentScheduleRequests).
 */
export async function registerScheduleDoctorShiftsRoutes(app: FastifyInstance) {
	app.get("/api/schedule/urgent-schedule-requests", async (request, reply) => {
		const orgId = await requireOrganizationContext(request, reply);
		if (!orgId) return reply;

		const requests = await db
			.select()
			.from(urgentScheduleRequests)
			.where(
				and(
					eq(urgentScheduleRequests.organizationId, orgId),
					eq(urgentScheduleRequests.isResolved, false),
				),
			)
			.orderBy(asc(urgentScheduleRequests.createdAt));

		return reply.code(200).send(requests);
	});

	app.patch(
		"/api/schedule/urgent-schedule-requests/:id/resolve",
		async (request, reply) => {
			if (!(await requireScheduleMutationAccess(request, reply))) return;
			const orgId = await requireOrganizationContext(request, reply);
			if (!orgId) return reply;

			const params = request.params as { id: string };

			await db
				.update(urgentScheduleRequests)
				.set({ isResolved: true })
				.where(
					and(
						eq(urgentScheduleRequests.id, params.id),
						eq(urgentScheduleRequests.organizationId, orgId),
					),
				);

			return reply.code(200).send({ success: true });
		},
	);

	app.get("/api/schedule/shifts", async (req, reply) => {
		const orgId =
			(await requireOrganizationContext(req, reply)) ||
			requireClinicOrganizationId(req, reply) ||
			DEMO_SHOWCASE_ORG_ID;
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
	});

	app.post("/api/schedule/shifts", async (req, reply) => {
		if (!(await requireScheduleMutationAccess(req, reply, "schedule shifts update"))) return;
		const orgId =
			(await requireOrganizationContext(req, reply)) ||
			requireClinicOrganizationId(req, reply) ||
			DEMO_SHOWCASE_ORG_ID;
		const parsed = scheduleShiftsSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура смен врачей (поле shifts обязательно).",
			});
		}
		const { shifts } = parsed.data;
		const rawObj = (req.body && typeof req.body === "object" ? req.body : {}) as Record<string, unknown>;
		const explicitDate = typeof rawObj.dateIso === "string" ? rawObj.dateIso.trim() : "";
		const targetDates = Array.from(
			new Set([...shifts.map((s) => s.dateIso), explicitDate].filter(Boolean)),
		);

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
						role: (s as any).role || null,
						specialty: (s as any).specialty || null,
						updatedAt: new Date(),
					})),
				);
			}
		});

		return reply.send({ ok: true, savedCount: shifts.length });
	});
}
