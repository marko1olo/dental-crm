import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	detectCrossBranchScheduleCollisions,
	type DoctorBranchShift,
} from "@dental/shared";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	clinics,
	doctorShiftRosters,
	urgentScheduleRequests,
} from "../../db/schema.js";
import {
	requireClinicOrganizationId,
	requireScheduleMutationAccess,
} from "../scheduleAuthGuard.js";

const urgentRequestParamsSchema = z.object({
	id: z.string().min(1),
});

const scheduleShiftsSchema = z.object({
	shifts: z.array(
		z
			.object({
				id: z.string().optional(),
				clinicId: z.string().nullable().optional(),
				branchId: z.string().nullable().optional(),
				doctorId: z.string(),
				doctorName: z.string(),
				cabinetId: z.string().nullable().optional(),
				chairId: z.string().nullable().optional(),
				dateIso: z.string().optional(),
				shiftDateIso: z.string().optional(),
				startTime: z.string().optional(),
				endTime: z.string().optional(),
				role: z.string().nullable().optional(),
				doctorRole: z.string().nullable().optional(),
				specialty: z.string().nullable().optional(),
			})
			.passthrough(),
	),
	dateIso: z.string().optional(),
	replaceAll: z.boolean().optional(),
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

			const parsedParams = urgentRequestParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный ID экстренного запроса.",
				});
			}
			const { id } = parsedParams.data;

			await db
				.update(urgentScheduleRequests)
				.set({ isResolved: true })
				.where(
					and(
						eq(urgentScheduleRequests.id, id),
						eq(urgentScheduleRequests.organizationId, orgId),
					),
				);

			return reply.code(200).send({ success: true });
		},
	);

	app.get("/api/schedule/shifts", async (req, reply) => {
		const orgId =
			(await requireOrganizationContext(req, reply)) ||
			requireClinicOrganizationId(req, reply);
		if (!orgId) return;

		const queryClinicId =
			(req.query as { clinicId?: string; branchId?: string })?.clinicId ||
			(req.query as { clinicId?: string; branchId?: string })?.branchId;

		const condition = queryClinicId
			? and(
					eq(doctorShiftRosters.organizationId, orgId),
					eq(doctorShiftRosters.clinicId, queryClinicId),
				)
			: eq(doctorShiftRosters.organizationId, orgId);

		const rows = await db
			.select()
			.from(doctorShiftRosters)
			.where(condition);

		const shifts = rows.map((s) => ({
			id: s.id,
			clinicId: s.clinicId ?? null,
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
			requireClinicOrganizationId(req, reply);
		if (!orgId) return;
		const parsed = scheduleShiftsSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректная структура смен врачей (поле shifts обязательно).",
			});
		}
		const { shifts, dateIso, replaceAll } = parsed.data;
		const explicitDate = typeof dateIso === "string" ? dateIso.trim() : "";
		const targetDates = Array.from(
			new Set([...shifts.map((s) => s.dateIso || s.shiftDateIso || ""), explicitDate].filter((d): d is string => Boolean(d))),
		);

		// Загрузка названий филиалов для понятных сообщений об ошибках коллизий
		const clinicRows = await db
			.select({ id: clinics.id, name: clinics.name })
			.from(clinics)
			.where(eq(clinics.organizationId, orgId));
		const branchMap = new Map<string, string>(clinicRows.map((c) => [c.id, c.name]));

		// Проверка кросс-филиальных коллизий смен врача (Мандат Домена 30)
		const shiftsToCheck: DoctorBranchShift[] = shifts.map((s) => {
			const resolvedDate = s.dateIso || s.shiftDateIso || dateIso || new Date().toISOString().split("T")[0]!;
			const bId = s.clinicId || s.branchId || "default";
			return {
				id: s.id || randomUUID(),
				doctorId: s.doctorId,
				doctorName: s.doctorName,
				organizationId: orgId,
				branchId: bId,
				branchName: branchMap.get(bId) || `Отделение ${bId}`,
				cabinetId: s.cabinetId || undefined,
				shiftDate: String(resolvedDate),
				startTime: s.startTime || "08:00",
				endTime: s.endTime || "20:00",
			};
		});

		// Если не глобальная перезапись, учитываем существующие смены врача в других филиалах
		const doctorIds = Array.from(new Set(shifts.map((s) => s.doctorId)));
		if (doctorIds.length > 0 && targetDates.length > 0 && replaceAll !== true) {
			const existingOtherShifts = await db
				.select()
				.from(doctorShiftRosters)
				.where(
					and(
						eq(doctorShiftRosters.organizationId, orgId),
						inArray(doctorShiftRosters.doctorId, doctorIds),
						inArray(doctorShiftRosters.dateIso, targetDates),
					),
				);
			for (const ex of existingOtherShifts) {
				if (!shifts.some((s) => s.id === ex.id)) {
					const bId = ex.clinicId || "default";
					shiftsToCheck.push({
						id: ex.id,
						doctorId: ex.doctorId,
						doctorName: ex.doctorName,
						organizationId: orgId,
						branchId: bId,
						branchName: branchMap.get(bId) || `Отделение ${bId}`,
						cabinetId: ex.cabinetId || undefined,
						shiftDate: ex.dateIso,
						startTime: ex.startTime,
						endTime: ex.endTime,
					});
				}
			}
		}

		const collisionReport = detectCrossBranchScheduleCollisions(shiftsToCheck, 30);
		if (collisionReport.hasCollisions) {
			return reply.code(409).send({
				error: "ScheduleCollisionError",
				message:
					collisionReport.collisions[0]?.messageRu ||
					"Обнаружена коллизия смен врача между филиалами клиники.",
				collisions: collisionReport.collisions,
			});
		}

		await db.transaction(async (tx) => {
			if (replaceAll === true) {
				// Явный флаг глобальной перезаписи смен клиники
				await tx.delete(doctorShiftRosters).where(eq(doctorShiftRosters.organizationId, orgId));
			} else if (targetDates.length > 0) {
				// Точечное удаление смен строго за указанные даты
				await tx.delete(doctorShiftRosters).where(
					and(
						eq(doctorShiftRosters.organizationId, orgId),
						inArray(doctorShiftRosters.dateIso, targetDates),
					),
				);
			} else {
				// Защита от потери данных: без replaceAll и без дат ничего глобально не удаляем
				return;
			}

			if (shifts.length > 0) {
				const now = new Date();
				await tx.insert(doctorShiftRosters).values(
					shifts.map((s) => {
						const resolvedDate = s.dateIso || s.shiftDateIso || now.toISOString().split("T")[0]!;
						return {
							id: s.id || randomUUID(),
							organizationId: orgId,
							clinicId: s.clinicId || s.branchId || null,
							doctorId: s.doctorId,
							doctorName: s.doctorName,
							cabinetId: s.cabinetId || null,
							chairId: s.chairId || null,
							dateIso: String(resolvedDate),
							startTime: s.startTime || "08:00",
							endTime: s.endTime || "20:00",
							role: s.role ? String(s.role) : s.doctorRole ? String(s.doctorRole) : null,
							specialty: s.specialty ? String(s.specialty) : null,
							updatedAt: now,
						};
					}),
				);
			}
		});

		return reply.send({ ok: true, savedCount: shifts.length });
	});
}
