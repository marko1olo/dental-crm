/**
 * appointmentCreationBridge.ts — Appointment creation bridge with solo-doctor autonomy.
 * Mandate 8b (Strict <= 120 lines). Mandates 8e, 8n (No mandatory assistant or chief doctor).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import type { Appointment } from "@dental/shared";
import { createAppointmentInDb } from "../../db/appointmentsQuery.js";
import type { db } from "../../db/client.js";
import { type TenantDb, withTenantCtx } from "../../db/rls.js";
import { chairs, crmLeads, users } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import type { wsBroker } from "../../services/websocketBroker.js";
import type { ConvertLeadPayload } from "./conversionValidator.js";
import { extractUtmAttribution } from "./conversionValidator.js";
import { broadcastLeadConversion, recordLeadStageTransition } from "./leadStageTransition.js";
import { saveLeadCommunicationConsents } from "./leadConsentBridge.js";
import { resolveOrCreatePatientFromLead } from "./patientCreationBridge.js";

export async function resolveDoctorAndChair(tx: TenantDb, orgId: string, payload: ConvertLeadPayload) {
	let doctor: { id: string } | undefined;
	const candDoc = payload.doctorId?.trim();
	if (candDoc && !z.string().uuid().safeParse(candDoc).success) {
		return {
			doctor: undefined,
			invalidDoctorId: true as const,
			resolvedChairId: null,
			chairNotFound: false as const,
		};
	}
	if (candDoc) {
		const [found] = await tx
			.select({ id: users.id })
			.from(users)
			.where(
				and(
					eq(users.id, candDoc),
					eq(users.organizationId, orgId),
					eq(users.role, "doctor"),
					eq(users.isActive, true),
				),
			)
			.limit(1);
		doctor = found;
	} else {
		const [fallback] = await tx
			.select({ id: users.id })
			.from(users)
			.where(
				and(
					eq(users.organizationId, orgId),
					eq(users.role, "doctor"),
					eq(users.isActive, true),
				),
			)
			.orderBy(users.createdAt)
			.limit(1);
		doctor = fallback;
	}

	let resolvedChairId: string | null = null;
	const candChair = payload.chairId?.trim();
	if (candChair && !z.string().uuid().safeParse(candChair).success) {
		return {
			doctor,
			invalidChairId: true as const,
			resolvedChairId: null,
			chairNotFound: false as const,
		};
	}
	if (candChair) {
		const [c2] = await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(
				and(
					eq(chairs.id, candChair),
					eq(chairs.organizationId, orgId),
					eq(chairs.isActive, true),
				),
			)
			.limit(1);
		if (!c2) {
			return { doctor, resolvedChairId: null, chairNotFound: true as const };
		}
		resolvedChairId = c2.id;
	} else {
		const [c3] = await tx
			.select({ id: chairs.id })
			.from(chairs)
			.where(and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)))
			.orderBy(chairs.id)
			.limit(1);
		if (c3) resolvedChairId = c3.id;
	}
	return { doctor, resolvedChairId, chairNotFound: false as const };
}

export async function convertLeadToAppointment(params: {
	db: typeof db;
	wsBroker: typeof wsBroker;
	organizationId: string;
	leadId: string;
	payload: ConvertLeadPayload;
	req: FastifyRequest;
	reply: FastifyReply;
}) {
	const { wsBroker, organizationId, leadId, payload, req, reply } = params;
	const apptStart = payload.appointmentStart?.trim();
	const apptEnd = payload.appointmentEnd?.trim();
	const hasDates = Boolean(apptStart && apptEnd);

	const result = await withTenantCtx(organizationId, async (tx) => {
		const [lead] = await tx.select().from(crmLeads).where(
			and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
		).for("update").limit(1);

		if (!lead) return { notFound: true as const };
		if (
			lead.status === "consult_booked" ||
			(lead.status === "converted" && !hasDates)
		) {
			return { alreadyConverted: true as const };
		}

		const resolved = hasDates ? await resolveDoctorAndChair(tx, organizationId, payload) : undefined;
		if (hasDates && resolved && "invalidDoctorId" in resolved) {
			return { invalidDoctorId: true as const };
		}
		if (hasDates && resolved && "invalidChairId" in resolved) {
			return { invalidChairId: true as const };
		}
		if (hasDates && !resolved?.doctor) return { doctorNotFound: true as const };
		if (hasDates && resolved?.chairNotFound) return { chairNotFound: true as const };
		const doctor = resolved?.doctor;
		const resolvedChairId = resolved?.resolvedChairId ?? null;

		const { patient, alreadyExisted } = await resolveOrCreatePatientFromLead(tx, organizationId, lead, payload.comment);
		const identity = getRequestIdentity(req);
		const changedByUserId = identity?.userId && z.string().uuid().safeParse(identity.userId).success ? identity.userId : null;

		const hasExplicitConsentOverride =
			payload.consentMedical !== undefined && payload.consentMedical !== null
				? true
				: payload.consentMarketing !== undefined && payload.consentMarketing !== null;
		if (!alreadyExisted || hasExplicitConsentOverride) {
			await saveLeadCommunicationConsents(tx, {
				organizationId,
				patientId: patient.id,
				consentMedical: payload.consentMedical,
				consentMarketing: payload.consentMarketing,
				decidedByUserId: changedByUserId,
			});
		}

		let appointment: Appointment | null = null;
		const existingMeta = (lead.metadata as Record<string, unknown> | null) || {};
		if (hasDates && doctor && apptStart && apptEnd) {
			const utm = extractUtmAttribution(lead.source, (lead.metadata as Record<string, unknown> | null) ?? null);
			const reason = payload.reason || (Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? `Первичная консультация: ${lead.clinicalTags.join(", ")}` : (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"));
			const commentParts = [payload.comment, lead.notes ? `Жалоба: ${lead.notes}` : null, lead.source ? `Канал: ${lead.source}` : null, utm.formattedUtm, Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? `Теги: ${lead.clinicalTags.join(", ")}` : null, lead.audioRecordUrl ? `Аудио: ${lead.audioRecordUrl}` : null, lead.transcriptionSnippet ? `Транскрипт: ${lead.transcriptionSnippet}` : null].filter(Boolean);

			appointment = await createAppointmentInDb(organizationId, {
				patientId: patient.id,
				doctorUserId: doctor.id,
				chairId: resolvedChairId ?? undefined,
				startsAt: apptStart,
				endsAt: apptEnd,
				status: "planned",
				reason,
				comment: commentParts.length > 0 ? commentParts.join(" | ") : null,
			}, tx);

			const updatedMeta = { ...existingMeta, appointmentId: appointment.id };
			await recordLeadStageTransition({
				tx,
				organizationId,
				leadId: lead.id,
				fromStage: lead.status,
				toStage: "consult_booked",
				stageEnteredAt: lead.stageEnteredAt || lead.createdAt,
				changedByUserId,
				patientId: patient.id,
				appointmentId: appointment.id,
				metadata: updatedMeta,
			});
		} else {
			await recordLeadStageTransition({ tx, organizationId, leadId: lead.id, fromStage: lead.status, toStage: "converted", stageEnteredAt: lead.stageEnteredAt || lead.createdAt, changedByUserId, patientId: patient.id });
		}
		return { patient, appointment, hasAppointmentDates: hasDates };
	});

	if ("notFound" in result) return reply.status(404).send({ error: "Lead not found" });
	if ("alreadyConverted" in result) return reply.status(409).send({ error: "LeadAlreadyConverted", message: "Лид уже был сконвертирован другим администратором." });
	if ("invalidDoctorId" in result) return reply.code(400).send({ error: "DoctorIdInvalid", message: "Некорректный идентификатор врача." });
	if ("invalidChairId" in result) return reply.code(400).send({ error: "ChairIdInvalid", message: "Некорректный идентификатор кресла." });
	if ("doctorNotFound" in result) return reply.code(400).send({ error: "DoctorNotFound" });
	if ("chairNotFound" in result) return reply.code(400).send({ error: "ChairNotFound", message: "Указанный кабинет не найден в клинике." });

	broadcastLeadConversion({ wsBroker, organizationId, leadId, toStage: result.hasAppointmentDates ? "consult_booked" : "converted", patient: result.patient, appointment: result.appointment });
	return result;
}
