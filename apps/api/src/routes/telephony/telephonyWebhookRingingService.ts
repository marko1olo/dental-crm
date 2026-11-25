import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { TenantDb } from "../../db/client.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { crmLeads, patients } from "../../db/schema.js";
import {
	detectMarketingAttribution,
	type NormalizedPhone,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { escapeLikePattern, type TelephonyProvider, type TelephonyWebhookPayload } from "./types.js";

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
	tx?: TenantDb | undefined;
}

async function runRingingInTx(tx: TenantDb, p: HandleRingingParams) {
	const escapedNational10 = escapeLikePattern(p.callerPhone.national10);
	const searchPatient = await tx.select().from(patients).where(
		and(
			eq(patients.organizationId, p.resolvedOrgId),
			or(
				eq(patients.phone, p.callerPhone.e164),
				ilike(patients.phone, `%${escapedNational10}%`),
				sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
				sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
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

	if (!matchedPatient && p.callerPhone.national10.length >= 7) {
		try {
			const existing = await tx.select().from(crmLeads).where(
				and(
					eq(crmLeads.organizationId, p.resolvedOrgId),
					or(
						eq(crmLeads.phone, p.callerPhone.e164),
						ilike(crmLeads.phone, `%${escapedNational10}%`),
						sql`regexp_replace(coalesce(${crmLeads.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
					),
				),
			).limit(1);
			if (existing.length > 0) {
				matchedLead = existing[0] ?? null;
			}
		} catch (leadErr) {
			p.request.log.warn({ leadErr, orgId: p.resolvedOrgId }, "[Telephony] Lead lookup warning");
		}
	}

	const displayName = matchedPatient?.fullName?.trim() || matchedLead?.patientName?.trim() || "Неизвестный номер";
	onTenantTxCommit(() => {
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
	});

	return { success: true, event: "ringing", patientId: matchedPatient?.id || null };
}

export async function handleRingingEvent(p: HandleRingingParams) {
	if (p.tx) {
		return runRingingInTx(p.tx, p);
	}
	return withTenantCtx(p.resolvedOrgId, async (tx) => runRingingInTx(tx, p));
}
