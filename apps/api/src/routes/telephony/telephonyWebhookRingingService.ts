import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { crmLeads, patients } from "../../db/schema.js";
import {
	detectMarketingAttribution,
	type NormalizedPhone,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import type { TelephonyProvider, TelephonyWebhookPayload } from "./types.js";

export interface HandleRingingParams {
	request: FastifyRequest;
	resolvedOrgId: string;
	callerPhone: NormalizedPhone;
	targetPhone: NormalizedPhone;
	targetRaw: string | undefined;
	data: TelephonyWebhookPayload;
	detectedProvider: TelephonyProvider;
	callId: string;
	recordingUrl: string;
	transcriptionSnippet: string | null;
}

export async function handleRingingEvent(p: HandleRingingParams) {
	const searchPatient = await db.select().from(patients).where(
		and(
			eq(patients.organizationId, p.resolvedOrgId),
			or(
				eq(patients.phone, p.callerPhone.e164),
				ilike(patients.phone, `%${p.callerPhone.national10}%`),
				sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${p.callerPhone.national10}%`}`,
				sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${p.callerPhone.national10}%`}`,
			),
		),
	).limit(1);

	const matchedPatient = searchPatient[0] || null;
	let matchedLead: typeof crmLeads.$inferSelect | null = null;

	const attribution = detectMarketingAttribution({
		utm_source: p.data.utm_source,
		utm_campaign: p.data.utm_campaign,
		utm_medium: p.data.utm_medium,
		advertising_channel: p.data.advertising_channel,
		targetRaw: p.targetRaw,
	});

	const virtualTrunkNumber = p.targetPhone.e164 || p.targetRaw || "";
	const utmDetailStr = [
		p.data.utm_source ? `source=${p.data.utm_source}` : null,
		p.data.utm_campaign ? `campaign=${p.data.utm_campaign}` : null,
		p.data.utm_medium ? `medium=${p.data.utm_medium}` : null,
	].filter(Boolean).join(", ");

	if (!matchedPatient && p.callerPhone.national10.length >= 7) {
		try {
			matchedLead = await db.transaction(async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${`telephony:lead:${p.resolvedOrgId}:${p.callerPhone.national10}`}))`,
				);
				const existing = await tx.select().from(crmLeads).where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${p.callerPhone.national10}%`),
							sql`regexp_replace(coalesce(${crmLeads.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${p.callerPhone.national10}%`}`,
						),
					),
				).limit(1);
				if (existing.length > 0) return existing[0] ?? null;

				const inserted = await tx.insert(crmLeads).values({
					organizationId: p.resolvedOrgId,
					name: `Входящий звонок ${p.callerPhone.e164}`,
					patientName: `Звонок ${p.callerPhone.e164}`,
					phone: p.callerPhone.e164,
					source: attribution.channel,
					status: "new",
					notes: `Автоматический лид из входящего звонка ВАТС (${p.detectedProvider}). Канал: ${attribution.channelLabel}.${virtualTrunkNumber ? ` Номер ВАТС: ${virtualTrunkNumber}.` : ""}${utmDetailStr ? ` UTM: [${utmDetailStr}].` : ""} ${p.callId ? `call_id: ${p.callId}` : "прямой вызов"}`,
					audioRecordUrl: p.recordingUrl || null,
					transcriptionSnippet: p.transcriptionSnippet || null,
					stageEnteredAt: new Date(),
					priority: "normal",
				}).returning();
				return inserted[0] ?? null;
			});
		} catch (leadErr) {
			p.request.log.warn({ leadErr, orgId: p.resolvedOrgId }, "[Telephony] Lead lock resolution warning");
		}
	}

	const displayName = matchedPatient?.fullName?.trim() || matchedLead?.patientName?.trim() || "Неизвестный номер";
	wsBroker.broadcastToOrganization(p.resolvedOrgId, {
		type: "TELEPHONY_INCOMING_CALL",
		payload: {
			phone: p.callerPhone.e164,
			patientId: matchedPatient?.id || null,
			patientName: displayName,
			callId: p.callId || null,
			provider: p.detectedProvider,
			timestamp: new Date().toISOString(),
			virtualNumber: virtualTrunkNumber || null,
			calledDid: p.data.called_did || p.data.called_number || null,
			utmSource: p.data.utm_source || null,
			utmCampaign: p.data.utm_campaign || null,
			utmMedium: p.data.utm_medium || null,
			advertisingChannel: attribution.channel,
			leadId: matchedLead?.id || null,
		},
	});

	return { success: true, event: "ringing", patientId: matchedPatient?.id || null };
}
