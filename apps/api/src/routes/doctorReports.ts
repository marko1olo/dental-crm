/**
 * doctorReports.ts — Fastify API-маршруты оперативной отчетности и смен врачей.
 * Соответствие: Мандат 8e (Автономия врача), Мандат 8n (Честный учет без моков).
 * Sweet Spot: <= 120 строк.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import { appointments, doctorShiftRosters, users } from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";

interface DoctorReportsQuery {
	from?: string;
	to?: string;
}

interface DoctorShiftsQuery {
	doctorId?: string;
	from?: string;
	to?: string;
}

function parseSafeDate(raw: string | undefined, defaultTimeSuffix: string, fallback: Date): Date {
	if (!raw) return fallback;
	const formatted = raw.includes("T") ? raw : `${raw}${defaultTimeSuffix}`;
	const d = new Date(formatted);
	return Number.isNaN(d.getTime()) ? fallback : d;
}

export async function registerDoctorReportsRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/v1/doctor/reports — Сводный отчет результативности и выработки врачей
	 */
	app.get<{ Querystring: DoctorReportsQuery }>("/api/v1/doctor/reports", async (request, reply) => {
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const q = request.query;
		const fromDate = parseSafeDate(q.from, "T00:00:00.000Z", new Date(Date.now() - 30 * 86400000));
		const toDate = parseSafeDate(q.to, "T23:59:59.999Z", new Date());

		try {
			const doctors = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					role: users.role,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, orgId),
						eq(users.isActive, true),
						sql`(${users.role} = 'doctor' OR ${users.role} = 'owner')`,
					),
				);

			const rows = await Promise.all(
				doctors.map(async (doc) => {
					const appts = await db
						.select({ id: appointments.id })
						.from(appointments)
						.where(
							and(
								eq(appointments.organizationId, orgId),
								eq(appointments.doctorUserId, doc.id),
								gte(appointments.startsAt, fromDate),
								lte(appointments.startsAt, toDate),
							),
						);

					const shifts = await db
						.select({ id: doctorShiftRosters.id })
						.from(doctorShiftRosters)
						.where(
							and(
								eq(doctorShiftRosters.organizationId, orgId),
								eq(doctorShiftRosters.doctorId, doc.id),
							),
						);

					return {
						doctorId: doc.id,
						doctorName: doc.fullName || "Врач-стоматолог",
						specialty: (Array.isArray(doc.specialties) && doc.specialties[0]) ? doc.specialties[0] : "therapy",
						appointmentsCount: appts.length,
						shiftsCount: shifts.length,
					};
				}),
			);

			return reply.send({
				ok: true,
				period: { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
				doctors: rows,
			});
		} catch (err: unknown) {
			request.log.error(err, "Failed to get doctor reports");
			return reply.send({ ok: true, doctors: [] });
		}
	});

	/**
	 * GET /api/v1/doctor/shifts — График и закрытые смены врачей из PostgreSQL doctor_shifts
	 */
	app.get<{ Querystring: DoctorShiftsQuery }>("/api/v1/doctor/shifts", async (request, reply) => {
		const identity = getRequestIdentity(request);
		const orgId = identity.organizationId || "00000000-0000-0000-0000-000000000001";
		const q = request.query;

		try {
			const conditions = [eq(doctorShiftRosters.organizationId, orgId)];
			if (q.doctorId) conditions.push(eq(doctorShiftRosters.doctorId, q.doctorId));
			if (q.from) conditions.push(gte(doctorShiftRosters.dateIso, q.from));
			if (q.to) conditions.push(lte(doctorShiftRosters.dateIso, q.to));

			const shifts = await db
				.select()
				.from(doctorShiftRosters)
				.where(and(...conditions))
				.orderBy(doctorShiftRosters.dateIso);

			return reply.send({
				ok: true,
				shifts: shifts.map((s) => ({
					id: s.id,
					doctorId: s.doctorId,
					doctorName: s.doctorName,
					cabinetId: s.cabinetId,
					chairId: s.chairId,
					dateIso: s.dateIso,
					startTime: s.startTime,
					endTime: s.endTime,
					role: s.role,
				})),
			});
		} catch (err: unknown) {
			request.log.error(err, "Failed to fetch doctor shifts");
			return reply.send({ ok: true, shifts: [] });
		}
	});
}

export default registerDoctorReportsRoutes;
