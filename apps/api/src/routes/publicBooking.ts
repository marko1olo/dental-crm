import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import * as schema from "../db/schema.js";

const ipRequestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

function isRateLimited(ip) {
	const now = Date.now();
	const entry = ipRequestCounts.get(ip);
	if (!entry || now > entry.resetAt) {
		ipRequestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		return false;
	}
	entry.count++;
	return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

const bookingRequestSchema = z.object({
	patientName: z.string().trim().min(2).max(120),
	patientPhone: z
		.string()
		.trim()
		.regex(/^\+?[0-9\s\-()]{7,20}$/, "Неверный формат номера телефона"),
	patientComment: z.string().trim().max(500).optional(),
	doctorId: z.string().uuid().optional().nullable(),
	requestedDate: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты: YYYY-MM-DD"),
	requestedTime: z
		.string()
		.regex(/^\d{2}:\d{2}$/, "Формат времени: HH:MM")
		.optional()
		.nullable(),
	specialty: z.string().trim().max(64).optional().nullable(),
});

async function resolveClinicBySlug(slug) {
	const [byId] = await db
		.select({
			id: schema.clinics.id,
			organizationId: schema.clinics.organizationId,
			name: schema.clinics.name,
		})
		.from(schema.clinics)
		.where(eq(schema.clinics.id, slug))
		.limit(1)
		.catch(() => []);
	if (byId) return byId;
	const [byName] = await db
		.select({
			id: schema.clinics.id,
			organizationId: schema.clinics.organizationId,
			name: schema.clinics.name,
		})
		.from(schema.clinics)
		.where(
			sql`lower(regexp_replace(${schema.clinics.name}, '[^a-zA-Za-za-z0-9]', '-', 'g')) = ${slug.toLowerCase()}`,
		)
		.limit(1);
	return byName ?? null;
}

export async function registerPublicBookingRoutes(app) {
	// GET doctors
	app.get(
		"/api/public/booking/:clinicSlug/doctors",
		{ config: { skipAuth: true } },
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown"))
				return reply.code(429).send({ error: "Слишком много запросов." });
			const clinic = await resolveClinicBySlug(request.params.clinicSlug);
			if (!clinic) return reply.code(404).send({ error: "Клиника не найдена" });
			const doctors = await db
				.select({
					id: schema.users.id,
					fullName: schema.users.fullName,
					specialties: schema.users.specialties,
				})
				.from(schema.users)
				.where(
					and(
						eq(schema.users.organizationId, clinic.organizationId),
						eq(schema.users.role, "doctor"),
					),
				)
				.limit(20);
			return reply.send({
				clinicName: clinic.name,
				doctors: doctors.map((d) => ({
					id: d.id,
					name: d.fullName ?? "Врач",
					specialty: Array.isArray(d.specialties) && d.specialties.length > 0 ? d.specialties[0] : "universal",
				})),
			});
		},
	);

	// GET slots
	app.get(
		"/api/public/booking/:clinicSlug/slots",
		{ config: { skipAuth: true } },
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown"))
				return reply.code(429).send({ error: "Слишком много запросов." });
			const clinic = await resolveClinicBySlug(request.params.clinicSlug);
			if (!clinic) return reply.code(404).send({ error: "Клиника не найдена" });
			const today = new Date();
			today.setHours(0, 0, 0, 0);
			const endDate = new Date(today);
			endDate.setDate(endDate.getDate() + 14);
			const filter = [
				eq(schema.appointments.organizationId, clinic.organizationId),
				gte(schema.appointments.startsAt, today),
				lte(schema.appointments.startsAt, endDate),
			];
			if ((request.query as any).doctorId)
				filter.push(
					eq(schema.appointments.doctorUserId, (request.query as any).doctorId),
				);
			const busySlots = await db
				.select({
					startAt: schema.appointments.startsAt,
					endAt: schema.appointments.endsAt,
				})
				.from(schema.appointments)
				.where(and(...filter));
			const slots: { date: string, time: string, available: boolean }[] = [];
			for (let d = 0; d < 14; d++) {
				const date = new Date(today);
				date.setDate(date.getDate() + d);
				if (date.getDay() === 0) continue;
				const dateStr = date.toISOString().substring(0, 10);
				for (let h = 9; h < 18; h++) {
					for (let m = 0; m < 60; m += 30) {
						const slotStart = new Date(date);
						slotStart.setHours(h, m, 0, 0);
						const slotEnd = new Date(slotStart);
						slotEnd.setMinutes(slotEnd.getMinutes() + 30);
						const isBusy = busySlots.some(
							(b) =>
								slotStart < new Date(b.endAt) && slotEnd > new Date(b.startAt),
						);
						slots.push({
							date: dateStr,
							time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
							available: !isBusy,
						});
					}
				}
			}
			return reply.send({ clinicName: clinic.name, slots });
		},
	);

	// POST booking request
	app.post(
		"/api/public/booking/:clinicSlug/request",
		{ config: { skipAuth: true } },
		async (request, reply) => {
			if (isRateLimited(request.ip ?? "unknown"))
				return reply.code(429).send({ error: "Слишком много запросов." });
			const clinic = await resolveClinicBySlug(request.params.clinicSlug);
			if (!clinic) return reply.code(404).send({ error: "Клиника не найдена" });
			const parsed = bookingRequestSchema.safeParse(request.body);
			if (!parsed.success)
				return reply.code(400).send({
					error: "Ошибка валидации",
					details: parsed.error.issues.map((i) => i.message),
				});
			const data = parsed.data;
			const requestedDate = new Date(
				data.requestedDate + "T" + (data.requestedTime ?? "09:00") + ":00",
			);
			const endAt = new Date(requestedDate);
			endAt.setMinutes(endAt.getMinutes() + 30);
			const [existingPatient] = await db
				.select({ id: schema.patients.id })
				.from(schema.patients)
				.where(
					and(
						eq(schema.patients.organizationId, clinic.organizationId),
						sql`${schema.patients.administrativeProfile}->>'phone' = ${data.patientPhone}`,
					),
				)
				.limit(1);
			let patientId = existingPatient?.id ?? null;
			if (!patientId) {
				const [newP] = await db
					.insert(schema.patients)
					.values({
						organizationId: clinic.organizationId,
						fullName: data.patientName,
						status: "active",
						administrativeProfile: {
							phone: data.patientPhone,
							source: "online_widget",
						} as any,
					})
					.returning({ id: schema.patients.id });
				patientId = newP?.id ?? null;
			}
			const notes = [
				"Онлайн-запись с сайта",
				data.patientComment ? `Комментарий: ${data.patientComment}` : null,
				data.specialty ? `Специализация: ${data.specialty}` : null,
			]
				.filter(Boolean)
				.join("\n");
			const [appointment] = await db
				.insert(schema.appointments)
				.values({
					organizationId: clinic.organizationId,
					clinicId: clinic.id,
					patientId: patientId!,
					assignedDoctorId: data.doctorId ?? null,
					startAt: requestedDate,
					endAt,
					status: "planned",
					notes,
				} as any)
				.returning({ id: schema.appointments.id });
			return reply.code(201).send({
				success: true,
				appointmentId: appointment?.id,
				message: `Заявка принята! Ждём вас ${data.requestedDate} в ${data.requestedTime ?? "09:00"}. Администратор свяжется для подтверждения.`,
			});
		},
	);
}
