import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { patients } from "../../db/schema.js";
import { MissedCallService } from "../../services/telephony/missedCallService.js";
import {
	authenticatePbxWebhook,
	normalizePhoneNumber,
} from "../../services/telephony/telephonySecurity.js";
import {
	checkReplayTimestamp,
	detectTelephonyProvider,
	parseTelephonyCallEvent,
	resolveWebhookOrgId,
} from "./telephonyEngine.js";
import { handleEndedEvent } from "./telephonyWebhookEndedService.js";
import { handleRingingEvent } from "./telephonyWebhookRingingService.js";
import { telephonyWebhookPayloadSchema } from "./types.js";

export async function telephonyWebhookHandler(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	const rawPayload = request.body;
	if (rawPayload == null) {
		return reply.status(400).send({
			error: "Missing 'from' phone number",
			message: "Missing or unparseable 'from' caller phone number in PBX payload",
		});
	}
	if (typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
		return reply.status(400).send({ error: "InvalidPayload", message: "Request body must be a valid JSON object" });
	}

	const parsed = telephonyWebhookPayloadSchema.safeParse(rawPayload);
	if (!parsed.success) {
		return reply.status(400).send({ error: "ValidationError", message: "Missing or malformed payload in PBX request" });
	}
	const data = parsed.data;
	const event = parseTelephonyCallEvent(data);
	const callerRaw = data.from || data.caller_id || data.caller_number || data.CallerIdNum || data.from_number || data.caller || data.client;
	const targetRaw = data.to || data.called_did || data.called_number || data.CalledIdNum || data.to_number || data.called;

	const callerPhone = normalizePhoneNumber(callerRaw);
	const targetPhone = normalizePhoneNumber(targetRaw);
	if (!callerPhone.isValid) {
		return reply.status(400).send({ error: "Missing 'from' phone number", message: "Missing or unparseable caller phone number" });
	}

	const resolvedOrgId = await resolveWebhookOrgId(request.params.organizationId, targetPhone);
	if (!resolvedOrgId) {
		return reply.status(404).send({ error: "OrganizationNotFound", message: "Could not identify tenant organization for this call webhook" });
	}

	const isAuthenticated = await authenticatePbxWebhook(request, reply, resolvedOrgId, data);
	if (!isAuthenticated) return reply;

	const replay = checkReplayTimestamp(data);
	if (!replay.valid) {
		request.log.warn({ resolvedOrgId }, "[Telephony] Replay drift window exceeded");
		return reply.status(400).send({ error: replay.reason });
	}

	return withTenantCtx(resolvedOrgId, async () => {
		const callId = (data.call_id || data.uniqueid || data.CallId || data.callid || data.entry_id || "").trim();
		const recordingUrl = (data.recording_url || data.record_url || data.RecUrl || data.link || "").trim();
		const transcriptionSnippet = (data.transcription_snippet || data.transcript || data.transcription || data.ai_summary || "").trim().slice(0, 1000) || null;
		const rawDuration = data.duration || data.duration_seconds || data.billsec || data.talk_time;
		const durationSeconds = rawDuration != null ? Math.max(0, Number.parseInt(String(rawDuration), 10) || 0) : 0;
		const detectedProvider = detectTelephonyProvider(data, String(data.event || data.notification_name || data.event_type || data.cmd || ""));

		if (event === "ringing") {
			return handleRingingEvent({
				request, resolvedOrgId, callerPhone, targetPhone, targetRaw,
				data, detectedProvider, callId, recordingUrl, transcriptionSnippet,
			});
		}
		if (event === "missed" || (event === "ended" && durationSeconds === 0)) {
			const missed = await MissedCallService.handleMissedCall({
				organizationId: resolvedOrgId, phone: callerPhone.e164, rawPhone: callerPhone.raw,
				callId: callId || null, provider: detectedProvider, reason: event === "missed" ? "missed" : "zero_duration_hangup",
			});
			return { success: true, event: "missed", taskId: missed.taskId, patientId: missed.patientId, isNewLead: missed.isNewLead };
		}
		if (event === "ended") {
			const searchPatient = await db.select().from(patients).where(
				and(
					eq(patients.organizationId, resolvedOrgId),
					or(
						eq(patients.phone, callerPhone.e164),
						ilike(patients.phone, `%${callerPhone.national10}%`),
						sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
					),
				),
			).limit(1);
			return handleEndedEvent({
				request, resolvedOrgId, callerPhone, callId, recordingUrl,
				durationSeconds, transcriptionSnippet, matchedPatient: searchPatient[0] || null,
			});
		}
		return { success: true, event };
	});
}
