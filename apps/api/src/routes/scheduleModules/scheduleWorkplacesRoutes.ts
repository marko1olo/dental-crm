import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { appointments, chairs } from "../../db/schema.js";
import {
	DEFAULT_CLINIC_TIME_ZONE,
	clinicTimeZone,
} from "../../services/reports/managerReports/timezone.js";
import { resolveScheduleDateBounds } from "../appointments/appointmentsQueryRoutes.js";
import { requireClinicOrganizationId } from "../scheduleAuthGuard.js";

function formatDateInTimeZone(date: Date, timeZone: string): string {
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

const scheduleSlotsQuerySchema = z.object({
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
	chairId: z.string().uuid().optional().or(z.literal("")),
	doctorId: z.string().uuid().optional().or(z.literal("")),
});

/**
 * Маршруты рабочих мест (кресел) клиники и сетки слотов расписания.
 * Поддерживает соло-практику по Мандату 8n (1-2 кресла, без бюрократии).
 */
export async function registerScheduleWorkplacesRoutes(app: FastifyInstance) {
	/**
	 * Получение списка рабочих мест (кресел) клиники.
	 * Поддерживает соло-практику: если в клинике <= 1 кресло, возвращает флаг isSoloPractice: true.
	 */
	app.get("/api/schedule/workplaces", async (request, reply) => {
		const orgId =
			(await requireOrganizationContext(request, reply)) ||
			requireClinicOrganizationId(request, reply);
		if (reply.sent) return reply;
		if (!orgId) {
			return reply.code(401).send({
				error: "Unauthorized",
				message: "Не указан контекст организации.",
			});
		}

		const dbChairs = await withTenantCtx(orgId, async (tx) =>
			tx
				.select({
					id: chairs.id,
					name: chairs.name,
					clinicId: chairs.clinicId,
					isActive: chairs.isActive,
					equipment: chairs.equipment,
					specializations: chairs.specializations,
					workingHours: chairs.workingHours,
				})
				.from(chairs)
				.where(
					and(
						eq(chairs.organizationId, orgId),
						eq(chairs.isActive, true),
					),
				)
				.orderBy(asc(chairs.name)),
		);

		const isSoloPractice = dbChairs.length <= 1;

		return reply.send({
			ok: true,
			workplaces: dbChairs,
			count: dbChairs.length,
			isSoloPractice,
			primaryWorkplaceId: dbChairs[0]?.id ?? null,
		});
	});

	/**
	 * Сетка слотов расписания на дату.
	 * Если клиника имеет всего 1 кабинет/кресло, не требует выбора кабинета, а сразу агрегирует слоты дня.
	 */
	app.get("/api/schedule/slots", async (request, reply) => {
		const orgId =
			(await requireOrganizationContext(request, reply)) ||
			requireClinicOrganizationId(request, reply);
		if (reply.sent) return reply;
		if (!orgId) {
			return reply.code(401).send({
				error: "Unauthorized",
				message: "Не указан контекст организации.",
			});
		}

		const parsedQuery = scheduleSlotsQuerySchema.safeParse(request.query ?? {});
		if (!parsedQuery.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фильтрации слотов расписания (ожидается UUID).",
				issues: parsedQuery.error.issues,
			});
		}
		const dateParam = (parsedQuery.data.date || "").trim();
		const chairIdParam = (parsedQuery.data.chairId || "").trim();
		const doctorIdParam = (parsedQuery.data.doctorId || "").trim();

		const now = new Date();
		const { targetDateStr, dbChairs, apptRows, effectiveChairId } = await withTenantCtx(
			orgId,
			async (tx) => {
				const zone = (await clinicTimeZone(orgId, tx)) || DEFAULT_CLINIC_TIME_ZONE;
				const resolvedDateStr = dateParam || formatDateInTimeZone(now, zone);
				const { dayStart, dayEnd } = resolveScheduleDateBounds(resolvedDateStr, zone);

				// Проверяем количество кресел для соло-режима
				const chairsRows = await tx
					.select({ id: chairs.id, name: chairs.name })
					.from(chairs)
					.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)));

				const soloPractice = chairsRows.length <= 1;
				const chosenChairId =
					chairIdParam ||
					(soloPractice && chairsRows.length === 1 && chairsRows[0]?.id
						? chairsRows[0].id
						: undefined);

				// Условия выборки приёмов
				const conditions = [
					eq(appointments.organizationId, orgId),
					gte(appointments.startsAt, dayStart),
					lte(appointments.startsAt, dayEnd),
				];

				if (chosenChairId) {
					conditions.push(eq(appointments.chairId, chosenChairId));
				}
				if (doctorIdParam) {
					conditions.push(eq(appointments.doctorUserId, doctorIdParam));
				}

				const rows = await tx
					.select({
						id: appointments.id,
						patientId: appointments.patientId,
						doctorUserId: appointments.doctorUserId,
						assistantUserId: appointments.assistantUserId,
						chairId: appointments.chairId,
						status: appointments.status,
						startsAt: appointments.startsAt,
						endsAt: appointments.endsAt,
						reason: appointments.reason,
						comment: appointments.comment,
						isOverbooking: appointments.isOverbooking,
					})
					.from(appointments)
					.where(and(...conditions))
					.orderBy(asc(appointments.startsAt));

				return {
					targetDateStr: resolvedDateStr,
					dbChairs: chairsRows,
					apptRows: rows,
					effectiveChairId: chosenChairId,
				};
			},
		);

		const isSoloPractice = dbChairs.length <= 1;

		const slots = apptRows.map((a) => ({
			id: a.id,
			patientId: a.patientId,
			doctorUserId: a.doctorUserId,
			assistantUserId: a.assistantUserId,
			chairId: a.chairId,
			status: a.status,
			startsAt: a.startsAt instanceof Date ? a.startsAt.toISOString() : String(a.startsAt),
			endsAt: a.endsAt instanceof Date ? a.endsAt.toISOString() : String(a.endsAt),
			reason: a.reason,
			comment: a.comment,
			isOverbooking: a.isOverbooking,
		}));

		return reply.send({
			ok: true,
			date: targetDateStr,
			isSoloPractice,
			workplacesCount: dbChairs.length,
			effectiveChairId: effectiveChairId || null,
			slotsCount: slots.length,
			slots,
		});
	});
}
