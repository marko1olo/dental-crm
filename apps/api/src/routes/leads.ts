import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../accessGuard.js";
import { createAppointmentInDb } from "../db/appointmentsQuery.js";
import { db } from "../db/client.js";
import {
	chairs,
	clinicChairs,
	crmLeads,
	patients,
	users,
} from "../db/schema.js";
import { normalizePatientAdministrativeProfile } from "../sampleData.js";
import { wsBroker } from "../services/websocketBroker.js";

const leadSchema = z.object({
	name: z.string().min(1),
	phone: z.string().optional(),
	source: z.string().optional(),
	expectedRevenue: z.string().optional(),
});

const convertLeadSchema = z.object({
	appointmentStart: z.string().datetime(),
	appointmentEnd: z.string().datetime(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	organizationId: z.string().uuid().optional(),
});

export async function registerLeadsRoutes(app: FastifyInstance) {
	app.get("/api/leads", async (req, reply) => {
		const organizationId = await requireResolvedOrganizationId(
			req,
			reply,
			"leads read",
		);
		if (!organizationId) return;

		const leads = await db
			.select()
			.from(crmLeads)
			.where(eq(crmLeads.organizationId, organizationId));
		return leads;
	});

	app.post("/api/leads", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead create",
		);
		if (!organizationId) return;

		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}
		const data = parsed.data;
		const [lead] = (await db
			.insert(crmLeads)
			.values({ ...data, organizationId })
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			.returning()) as any;
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_CREATED",
			payload: lead,
		});
		return lead;
	});

	app.patch("/api/leads/:id/status", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead status update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const statusParsed = z
			.object({
				status: z.enum([
					"new",
					"contacted",
					"consult_booked",
					"showed_up",
					"no_answer",
					"trash",
				]),
			})
			.safeParse(req.body);
		if (!statusParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте статус лида.",
			});
		}
		const { status } = statusParsed.data;

		const [lead] = await db
			.update(crmLeads)
			.set({ status })
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.returning();
		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: lead,
		});
		return lead;
	});

	app.put("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead update",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const parsed = leadSchema.safeParse(req.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте поля лида: нужно непустое имя.",
			});
		}
		const data = parsed.data;

		const [lead] = await db
			.update(crmLeads)
			.set(data)
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.returning();
		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: lead,
		});
		return lead;
	});

	app.delete("/api/leads/:id", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead delete",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };

		const [lead] = await db
			.delete(crmLeads)
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.returning();
		if (!lead) return reply.code(404).send({ error: "LeadNotFound" });
		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_DELETED",
			payload: { id },
		});
		return { success: true };
	});

	app.post("/api/leads/:id/convert", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead convert",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };
		const convertParsed = convertLeadSchema.safeParse(req.body);
		if (!convertParsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Проверьте данные конвертации лида: даты, кресло и врач.",
			});
		}
		const payload = convertParsed.data;

		// Transaction for Lead conversion with row-level lock
		const result = await db.transaction(async (tx) => {
			const [lead] = await tx
				.select()
				.from(crmLeads)
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				)
				.for("update")
				.limit(1);

			if (!lead) {
				return { notFound: true as const };
			}

			if (lead.status === "consult_booked") {
				return { alreadyConverted: true as const };
			}

			// Doctor resolution:
			// If payload.doctorId is provided and is a valid UUID, attempt to find that active user.
			// If not provided, or if "default-doctor", or if user is not found:
			// Find the first active user in organizationId (from users table where organizationId = organizationId and isActive = true).
			// If an active user is found, use that doctor's ID! Only if NO active users exist at all in the organization, return { doctorNotFound: true as const }.
			let doctor: { id: string } | undefined;
			const candidateDoctorId = payload.doctorId;
			const isValidDoctorUuid =
				typeof candidateDoctorId === "string" &&
				candidateDoctorId !== "default-doctor" &&
				z.string().uuid().safeParse(candidateDoctorId).success;

			if (isValidDoctorUuid && candidateDoctorId) {
				const [foundDoctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.id, candidateDoctorId),
							eq(users.organizationId, organizationId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				doctor = foundDoctor;
			}

			if (!doctor) {
				const [fallbackDoctor] = await tx
					.select({ id: users.id })
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.isActive, true),
						),
					)
					.limit(1);
				doctor = fallbackDoctor;
			}

			if (!doctor) return { doctorNotFound: true as const };

			// Chair resolution:
			// If payload.chairId is provided, not "default-chair", and is a valid UUID, attempt to find that chair in clinicChairs.
			// If not found, or if payload.chairId is "default-chair" or omitted:
			// Find the first chair in clinicChairs for this organizationId. If found, use its ID.
			// If NO chairs exist in clinicChairs at all, resolvedChairId is undefined (since createAppointmentInDb accepts optional chairId and schema.appointments.chairId is nullable).
			let resolvedChairId: string | undefined;
			const candidateChairId = payload.chairId;
			const isValidChairUuid =
				typeof candidateChairId === "string" &&
				candidateChairId !== "default-chair" &&
				z.string().uuid().safeParse(candidateChairId).success;

			if (isValidChairUuid && candidateChairId) {
				const [foundChair] = await tx
					.select({ id: clinicChairs.id })
					.from(clinicChairs)
					.where(
						and(
							eq(clinicChairs.id, candidateChairId),
							eq(clinicChairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (foundChair) {
					resolvedChairId = foundChair.id;
				}
			}

			if (!resolvedChairId) {
				const [firstChair] = await tx
					.select({ id: clinicChairs.id })
					.from(clinicChairs)
					.where(eq(clinicChairs.organizationId, organizationId))
					.limit(1);
				if (firstChair) {
					resolvedChairId = firstChair.id;
				}
			}

			// If clinicChairs didn't yield a chair, check if chairs table has a matching chair for the organization
			if (!resolvedChairId && isValidChairUuid && candidateChairId) {
				const [foundInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.id, candidateChairId),
							eq(chairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (foundInChairs) {
					resolvedChairId = foundInChairs.id;
				}
			}

			if (!resolvedChairId) {
				const [firstInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.organizationId, organizationId),
							eq(chairs.isActive, true),
						),
					)
					.limit(1);
				if (firstInChairs) {
					resolvedChairId = firstInChairs.id;
				}
			}

			// In createAppointmentInDb, input.chairId is checked against schema.chairs.
			// If resolvedChairId was from clinicChairs and not present in schema.chairs,
			// verify it exists in schema.chairs so foreign key constraint does not fail.
			if (resolvedChairId) {
				const [existsInChairs] = await tx
					.select({ id: chairs.id })
					.from(chairs)
					.where(
						and(
							eq(chairs.id, resolvedChairId),
							eq(chairs.organizationId, organizationId),
						),
					)
					.limit(1);
				if (!existsInChairs) {
					resolvedChairId = undefined;
				}
			}

			// 1. Create Patient from Lead with advertising source preserved
			const leadSource = lead.source ? String(lead.source).trim() : null;
			const [patient] = await tx
				.insert(patients)
				.values({
					organizationId,
					fullName: lead.name || lead.patientName || "Пациент",
					phone: lead.phone,
					status: "active",
					notes: leadSource ? `Источник: ${leadSource}` : null,
					administrativeProfile: leadSource
						? normalizePatientAdministrativeProfile({
								preferredAppointmentNote: `src:${leadSource}`,
							})
						: null,
				})
				.returning();
			if (!patient)
				throw new Error("Не удалось создать карту пациента из лида");

			// 2. Create Appointment via protected business logic
			const appointment = await createAppointmentInDb(
				organizationId,
				{
					patientId: patient.id,
					doctorUserId: doctor.id,
					chairId: resolvedChairId ?? undefined,
					startsAt: payload.appointmentStart,
					endsAt: payload.appointmentEnd,
					status: "planned",
				},
				tx,
			);

			// 3. Mark lead as booked
			await tx
				.update(crmLeads)
				.set({ status: "consult_booked" })
				.where(
					and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
				);

			return { patient, appointment };
		});

		if ("notFound" in result) {
			return reply.status(404).send({ error: "Lead not found" });
		}
		if ("alreadyConverted" in result) {
			return reply.status(409).send({
				error: "LeadAlreadyConverted",
				message: "Лид уже был сконвертирован в запись другим администратором.",
			});
		}
		if ("doctorNotFound" in result) {
			return reply.code(400).send({ error: "DoctorNotFound" });
		}
		if ("chairNotFound" in result) {
			return reply.code(400).send({ error: "ChairNotFound" });
		}

		wsBroker.broadcastToOrganization(organizationId, {
			type: "LEAD_UPDATED",
			payload: { id, organizationId, status: "consult_booked" },
		});
		wsBroker.broadcastToOrganization(organizationId, {
			type: "APPOINTMENT_CREATED",
			payload: result.appointment,
		});

		return result;
	});

	app.post("/api/leads/:id/create-patient", async (req, reply) => {
		const organizationId = await requireResolvedStaffOrAdminOrganizationId(
			req,
			reply,
			"lead create patient",
		);
		if (!organizationId) return;

		const { id } = req.params as { id: string };

		// 1. Find lead
		const [lead] = await db
			.select()
			.from(crmLeads)
			.where(
				and(eq(crmLeads.id, id), eq(crmLeads.organizationId, organizationId)),
			)
			.limit(1);

		if (!lead) {
			return reply.code(404).send({
				error: "LeadNotFound",
				message: "Обращение не найдено в клинике.",
			});
		}

		// 2. Check if patient already exists by phone (if provided)
		const cleanPhone = lead.phone ? lead.phone.trim() : null;
		if (cleanPhone) {
			const [existingPatient] = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.phone, cleanPhone),
					),
				)
				.limit(1);

			if (existingPatient) {
				return reply.code(200).send({
					success: true,
					alreadyExisted: true,
					patient: existingPatient,
					message: `Пациент с номером ${cleanPhone} уже существует в базе: ${existingPatient.fullName}`,
				});
			}
		}

		// 3. Create Patient from Lead preserving name, phone, source in 1 click
		const leadSource = lead.source ? String(lead.source).trim() : null;
		const [patient] = await db
			.insert(patients)
			.values({
				organizationId,
				fullName: lead.name || lead.patientName || "Пациент из воронки",
				phone: cleanPhone,
				status: "active",
				notes: leadSource ? `Источник: ${leadSource}` : null,
				administrativeProfile: leadSource
					? normalizePatientAdministrativeProfile({
							preferredAppointmentNote: `src:${leadSource}`,
						})
					: null,
			})
			.returning();

		if (!patient) {
			return reply.code(500).send({
				error: "PatientCreationFailed",
				message: "Не удалось создать карту пациента из лида.",
			});
		}

		// Broadcast real-time websocket notification
		wsBroker.broadcastToOrganization(organizationId, {
			type: "PATIENT_CREATED",
			payload: patient,
		});

		return reply.code(201).send({
			success: true,
			alreadyExisted: false,
			patient,
			message: `Создана амбулаторная карта: ${patient.fullName}`,
		});
	});
}
