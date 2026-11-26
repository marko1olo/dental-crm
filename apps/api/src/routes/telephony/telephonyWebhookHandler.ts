import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { maskPhoneDisplay } from "@dental/shared";
import { onTenantTxCommit, withSavepoint, withTenantCtx } from "../../db/rls.js";
import { crmLeads, patients } from "../../db/schema.js";
import { MissedCallService } from "../../services/telephony/missedCallService.js";
import {
	authenticatePbxWebhook,
	detectMarketingAttribution,
	normalizePhoneNumber,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	checkReplayTimestamp,
	detectTelephonyProvider,
	parseTelephonyCallEvent,
	resolveWebhookOrgId,
} from "./telephonyEngine.js";
import { handleEndedEvent } from "./telephonyWebhookEndedService.js";
import { handleRingingEvent } from "./telephonyWebhookRingingService.js";
import { escapeLikePattern, telephonyWebhookPayloadSchema } from "./types.js";

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

	const callId = (data.call_id || data.uniqueid || data.CallId || data.callid || data.entry_id || "").trim();
	const recordingUrl = (data.recording_url || data.record_url || data.RecUrl || data.link || "").trim();
	const fullTranscript = (data.transcript || data.transcription || data.transcription_snippet || "").trim().slice(0, 50000) || null;
	const aiSummary = (data.ai_summary || "").trim().slice(0, 4000) || null;
	const rawSentiment = typeof data.sentiment === "string" ? data.sentiment.trim().toLowerCase() : "";
	const sentiment =
		rawSentiment === "positive" || rawSentiment === "negative" || rawSentiment === "neutral"
			? rawSentiment
			: null;
	const transcriptionSnippet = (fullTranscript || aiSummary || "").trim().slice(0, 1000) || null;
	const rawDuration = data.duration || data.duration_seconds || data.billsec || data.talk_time;
	const durationSeconds = rawDuration != null ? Math.max(0, Number.parseInt(String(rawDuration), 10) || 0) : 0;
	const detectedProvider = detectTelephonyProvider(data, String(data.event || data.notification_name || data.event_type || data.cmd || ""));

	// SSRF DNS check runs strictly outside PG TX before opening withTenantCtx
	let preVerifiedRecordingUrl: string | null = null;
	if (event === "ended" && recordingUrl) {
		const ssrf = await validateSsrfSafeRecordingUrl(recordingUrl);
		if (ssrf.valid) {
			preVerifiedRecordingUrl = recordingUrl;
		} else {
			request.log.warn({ url: recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recording URL");
		}
	}

	if (event === "missed" || (event === "ended" && durationSeconds === 0)) {
		const rawWait = data.wait_time ?? data.waiting_duration ?? data.duration ?? data.duration_seconds;
		const waitSec = rawWait != null ? Number(rawWait) : undefined;
		const isShortSpam = waitSec !== undefined && !Number.isNaN(waitSec) && waitSec > 0 && waitSec < 5;

		if (isShortSpam) {
			request.log.info({ callerPhone: maskPhoneDisplay(callerPhone.e164), waitSec }, "[Telephony] Suppressing spam lead for short dropped call (<5s)");
			return { success: true, event: "missed", skippedSpam: true };
		}

		const missed = await MissedCallService.handleMissedCall({
			organizationId: resolvedOrgId, phone: callerPhone.e164, rawPhone: callerPhone.raw,
			callId: callId || null, provider: detectedProvider, reason: event === "missed" ? "missed" : "zero_duration_hangup",
			waitDurationSeconds: waitSec, logger: request.log,
		});
		return { success: true, event: "missed", taskId: missed.taskId, leadId: missed.leadId, patientId: missed.patientId, isNewLead: missed.isNewLead };
	}

	const escapedNational10 = escapeLikePattern(callerPhone.national10);

	if (event === "ringing") {
		return withTenantCtx(resolvedOrgId, async (tx) => {
			return handleRingingEvent({
				request, resolvedOrgId, callerPhone, targetPhone, targetRaw,
				data, detectedProvider, callId, recordingUrl, transcriptionSnippet, tx,
			});
		});
	}

	if (event === "answered") {
		if (callerPhone.national10.length >= 7) {
			await withTenantCtx(resolvedOrgId, async (tx) => {
				const searchPatient = await tx.select({ id: patients.id }).from(patients).where(
					and(
						eq(patients.organizationId, resolvedOrgId),
						or(
							eq(patients.phone, callerPhone.e164),
							ilike(patients.phone, `%${escapedNational10}%`),
							sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
						),
					),
				).limit(1);

				if (searchPatient.length === 0) {
					try {
						await withSavepoint(tx, async (spTx) => {
							await spTx.execute(
								sql`SELECT pg_advisory_xact_lock(hashtext(${`telephony:lead:${resolvedOrgId}:${callerPhone.national10}`}))`,
							);
							const calculatedIdempotencyKey = `telephony:lead:answered:${resolvedOrgId}:${callId || callerPhone.national10}`;
							const existing = await spTx.select().from(crmLeads).where(
								and(
									eq(crmLeads.organizationId, resolvedOrgId),
									or(
										eq(crmLeads.phone, callerPhone.e164),
										ilike(crmLeads.phone, `%${escapedNational10}%`),
										callId ? sql`${crmLeads.metadata}->>'callId' = ${callId}` : sql`false`,
										sql`${crmLeads.metadata}->>'idempotencyKey' = ${calculatedIdempotencyKey}`,
									),
								),
							).limit(1);
							if (existing.length === 0) {
								const attribution = detectMarketingAttribution({
									utm_source: data.utm_source,
									utm_campaign: data.utm_campaign,
									utm_medium: data.utm_medium,
									advertising_channel: data.advertising_channel,
									targetRaw,
								});
								const virtualTrunkNumber = targetPhone.e164 || targetRaw || "";
								await spTx.insert(crmLeads).values({
									organizationId: resolvedOrgId,
									name: `Входящий звонок ${callerPhone.e164}`,
									patientName: `Звонок ${callerPhone.e164}`,
									phone: callerPhone.e164,
									source: attribution.channel,
									status: "new",
									notes: `Лид из принятого входящего звонка (${detectedProvider}). Канал: ${attribution.channelLabel}.${virtualTrunkNumber ? ` Номер: ${virtualTrunkNumber}.` : ""} ${callId ? `call_id: ${callId}` : ""}`,
									audioRecordUrl: recordingUrl || null,
									transcriptionSnippet,
									metadata: {
										idempotencyKey: calculatedIdempotencyKey,
										utm_source: data.utm_source || null,
										utm_campaign: data.utm_campaign || null,
										utm_medium: data.utm_medium || null,
										advertising_channel: attribution.channel,
										channelLabel: attribution.channelLabel,
										virtualNumber: virtualTrunkNumber || null,
										callId: callId || null,
									},
									stageEnteredAt: new Date(),
									priority: "normal",
								});
							}
						});
					} catch (leadErr) {
						request.log.warn({ leadErr, orgId: resolvedOrgId }, "[Telephony] Answered lead creation warning");
					}
				}
			});
		}
		return { success: true, event: "answered" };
	}

	if (event === "ended") {
		return withTenantCtx(resolvedOrgId, async (tx) => {
			const searchPatient = await tx.select().from(patients).where(
				and(
					eq(patients.organizationId, resolvedOrgId),
					or(
						eq(patients.phone, callerPhone.e164),
						ilike(patients.phone, `%${escapedNational10}%`),
						sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
					),
				),
			).limit(1);
			return handleEndedEvent({
				request, resolvedOrgId, callerPhone, callId, recordingUrl,
				preVerifiedRecordingUrl,
				durationSeconds, transcriptionSnippet,
				fullTranscript,
				aiSummary,
				sentiment,
				matchedPatient: searchPatient[0] || null,
				utm_source: data.utm_source,
				utm_campaign: data.utm_campaign,
				utm_medium: data.utm_medium,
				advertising_channel: data.advertising_channel,
				targetRaw,
				targetPhone,
				tx,
			});
		});
	}

	return { success: true, event };
}
