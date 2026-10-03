/**
 * apps/api/src/routes/leadsConversion.ts
 *
 * DENTE Dental CRM — Leads Conversion and Patient Creation Engine
 *
 * Mandate 8e (Doctor Autonomy & Solo Doctor Defaults)
 * Mandate 8n (Scale Sovereignty & Anti-Dead-End Fail-Safes)
 * Mandate 8b (Strict <= 800 Lines Modular Extraction)
 */

import { and, eq, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { normalizePhone } from "@dental/shared";
import { createAppointmentInDb } from "../db/appointmentsQuery.js";
import type { db } from "../db/client.js";
import {
	chairs,
	clinicChairs,
	crmLeads,
	crmLeadStageHistory,
	patients,
	users,
} from "../db/schema.js";
import { getRequestIdentity } from "../security/identity.js";
import type { wsBroker } from "../services/websocketBroker.js";
import { normalizePatientAdministrativeProfile } from "../utils/patientAdministrativeProfile.js";

export const convertLeadSchema = z.object({
	appointmentStart: z.string().datetime(),
	appointmentEnd: z.string().datetime(),
	chairId: z.string().optional().nullable(),
	doctorId: z.string().optional().nullable(),
	organizationId: z.string().uuid().optional(),
	reason: z.string().optional().nullable(),
	comment: z.string().optional().nullable(),
});

export type ConvertLeadPayload = z.infer<typeof convertLeadSchema>;

/**
 * Executes appointment conversion transaction with fallback solo-doctor autonomy
 */
export async function convertLeadToAppointment(params: {
	db: typeof db;
	wsBroker: typeof wsBroker;
	organizationId: string;
	leadId: string;
	payload: ConvertLeadPayload;
	req: FastifyRequest;
	reply: FastifyReply;
}) {
	const { db, wsBroker, organizationId, leadId, payload, req, reply } = params;

	const result = await db.transaction(async (tx) => {
		const [lead] = await tx
			.select()
			.from(crmLeads)
			.where(
				and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
			)
			.for("update")
			.limit(1);

		if (!lead) {
			return { notFound: true as const };
		}

		if (lead.status === "consult_booked") {
			return { alreadyConverted: true as const };
		}

		// Doctor resolution: specific ID or active fallback doctor in clinic
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

		// Chair resolution: specific ID or active fallback chair
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

		// 1. Resolve or Create Patient with phone normalization & deduplication
		const rawPhone = lead.phone ? lead.phone.trim() : null;
		const cleanPhone = rawPhone ? (normalizePhone(rawPhone) ?? rawPhone) : null;
		const leadSource = lead.source ? String(lead.source).trim() : null;
		let patient: typeof patients.$inferSelect | undefined;

		if (cleanPhone || rawPhone) {
			const [existingPatient] = await tx
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						or(
							...(cleanPhone ? [eq(patients.phone, cleanPhone)] : []),
							...(rawPhone && rawPhone !== cleanPhone
								? [eq(patients.phone, rawPhone)]
								: []),
						),
					),
				)
				.limit(1);
			if (existingPatient) {
				patient = existingPatient;
			}
		}

		if (!patient) {
			const patientNotesParts = [
				lead.notes ? `Жалобы: ${lead.notes}` : null,
				leadSource ? `Источник: ${leadSource}` : null,
				Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
					? `Интерес: ${lead.clinicalTags.join(", ")}`
					: null,
			].filter(Boolean);

			const [newPatient] = await tx
				.insert(patients)
				.values({
					organizationId,
					fullName: lead.name || lead.patientName || "Пациент",
					phone: cleanPhone ?? rawPhone,
					status: "active",
					notes: patientNotesParts.length > 0 ? patientNotesParts.join("\n") : null,
					administrativeProfile: normalizePatientAdministrativeProfile({
						advertisingSource: leadSource ?? undefined,
						preferredAppointmentNote: lead.notes || (leadSource ? `src:${leadSource}` : undefined),
					}),
				})
				.returning();
			patient = newPatient;
		}

		if (!patient) {
			throw new Error("Не удалось разрешить или создать карту пациента из лида");
		}

		// 2. Create Appointment via protected business logic with full attribution & complaints transfer
		const resolvedReason =
			payload.reason ||
			(Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
				? `Первичная консультация: ${lead.clinicalTags.join(", ")}`
				: (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"));

		const commentParts = [
			payload.comment || null,
			lead.notes ? `Жалоба: ${lead.notes}` : null,
			leadSource ? `Канал: ${leadSource}` : null,
			Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
				? `Теги: ${lead.clinicalTags.join(", ")}`
				: null,
			lead.audioRecordUrl ? `Аудио: ${lead.audioRecordUrl}` : null,
			lead.transcriptionSnippet ? `Транскрипт: ${lead.transcriptionSnippet}` : null,
		].filter(Boolean);
		const resolvedComment = commentParts.length > 0 ? commentParts.join(" | ") : null;

		const appointment = await createAppointmentInDb(
			organizationId,
			{
				patientId: patient.id,
				doctorUserId: doctor.id,
				chairId: resolvedChairId ?? undefined,
				startsAt: payload.appointmentStart,
				endsAt: payload.appointmentEnd,
				status: "planned",
				reason: resolvedReason,
				comment: resolvedComment,
			},
			tx,
		);

		// 3. Mark lead as booked, record stage transition in history and update stageEnteredAt
		const now = new Date();
		const fromStage = lead.status;
		const stageStart = lead.stageEnteredAt || lead.createdAt;
		const durationSeconds = Math.max(
			0,
			Math.floor((now.getTime() - stageStart.getTime()) / 1000),
		);
		const identity = getRequestIdentity(req);
		const changedByUserId =
			identity?.userId && z.string().uuid().safeParse(identity.userId).success
				? identity.userId
				: null;

		await tx.insert(crmLeadStageHistory).values({
			organizationId,
			leadId: lead.id,
			fromStage,
			toStage: "consult_booked",
			changedByUserId,
			durationSeconds,
			createdAt: now,
		});

		await tx
			.update(crmLeads)
			.set({
				status: "consult_booked",
				stageEnteredAt: now,
			})
			.where(
				and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
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
		payload: { id: leadId, organizationId, status: "consult_booked" },
	});
	wsBroker.broadcastToOrganization(organizationId, {
		type: "APPOINTMENT_CREATED",
		payload: result.appointment,
	});

	return result;
}

/**
 * 1-click patient card creation from lead with duplicate phone detection
 */
export async function createPatientFromLead(params: {
	db: typeof db;
	wsBroker: typeof wsBroker;
	organizationId: string;
	leadId: string;
	reply: FastifyReply;
}) {
	const { db, wsBroker, organizationId, leadId, reply } = params;

	// 1. Find lead
	const [lead] = await db
		.select()
		.from(crmLeads)
		.where(
			and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
		)
		.limit(1);

	if (!lead) {
		return reply.code(404).send({
			error: "LeadNotFound",
			message: "Обращение не найдено в клинике.",
		});
	}

	// 2. Check if patient already exists by phone (raw or E.164 normalized)
	const rawPhone = lead.phone ? lead.phone.trim() : null;
	const cleanPhone = rawPhone ? (normalizePhone(rawPhone) ?? rawPhone) : null;
	if (cleanPhone || rawPhone) {
		const [existingPatient] = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					or(
						...(cleanPhone ? [eq(patients.phone, cleanPhone)] : []),
						...(rawPhone && rawPhone !== cleanPhone
							? [eq(patients.phone, rawPhone)]
							: []),
					),
				),
			)
			.limit(1);

		if (existingPatient) {
			return reply.code(200).send({
				success: true,
				alreadyExisted: true,
				patient: existingPatient,
				patientId: existingPatient.id,
				message: `Пациент с номером ${cleanPhone || rawPhone} уже существует в базе: ${existingPatient.fullName}`,
			});
		}
	}

	// 3. Create Patient from Lead preserving name, normalized phone, source, complaints & tags in 1 click
	const leadSource = lead.source ? String(lead.source).trim() : null;
	const patientNotesParts = [
		lead.notes ? `Жалобы: ${lead.notes}` : null,
		leadSource ? `Источник: ${leadSource}` : null,
		Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0
			? `Интерес: ${lead.clinicalTags.join(", ")}`
			: null,
	].filter(Boolean);

	const [patient] = await db
		.insert(patients)
		.values({
			organizationId,
			fullName: lead.name || lead.patientName || "Пациент из воронки",
			phone: cleanPhone ?? rawPhone,
			status: "active",
			notes: patientNotesParts.length > 0 ? patientNotesParts.join("\n") : null,
			administrativeProfile: normalizePatientAdministrativeProfile({
				advertisingSource: leadSource ?? undefined,
				preferredAppointmentNote: lead.notes || (leadSource ? `src:${leadSource}` : undefined),
			}),
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
		patientId: patient.id,
		message: `Создана амбулаторная карта: ${patient.fullName}`,
	});
}
