/**
 * appointmentCreationBridge.ts — Appointment creation bridge with solo-doctor autonomy.
 * Mandate 8b (Strict <= 120 lines). Mandates 8e, 8n (No mandatory assistant or chief doctor).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createAppointmentInDb } from "../../db/appointmentsQuery.js";
import type { db } from "../../db/client.js";
import { chairs, clinicChairs, crmLeads, users } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import type { wsBroker } from "../../services/websocketBroker.js";
import type { ConvertLeadPayload } from "./conversionValidator.js";
import { extractUtmAttribution } from "./conversionValidator.js";
import { broadcastLeadConversion, recordLeadStageTransition } from "./leadStageTransition.js";
import { resolveOrCreatePatientFromLead } from "./patientCreationBridge.js";

// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction
export async function resolveDoctorAndChair(tx: any, orgId: string, payload: ConvertLeadPayload) {
	let doctor: { id: string } | undefined;
	const candDoc = payload.doctorId;
	if (candDoc && candDoc !== "default-doctor" && z.string().uuid().safeParse(candDoc).success) {
		const [found] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, candDoc), eq(users.organizationId, orgId), eq(users.isActive, true))).limit(1);
		doctor = found;
	}
	if (!doctor) {
		const [fallback] = await tx.select({ id: users.id }).from(users).where(and(eq(users.organizationId, orgId), eq(users.isActive, true))).limit(1);
		doctor = fallback;
	}

	let resolvedChairId: string | undefined;
	const candChair = payload.chairId;
	const validChairUuid = candChair && candChair !== "default-chair" && z.string().uuid().safeParse(candChair).success;
	if (validChairUuid && candChair) {
		const [fc] = await tx.select({ id: clinicChairs.id }).from(clinicChairs).where(
			and(eq(clinicChairs.id, candChair), eq(clinicChairs.organizationId, orgId)),
		).limit(1);
		if (fc) resolvedChairId = fc.id;
	}
	if (!resolvedChairId) {
		const [c1] = await tx.select({ id: clinicChairs.id }).from(clinicChairs).where(eq(clinicChairs.organizationId, orgId)).limit(1);
		if (c1) resolvedChairId = c1.id;
	}
	if (!resolvedChairId && validChairUuid && candChair) {
		const [c2] = await tx.select({ id: chairs.id }).from(chairs).where(
			and(eq(chairs.id, candChair), eq(chairs.organizationId, orgId)),
		).limit(1);
		if (c2) resolvedChairId = c2.id;
	}
	if (!resolvedChairId) {
		const [c3] = await tx.select({ id: chairs.id }).from(chairs).where(
			and(eq(chairs.organizationId, orgId), eq(chairs.isActive, true)),
		).limit(1);
		if (c3) resolvedChairId = c3.id;
	}
	return { doctor, resolvedChairId };
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
	const { db, wsBroker, organizationId, leadId, payload, req, reply } = params;
	const hasDates = Boolean(payload.appointmentStart?.trim() && payload.appointmentEnd?.trim());

	const result = await db.transaction(async (tx) => {
		const [lead] = await tx.select().from(crmLeads).where(
			and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
		).for("update").limit(1);

		if (!lead) return { notFound: true as const };
		if (lead.status === "consult_booked" || lead.status === "converted") return { alreadyConverted: true as const };

		const { doctor, resolvedChairId } = hasDates ? await resolveDoctorAndChair(tx, organizationId, payload) : {};
		if (hasDates && !doctor) return { doctorNotFound: true as const };

		const { patient } = await resolveOrCreatePatientFromLead(tx, organizationId, lead, payload.comment);
		const identity = getRequestIdentity(req);
		const changedByUserId = identity?.userId && z.string().uuid().safeParse(identity.userId).success ? identity.userId : null;

		let appointment: unknown = null;
		if (hasDates && doctor) {
			const utm = extractUtmAttribution(lead.source, lead.notes);
			const reason = payload.reason || (Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? `Первичная консультация: ${lead.clinicalTags.join(", ")}` : (lead.notes ? `Первичная консультация: ${lead.notes.slice(0, 100)}` : "Первичная консультация"));
			const commentParts = [payload.comment, lead.notes ? `Жалоба: ${lead.notes}` : null, lead.source ? `Канал: ${lead.source}` : null, utm.formattedUtm, Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? `Теги: ${lead.clinicalTags.join(", ")}` : null, lead.audioRecordUrl ? `Аудио: ${lead.audioRecordUrl}` : null, lead.transcriptionSnippet ? `Транскрипт: ${lead.transcriptionSnippet}` : null].filter(Boolean);

			appointment = await createAppointmentInDb(organizationId, {
				patientId: patient.id,
				doctorUserId: doctor.id,
				chairId: resolvedChairId,
				startsAt: payload.appointmentStart!,
				endsAt: payload.appointmentEnd!,
				status: "planned",
				reason,
				comment: commentParts.length > 0 ? commentParts.join(" | ") : null,
			}, tx);

			await recordLeadStageTransition({ tx, organizationId, leadId: lead.id, fromStage: lead.status, toStage: "consult_booked", stageEnteredAt: lead.stageEnteredAt || lead.createdAt, changedByUserId });
		} else {
			await recordLeadStageTransition({ tx, organizationId, leadId: lead.id, fromStage: lead.status, toStage: "converted", stageEnteredAt: lead.stageEnteredAt || lead.createdAt, changedByUserId });
		}
		return { patient, appointment, hasAppointmentDates: hasDates };
	});

	if ("notFound" in result) return reply.status(404).send({ error: "Lead not found" });
	if ("alreadyConverted" in result) return reply.status(409).send({ error: "LeadAlreadyConverted", message: "Лид уже был сконвертирован другим администратором." });
	if ("doctorNotFound" in result) return reply.code(400).send({ error: "DoctorNotFound" });

	broadcastLeadConversion({ wsBroker, organizationId, leadId, toStage: result.hasAppointmentDates ? "consult_booked" : "converted", patient: result.patient, appointment: result.appointment });
	return result;
}
