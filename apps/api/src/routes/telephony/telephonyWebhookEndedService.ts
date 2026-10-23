import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { communicationEvents, crmLeads, type patients } from "../../db/schema.js";
import {
	type NormalizedPhone,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";

export interface HandleEndedParams {
	request: FastifyRequest;
	resolvedOrgId: string;
	callerPhone: NormalizedPhone;
	callId: string;
	recordingUrl: string;
	durationSeconds: number;
	transcriptionSnippet: string | null;
	matchedPatient: typeof patients.$inferSelect | null;
}

export async function handleEndedEvent(p: HandleEndedParams) {
	if (p.callId || p.recordingUrl) {
		const dedupe: SQL[] = [];
		if (p.callId) dedupe.push(ilike(communicationEvents.message, `%${p.callId}%`));
		if (p.recordingUrl) dedupe.push(eq(communicationEvents.recordingUrl, p.recordingUrl));

		const existing = await db
			.select({ id: communicationEvents.id })
			.from(communicationEvents)
			.where(and(eq(communicationEvents.organizationId, p.resolvedOrgId), or(...dedupe)))
			.limit(1);

		if (existing.length > 0) {
			p.request.log.info({ callId: p.callId, orgId: p.resolvedOrgId }, "[Telephony] CDR idempotent skip");
			return { success: true, duplicate: true };
		}
	}

	let verifiedRecUrl: string | null = null;
	if (p.recordingUrl) {
		const ssrf = await validateSsrfSafeRecordingUrl(p.recordingUrl);
		if (ssrf.valid) {
			verifiedRecUrl = p.recordingUrl;
		} else {
			p.request.log.warn({ url: p.recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recording URL");
		}
	}

	if (p.matchedPatient) {
		await db.insert(communicationEvents).values({
			organizationId: p.resolvedOrgId,
			patientId: p.matchedPatient.id,
			channel: "phone",
			direction: "inbound",
			status: "completed",
			message: p.callId ? `Звонок завершён (call_id: ${p.callId})` : "Звонок завершён (запись приложена)",
			recordingUrl: verifiedRecUrl,
			durationSeconds: p.durationSeconds > 0 ? p.durationSeconds : null,
		});
	}

	if (verifiedRecUrl || p.transcriptionSnippet) {
		try {
			await db
				.update(crmLeads)
				.set({
					...(verifiedRecUrl ? { audioRecordUrl: verifiedRecUrl } : {}),
					...(p.transcriptionSnippet ? { transcriptionSnippet: p.transcriptionSnippet } : {}),
					lastContactedAt: new Date(),
				})
				.where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${p.callerPhone.national10}%`),
						),
					),
				);
		} catch (updateErr) {
			p.request.log.warn({ updateErr, orgId: p.resolvedOrgId }, "[Telephony] Lead recording update warning");
		}
	}

	return { success: true, event: "ended", durationSeconds: p.durationSeconds };
}
