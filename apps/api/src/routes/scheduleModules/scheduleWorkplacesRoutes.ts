import { DEMO_SHOWCASE_ORG_ID } from "@dental/shared";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedOrganizationId as requireOrganizationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { appointments, chairs } from "../../db/schema.js";
import { requireClinicOrganizationId } from "../scheduleAuthGuard.js";

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
			requireClinicOrganizationId(request, reply) ||
			DEMO_SHOWCASE_ORG_ID;

		const dbChairs = await db
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
			.orderBy(asc(chairs.name));

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
			requireClinicOrganizationId(request, reply) ||
			DEMO_SHOWCASE_ORG_ID;

		const query = (request.query || {}) as Record<string, string | undefined>;
		const dateParam = (query.date || "").trim();
		const chairIdParam = (query.chairId || "").trim();
		const doctorIdParam = (query.doctorId || "").trim();

		const now = new Date();
		const targetDateStr = dateParam || now.toISOString().slice(0, 10);
		const startOfDay = new Date(`${targetDateStr}T00:00:00.000Z`);
		const endOfDay = new Date(`${targetDateStr}T23:59:59.999Z`);

		// Проверяем количество кресел для соло-режима
		const dbChairs = await db
			.select({ id: chairs.id, name: chairs.name })
			.from(chairs)
			.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)));

		const isSoloPractice = dbChairs.length <= 1;
		const effectiveChairId =
			chairIdParam ||
			(isSoloPractice && dbChairs.length === 1 && dbChairs[0]?.id
				? dbChairs[0].id
				: undefined);

		// Условия выборки приёмов
		const conditions = [
			eq(appointments.organizationId, orgId),
			gte(appointments.startsAt, startOfDay),
			lte(appointments.startsAt, endOfDay),
		];

		if (effectiveChairId) {
			conditions.push(eq(appointments.chairId, effectiveChairId));
		}
		if (doctorIdParam) {
			conditions.push(eq(appointments.doctorUserId, doctorIdParam));
		}

		const apptRows = await db
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
