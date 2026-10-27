/**
 * patientCreationBridge.ts — Patient card resolution and 1-click creation from CRM leads.
 * Mandate 8b (Strict <= 120 lines). Mandates 8e, 8n (Solo Doctor Autonomy & Deduplication).
 */

import { and, eq, or } from "drizzle-orm";
import type { FastifyReply } from "fastify";
import { normalizePhone } from "@dental/shared";
import type { db } from "../../db/client.js";
import { crmLeads, patients } from "../../db/schema.js";
import type { wsBroker } from "../../services/websocketBroker.js";
import { normalizePatientAdministrativeProfile } from "../../utils/patientAdministrativeProfile.js";
import { extractUtmAttribution } from "./conversionValidator.js";
import { broadcastLeadConversion, recordLeadStageTransition } from "./leadStageTransition.js";

export async function resolveOrCreatePatientFromLead(
	// biome-ignore lint/suspicious/noExplicitAny: Drizzle transaction or db instance
	tx: any,
	organizationId: string,
	lead: typeof crmLeads.$inferSelect,
	comment?: string | null,
): Promise<{ patient: typeof patients.$inferSelect; alreadyExisted: boolean }> {
	const rawPhone = lead.phone?.trim() || null;
	const cleanPhone = rawPhone ? (normalizePhone(rawPhone) ?? rawPhone) : null;
	const leadSource = lead.source ? String(lead.source).trim() : null;

	if (cleanPhone || rawPhone) {
		const [existing] = await tx.select().from(patients).where(
			and(
				eq(patients.organizationId, organizationId),
				or(...(cleanPhone ? [eq(patients.phone, cleanPhone)] : []), ...(rawPhone && rawPhone !== cleanPhone ? [eq(patients.phone, rawPhone)] : [])),
			),
		).limit(1);
		if (existing) return { patient: existing, alreadyExisted: true };
	}

	const utmInfo = extractUtmAttribution(lead.source, lead.notes);
	const notesParts = [
		lead.notes ? `Жалобы: ${lead.notes}` : null,
		leadSource ? `Источник: ${leadSource}` : null,
		utmInfo.formattedUtm || null,
		Array.isArray(lead.clinicalTags) && lead.clinicalTags.length > 0 ? `Интерес: ${lead.clinicalTags.join(", ")}` : null,
		comment ? `Комментарий: ${comment}` : null,
	].filter(Boolean);

	const [created] = await tx.insert(patients).values({
		organizationId,
		fullName: lead.name || lead.patientName || "Пациент из воронки",
		phone: cleanPhone ?? rawPhone,
		status: "active",
		notes: notesParts.length > 0 ? notesParts.join("\n") : null,
		administrativeProfile: normalizePatientAdministrativeProfile({
			preferredAppointmentNote: lead.notes || (leadSource ? `src:${leadSource}` : undefined),
			utmSource: utmInfo.utmSource ?? null,
			utmMedium: utmInfo.utmMedium ?? null,
			utmCampaign: utmInfo.utmCampaign ?? null,
			utmContent: utmInfo.utmContent ?? null,
			utmTerm: utmInfo.utmTerm ?? null,
			leadSource: leadSource ?? null,
		}),
	}).returning();

	if (!created) throw new Error("Не удалось создать карту пациента из лида");
	return { patient: created, alreadyExisted: false };
}

export async function createPatientFromLead(params: {
	db: typeof db;
	wsBroker: typeof wsBroker;
	organizationId: string;
	leadId: string;
	reply: FastifyReply;
}) {
	const { db, wsBroker, organizationId, leadId, reply } = params;
	const [lead] = await db.select().from(crmLeads).where(
		and(eq(crmLeads.id, leadId), eq(crmLeads.organizationId, organizationId)),
	).limit(1);

	if (!lead) {
		return reply.code(404).send({ error: "LeadNotFound", message: "Обращение не найдено в клинике." });
	}

	const { patient, alreadyExisted } = await resolveOrCreatePatientFromLead(db, organizationId, lead);
	await recordLeadStageTransition({
		tx: db,
		organizationId,
		leadId: lead.id,
		fromStage: lead.status,
		toStage: "converted",
		stageEnteredAt: lead.stageEnteredAt || lead.createdAt,
		changedByUserId: null,
	});

	broadcastLeadConversion({ wsBroker, organizationId, leadId, toStage: "converted", patient });
	const statusCode = alreadyExisted ? 200 : 201;
	return reply.code(statusCode).send({
		success: true,
		alreadyExisted,
		patient,
		patientId: patient.id,
		message: alreadyExisted
			? `Пациент с номером ${patient.phone} уже существует в базе: ${patient.fullName}`
			: `Создана амбулаторная карта: ${patient.fullName}`,
	});
}
