import { and, eq, gte, lt } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { appointments, patients, users } from "../db/schema.js";

// --- Abuse protection for the public (unauthenticated) booking surface ---
// These endpoints are reachable without any token, so they must be rate limited
// to prevent booking spam and unbounded patient/appointment row creation.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const entry = ipRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const dateSchema = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: YYYY-MM-DD");

const bookingRequestSchema = z.object({
	doctorId: z.string().uuid("Некорректный идентификатор врача"),
	startsAt: z.string().datetime({ offset: true }),
	endsAt: z.string().datetime({ offset: true }),
	patientName: z.string().trim().min(2).max(120),
	patientPhone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
	comment: z.string().trim().max(500).optional(),
});

export const registerPublicBookingRoutes = async (server: FastifyInstance) => {
	// 1. Get doctors for an organization
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/doctors",
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown")) {
				return reply.status(429).send({ error: "Слишком много запросов." });
			}
			const { organizationId } = request.params;
			if (!organizationId)
				return reply.status(400).send({ error: "Missing organizationId" });

			const doctorsList = await db
				.select({
					id: users.id,
					fullName: users.fullName,
					specialties: users.specialties,
				})
				.from(users)
				.where(
					and(
						eq(users.organizationId, organizationId),
						eq(users.role, "doctor"),
					),
				)
				.limit(50);

			return doctorsList;
		},
	);

	// 2. Get available slots for a doctor on a specific date (YYYY-MM-DD)
	server.get<{
		Params: { organizationId: string; doctorId: string };
		Querystring: { date: string };
	}>("/:organizationId/slots/:doctorId", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId, doctorId } = request.params;
		const { date } = request.query;

		if (!organizationId || !doctorId || !date) {
			return reply.status(400).send({ error: "Missing params" });
		}
		if (!dateSchema.safeParse(date).success) {
			return reply.status(400).send({ error: "Формат даты: YYYY-MM-DD" });
		}

		const startOfDay = new Date(`${date}T00:00:00.000Z`);
		const endOfDay = new Date(`${date}T23:59:59.999Z`);

		// Fetch existing appointments
		const existingApps = await db
			.select({ startsAt: appointments.startsAt, endsAt: appointments.endsAt })
			.from(appointments)
			.where(
				and(
					eq(appointments.organizationId, organizationId),
					eq(appointments.doctorUserId, doctorId),
					gte(appointments.startsAt, startOfDay),
					lt(appointments.startsAt, endOfDay),
				),
			);

		// Simple hourly slots from 09:00 to 18:00
		const slots: { time: string; startsAt: string; endsAt: string }[] = [];
		for (let hour = 9; hour < 18; hour++) {
			const slotStart = new Date(
				`${date}T${hour.toString().padStart(2, "0")}:00:00.000Z`,
			);
			const slotEnd = new Date(
				`${date}T${(hour + 1).toString().padStart(2, "0")}:00:00.000Z`,
			);

			const isTaken = existingApps.some((app) => {
				const appStart = new Date(app.startsAt).getTime();
				const appEnd = new Date(app.endsAt).getTime();
				return slotStart.getTime() < appEnd && slotEnd.getTime() > appStart;
			});

			if (!isTaken) {
				slots.push({
					time: `${hour.toString().padStart(2, "0")}:00`,
					startsAt: slotStart.toISOString(),
					endsAt: slotEnd.toISOString(),
				});
			}
		}

		return slots;
	});

	// 3. Book an appointment
	server.post<{
		Params: { organizationId: string };
		Body: {
			doctorId: string;
			startsAt: string;
			endsAt: string;
			patientName: string;
			patientPhone: string;
			comment?: string;
		};
	}>("/:organizationId/book", async (request, reply) => {
		if (isRateLimited(request.ip ?? "unknown")) {
			return reply.status(429).send({ error: "Слишком много запросов." });
		}
		const { organizationId } = request.params;
		if (!organizationId) {
			return reply.status(400).send({ error: "Missing organizationId" });
		}

		const parsed = bookingRequestSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "Некорректные данные записи",
				details: parsed.error.issues.map((i) => i.message),
			});
		}
		const { doctorId, startsAt, endsAt, patientName, patientPhone, comment } =
			parsed.data;

		// Find or create patient
		let patientId: string;
		const existingPatients = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					eq(patients.phone, patientPhone),
				),
			)
			.limit(1);

		const existingPatient = existingPatients[0];
		if (existingPatient) {
			patientId = existingPatient.id;
		} else {
			const newPatient = await db
				.insert(patients)
				.values({
					organizationId,
					fullName: patientName,
					phone: patientPhone,
					status: "active",
				})
				.returning({ id: patients.id });

			const createdPatient = newPatient[0];
			if (!createdPatient) {
				return reply.status(500).send({ error: "Failed to create patient" });
			}
			patientId = createdPatient.id;
		}

		// Create appointment
		const newAppointment = await db
			.insert(appointments)
			.values({
				organizationId,
				patientId,
				doctorUserId: doctorId,
				status: "planned",
				startsAt: new Date(startsAt),
				endsAt: new Date(endsAt),
				comment: comment || "Запись через виджет на сайте",
			})
			.returning();

		const appt = newAppointment[0];
		if (!appt) {
			return reply.status(500).send({ error: "Failed to create appointment" });
		}
		return { success: true, appointment: appt };
	});
};
