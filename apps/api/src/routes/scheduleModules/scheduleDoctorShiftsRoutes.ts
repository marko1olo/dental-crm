import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	detectCrossBranchScheduleCollisions,
	type DoctorBranchShift,
} from "@dental/shared";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx, withTenantWriteCtx } from "../../db/rls.js";
import {
	clinics,
	doctorShiftRosters,
	urgentScheduleRequests,
} from "../../db/schema.js";
import {
	requireScheduleMutationContext,
	requireScheduleReadContext,
} from "../scheduleAuthGuard.js";
import { extractIdempotencyKey, isValidUuid } from "../../utils/httpIdempotency.js";
import {
	DEFAULT_CLINIC_TIME_ZONE,
	clinicTimeZone,
} from "../../services/reports/managerReports/timezone.js";

function formatDoctorShiftDateInTimeZone(date: Date, timeZone: string): string {
	try {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date);
	} catch {
		return new Intl.DateTimeFormat("en-CA", {
			timeZone: DEFAULT_CLINIC_TIME_ZONE,
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		}).format(date);
	}
}

const urgentRequestParamsSchema = z.object({
	id: z.string().uuid("Некорректный UUID экстренного запроса"),
});

const scheduleShiftsQuerySchema = z
	.object({
		clinicId: z.string().uuid("Некорректный UUID филиала (clinicId)").optional(),
		branchId: z.string().uuid("Некорректный UUID филиала (branchId)").optional(),
	})
	.strict();

const scheduleShiftsSchema = z
	.object({
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
					protocolHash: z.string().optional(),
					signedAtIso: z.string().optional(),
					signedAppointmentIds: z.array(z.string()).optional(),
					appointments: z.array(z.unknown()).optional(),
				})
				.strict(),
		),
		dateIso: z.string().optional(),
		replaceAll: z.boolean().optional(),
	})
	.strict();

/**
 * Управление графиками смен врачей, учет подмен,
 * экстренные запросы на добавление в расписание (urgentScheduleRequests).
 */
export async function registerScheduleDoctorShiftsRoutes(app: FastifyInstance) {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/schedule/urgent-schedule-requests",
		permission: "public",
		handler: async ({ request, reply }) => {
			const auth = await requireScheduleReadContext(request, reply);
			if (!auth) return reply;
			const orgId = auth.organizationId;

			const requests = await withTenantReadCtx(orgId, async (tx) =>
				tx
					.select()
					.from(urgentScheduleRequests)
					.where(
						and(
							eq(urgentScheduleRequests.organizationId, orgId),
							eq(urgentScheduleRequests.isResolved, false),
						),
					)
					.orderBy(asc(urgentScheduleRequests.createdAt)),
			);

			return reply.code(200).send(requests);
		},
	});

	defineStreamRoute(app, {
		method: "PATCH",
		path: "/api/schedule/urgent-schedule-requests/:id/resolve",
		permission: "public",
		handler: async ({ request, reply }) => {
			const auth = await requireScheduleMutationContext(
				request,
				reply,
				"urgent schedule request resolve",
			);
			if (!auth) return reply;
			const orgId = auth.organizationId;

			const parsedParams = urgentRequestParamsSchema.safeParse(request.params);
			if (!parsedParams.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректный ID экстренного запроса.",
				});
			}
			const { id } = parsedParams.data;

			await withTenantWriteCtx(orgId, async (tx) => {
				await tx
					.update(urgentScheduleRequests)
					.set({ isResolved: true })
					.where(
						and(
							eq(urgentScheduleRequests.id, id),
							eq(urgentScheduleRequests.organizationId, orgId),
						),
					);
			});

			return reply.code(200).send({ success: true });
		},
	});

	defineStreamRoute(app, {
		method: "GET",
		path: "/api/schedule/shifts",
		permission: "public",
		handler: async ({ request: req, reply }) => {
			const auth = await requireScheduleReadContext(req, reply);
			if (!auth) return reply;
			const orgId = auth.organizationId;

			const parsedQuery = scheduleShiftsQuerySchema.safeParse(req.query ?? {});
			if (!parsedQuery.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message:
						parsedQuery.error.issues[0]?.message ??
						"Некорректные параметры фильтрации смен (ожидается UUID).",
				});
			}
			const queryClinicId = parsedQuery.data.clinicId || parsedQuery.data.branchId;

			const condition = queryClinicId
				? and(
						eq(doctorShiftRosters.organizationId, orgId),
						eq(doctorShiftRosters.clinicId, queryClinicId),
					)
				: eq(doctorShiftRosters.organizationId, orgId);

			const rows = await withTenantReadCtx(orgId, async (tx) =>
				tx
					.select()
					.from(doctorShiftRosters)
					.where(condition),
			);

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
		},
	});

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/schedule/shifts",
		permission: "public",
		handler: async ({ request: req, reply }) => {
		const auth = await requireScheduleMutationContext(
			req,
			reply,
			"schedule shifts update",
		);
		if (!auth) return reply;
		const orgId = auth.organizationId;

		const rawIdempotencyKey = extractIdempotencyKey(req);
		const idempotencyKey =
			typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim().length > 0
				? rawIdempotencyKey.trim()
				: undefined;

		if (idempotencyKey) {
			if (!isValidUuid(idempotencyKey)) {
				return reply.code(400).send({
					error: "InvalidIdempotencyKey",
					message: "Некорректный заголовок Idempotency-Key (ожидается UUID).",
				});
			}

			reply.header("Idempotency-Key", idempotencyKey);
		}

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

		const outcome = await withTenantWriteCtx(orgId, async (tx) => {
			// Загрузка названий филиалов для понятных сообщений об ошибках коллизий
			const clinicRows = await tx
				.select({ id: clinics.id, name: clinics.name })
				.from(clinics)
				.where(eq(clinics.organizationId, orgId));
			const branchMap = new Map<string, string>(clinicRows.map((c) => [c.id, c.name]));

			const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_CLINIC_TIME_ZONE;
			const todayDateStr = formatDoctorShiftDateInTimeZone(new Date(), zone);

			// Проверка кросс-филиальных коллизий смен врача (Мандат Домена 30)
			const shiftsToCheck: DoctorBranchShift[] = shifts.map((s) => {
				const resolvedDate = s.dateIso || s.shiftDateIso || dateIso || todayDateStr;
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
				const existingOtherShifts = await tx
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
				return {
					kind: "collision" as const,
					collisions: collisionReport.collisions,
				};
			}

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
				return { kind: "ok" as const };
			}

			if (shifts.length > 0) {
				const now = new Date();
				const nowDateStr = formatDoctorShiftDateInTimeZone(now, zone);
				await tx.insert(doctorShiftRosters).values(
					shifts.map((s) => {
						const resolvedDate = s.dateIso || s.shiftDateIso || nowDateStr;
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

			return { kind: "ok" as const };
		});

		if (outcome.kind === "collision") {
			return reply.code(409).send({
				error: "ScheduleCollisionError",
				message:
					outcome.collisions[0]?.messageRu ||
					"Обнаружена коллизия смен врача между филиалами клиники.",
				collisions: outcome.collisions,
			});
		}

		return reply.send({ ok: true, savedCount: shifts.length });
		},
	});
}
