import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import type { TenantDb } from "../../db/client.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { communicationEvents, crmLeads, uisCallSpeechTranscripts, type patients } from "../../db/schema.js";
import {
	type NormalizedPhone,
	detectMarketingAttribution,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { escapeLikePattern } from "./types.js";

export interface HandleEndedParams {
	request:
		| FastifyRequest
		| {
				log: {
					info: (obj: unknown, msg?: string) => void;
					warn: (obj: unknown, msg?: string) => void;
					error: (obj: unknown, msg?: string) => void;
				};
		  };
	resolvedOrgId: string;
	callerPhone: NormalizedPhone;
	callId: string;
	recordingUrl: string;
	preVerifiedRecordingUrl?: string | null | undefined;
	durationSeconds: number;
	transcriptionSnippet: string | null;
	fullTranscript?: string | null | undefined;
	aiSummary?: string | null | undefined;
	sentiment?: string | null | undefined;
	matchedPatient: typeof patients.$inferSelect | null;
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	targetRaw?: string | undefined;
	targetPhone?: NormalizedPhone | undefined;
	tx?: TenantDb | undefined;
}

async function upsertCallSpeechTranscriptInTx(
	tx: TenantDb,
	params: {
		organizationId: string;
		callId: string;
		patientPhone: string | null;
		durationSeconds: number | null;
		transcript: string | null;
		sentiment: string | null;
		aiSummary: string | null;
	},
) {
	if (!params.callId || (!params.transcript && !params.aiSummary)) {
		return;
	}
	const [existing] = await tx
		.select({ id: uisCallSpeechTranscripts.id })
		.from(uisCallSpeechTranscripts)
		.where(
			and(
				eq(uisCallSpeechTranscripts.organizationId, params.organizationId),
				eq(uisCallSpeechTranscripts.callId, params.callId),
			),
		)
		.orderBy(desc(uisCallSpeechTranscripts.createdAt))
		.limit(1);

	if (existing) {
		await tx
			.update(uisCallSpeechTranscripts)
			.set({
				...(params.patientPhone ? { patientPhone: params.patientPhone } : {}),
				...(params.durationSeconds !== null ? { durationSeconds: params.durationSeconds } : {}),
				...(params.transcript ? { transcript: params.transcript } : {}),
				...(params.sentiment ? { sentiment: params.sentiment } : {}),
				...(params.aiSummary ? { aiSummary: params.aiSummary } : {}),
			})
			.where(
				and(
					eq(uisCallSpeechTranscripts.id, existing.id),
					eq(uisCallSpeechTranscripts.organizationId, params.organizationId),
				),
			);
		return;
	}

	await tx.insert(uisCallSpeechTranscripts).values({
		organizationId: params.organizationId,
		callId: params.callId,
		patientPhone: params.patientPhone,
		durationSeconds: params.durationSeconds,
		transcript: params.transcript,
		sentiment: params.sentiment,
		aiSummary: params.aiSummary,
	});
}

async function runEndedInTx(
	tx: TenantDb,
	p: HandleEndedParams,
	verifiedRecUrl: string | null,
	virtualTrunkNumber: string | null,
	attribution: ReturnType<typeof detectMarketingAttribution>,
) {
	const cleanCallId = p.callId ? p.callId.trim() : "";
	const nextDuration =
		Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
			? Math.min(Math.floor(p.durationSeconds), 86400 * 7)
			: null;
	const escapedNational10 = escapeLikePattern(p.callerPhone.national10);

	// Атомарный UPSERT (onConflictDoUpdate) по (organization_id, provider_call_id)
	if (cleanCallId) {
		const callMessage = `Звонок завершён${!p.matchedPatient ? " (первичный звонок)" : ""}`;
		const eventIdempotencyKey = `telephony:ended:${p.resolvedOrgId}:${cleanCallId}`;
		const [savedEvent] = await tx
			.insert(communicationEvents)
			.values({
				organizationId: p.resolvedOrgId,
				providerCallId: cleanCallId,
				providerName: "telephony",
				patientId: p.matchedPatient?.id || null,
				callerPhone: p.callerPhone.e164,
				channel: "phone",
				direction: "inbound",
				status: "completed",
				message: callMessage,
				recordingUrl: verifiedRecUrl,
				durationSeconds: nextDuration,
				idempotencyKey: eventIdempotencyKey,
			})
			.onConflictDoUpdate({
				target: [communicationEvents.organizationId, communicationEvents.providerCallId],
				set: {
					status: "completed",
					...(verifiedRecUrl ? { recordingUrl: verifiedRecUrl } : {}),
					...(nextDuration !== null ? { durationSeconds: nextDuration } : {}),
					...(p.matchedPatient?.id ? { patientId: p.matchedPatient.id } : {}),
					idempotencyKey: eventIdempotencyKey,
				},
			})
			.returning({
				id: communicationEvents.id,
				recordingUrl: communicationEvents.recordingUrl,
				durationSeconds: communicationEvents.durationSeconds,
			});

		await upsertCallSpeechTranscriptInTx(tx, {
			organizationId: p.resolvedOrgId,
			callId: cleanCallId,
			patientPhone: p.callerPhone.e164,
			durationSeconds: nextDuration,
			transcript: p.fullTranscript ?? p.transcriptionSnippet ?? null,
			sentiment: p.sentiment ?? null,
			aiSummary: p.aiSummary ?? null,
		});

		if (!p.matchedPatient && p.callerPhone.national10.length >= 7) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${`telephony:lead:${p.resolvedOrgId}:${p.callerPhone.national10}`}))`,
			);
			const leadIdempotencyKey = `telephony:lead:ended:${p.resolvedOrgId}:${cleanCallId || p.callerPhone.national10}`;
			const existingLead = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${escapedNational10}%`),
							cleanCallId ? sql`${crmLeads.metadata}->>'callId' = ${cleanCallId}` : sql`false`,
							sql`${crmLeads.metadata}->>'idempotencyKey' = ${leadIdempotencyKey}`,
						),
					),
				)
				.limit(1);

			if (existingLead.length === 0) {
				await tx.insert(crmLeads).values({
					organizationId: p.resolvedOrgId,
					name: `Входящий звонок ${p.callerPhone.e164}`,
					patientName: `Первичный звонок ${p.callerPhone.e164}`,
					phone: p.callerPhone.e164,
					source: attribution.channel || "telephony",
					status: "new",
					notes: `Автоматический лид из входящего звонка телефонии. Канал: ${attribution.channelLabel}.${virtualTrunkNumber ? ` Номер: ${virtualTrunkNumber}.` : ""} call_id: ${cleanCallId}.${p.durationSeconds > 0 ? ` Длительность: ${p.durationSeconds}с.` : ""}`,
					audioRecordUrl: verifiedRecUrl || null,
					transcriptionSnippet: p.transcriptionSnippet || null,
					metadata: {
						idempotencyKey: leadIdempotencyKey,
						utm_source: p.utm_source || null,
						utm_campaign: p.utm_campaign || null,
						utm_medium: p.utm_medium || null,
						advertising_channel: attribution.channel,
						channelLabel: attribution.channelLabel,
						virtualNumber: virtualTrunkNumber,
						callId: cleanCallId || null,
					},
					stageEnteredAt: new Date(),
					priority: "normal",
				});
			}
		}

		if ((verifiedRecUrl || p.transcriptionSnippet) && p.callerPhone.national10.length >= 7) {
			const [latestActiveLead] = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						ne(crmLeads.status, "won"),
						ne(crmLeads.status, "lost"),
						ne(crmLeads.status, "archived"),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${escapedNational10}%`),
						),
					),
				)
				.orderBy(desc(crmLeads.createdAt))
				.limit(1);

			if (latestActiveLead) {
				await tx
					.update(crmLeads)
					.set({
						...(verifiedRecUrl ? { audioRecordUrl: verifiedRecUrl } : {}),
						...(p.transcriptionSnippet ? { transcriptionSnippet: p.transcriptionSnippet } : {}),
						lastContactedAt: new Date(),
					})
					.where(
						and(
							eq(crmLeads.id, latestActiveLead.id),
							eq(crmLeads.organizationId, p.resolvedOrgId),
						),
					);
			}
		}

		p.request.log.info(
			{ callId: cleanCallId, orgId: p.resolvedOrgId, id: savedEvent?.id },
			"[Telephony] CDR upserted call with recording/duration",
		);

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(p.resolvedOrgId, {
				type: "TELEPHONY_CALL_ENDED",
				payload: {
					callId: cleanCallId,
					phone: p.callerPhone.e164,
					durationSeconds: p.durationSeconds,
					timestamp: new Date().toISOString(),
				},
			});
		});

		return { success: true, event: "ended", durationSeconds: p.durationSeconds };
	}

	// Fallback для звонков без provider call_id (по recordingUrl или новый insert)
	if (p.recordingUrl) {
		const existing = await tx
			.select({
				id: communicationEvents.id,
				recordingUrl: communicationEvents.recordingUrl,
				durationSeconds: communicationEvents.durationSeconds,
			})
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, p.resolvedOrgId),
					eq(communicationEvents.recordingUrl, p.recordingUrl),
				),
			)
			.limit(1);

		if (existing.length > 0 && existing[0]) {
			const existingRow = existing[0];
			await tx
				.update(communicationEvents)
				.set({
					...(verifiedRecUrl ? { recordingUrl: verifiedRecUrl } : {}),
					...(nextDuration !== null ? { durationSeconds: nextDuration } : {}),
					status: "completed",
				})
				.where(
					and(
						eq(communicationEvents.id, existingRow.id),
						eq(communicationEvents.organizationId, p.resolvedOrgId),
					),
				);
			return { success: true, duplicate: true, updated: true };
		}
	}

	const fallbackEventIdempotencyKey = `telephony:ended:fallback:${p.resolvedOrgId}:${p.recordingUrl || `${p.callerPhone.national10}_${Date.now()}`}`;
	const [insertedFallbackEvent] = await tx
		.insert(communicationEvents)
		.values({
			organizationId: p.resolvedOrgId,
			patientId: p.matchedPatient?.id || null,
			callerPhone: p.callerPhone.e164,
			channel: "phone",
			direction: "inbound",
			status: "completed",
			message: `Звонок завершён (запись приложена${!p.matchedPatient ? ", первичный звонок" : ""})`,
			recordingUrl: verifiedRecUrl,
			durationSeconds: nextDuration,
			idempotencyKey: fallbackEventIdempotencyKey,
		})
		.returning({ id: communicationEvents.id });

	if (insertedFallbackEvent?.id) {
		await upsertCallSpeechTranscriptInTx(tx, {
			organizationId: p.resolvedOrgId,
			callId: insertedFallbackEvent.id,
			patientPhone: p.callerPhone.e164,
			durationSeconds: nextDuration,
			transcript: p.fullTranscript ?? p.transcriptionSnippet ?? null,
			sentiment: p.sentiment ?? null,
			aiSummary: p.aiSummary ?? null,
		});
	}

	if (!p.matchedPatient && p.callerPhone.national10.length >= 7) {
		await tx.execute(
			sql`SELECT pg_advisory_xact_lock(hashtext(${`telephony:lead:${p.resolvedOrgId}:${p.callerPhone.national10}`}))`,
		);
		const fallbackLeadKey = `telephony:lead:ended:fallback:${p.resolvedOrgId}:${p.callerPhone.national10}`;
		const existingLead = await tx
			.select({ id: crmLeads.id })
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, p.resolvedOrgId),
					or(
						eq(crmLeads.phone, p.callerPhone.e164),
						ilike(crmLeads.phone, `%${escapedNational10}%`),
						sql`${crmLeads.metadata}->>'idempotencyKey' = ${fallbackLeadKey}`,
					),
				),
			)
			.limit(1);

		if (existingLead.length === 0) {
			await tx.insert(crmLeads).values({
				organizationId: p.resolvedOrgId,
				name: `Входящий звонок ${p.callerPhone.e164}`,
				patientName: `Первичный звонок ${p.callerPhone.e164}`,
				phone: p.callerPhone.e164,
				source: attribution.channel || "telephony",
				status: "new",
				notes: `Автоматический лид из входящего звонка телефонии. Канал: ${attribution.channelLabel}.${virtualTrunkNumber ? ` Номер: ${virtualTrunkNumber}.` : ""} ${p.durationSeconds > 0 ? ` Длительность: ${p.durationSeconds}с.` : ""}`,
				audioRecordUrl: verifiedRecUrl || null,
				transcriptionSnippet: p.transcriptionSnippet || null,
				metadata: {
					idempotencyKey: fallbackLeadKey,
					utm_source: p.utm_source || null,
					utm_campaign: p.utm_campaign || null,
					utm_medium: p.utm_medium || null,
					advertising_channel: attribution.channel,
					channelLabel: attribution.channelLabel,
					virtualNumber: virtualTrunkNumber,
					callId: cleanCallId || null,
				},
				stageEnteredAt: new Date(),
				priority: "normal",
			});
		}
	}

	if ((verifiedRecUrl || p.transcriptionSnippet) && p.callerPhone.national10.length >= 7) {
		const [latestActiveLead] = await tx
			.select({ id: crmLeads.id })
			.from(crmLeads)
			.where(
				and(
					eq(crmLeads.organizationId, p.resolvedOrgId),
					ne(crmLeads.status, "won"),
					ne(crmLeads.status, "lost"),
					ne(crmLeads.status, "archived"),
					or(
						eq(crmLeads.phone, p.callerPhone.e164),
						ilike(crmLeads.phone, `%${escapedNational10}%`),
					),
				),
			)
			.orderBy(desc(crmLeads.createdAt))
			.limit(1);

		if (latestActiveLead) {
			await tx
				.update(crmLeads)
				.set({
					...(verifiedRecUrl ? { audioRecordUrl: verifiedRecUrl } : {}),
					...(p.transcriptionSnippet ? { transcriptionSnippet: p.transcriptionSnippet } : {}),
					lastContactedAt: new Date(),
				})
				.where(
					and(
						eq(crmLeads.id, latestActiveLead.id),
						eq(crmLeads.organizationId, p.resolvedOrgId),
					),
				);
		}
	}

	onTenantTxCommit(() => {
		wsBroker.broadcastToOrganization(p.resolvedOrgId, {
			type: "TELEPHONY_CALL_ENDED",
			payload: {
				callId: p.callId,
				phone: p.callerPhone.e164,
				durationSeconds: p.durationSeconds,
				timestamp: new Date().toISOString(),
			},
		});
	});

	return { success: true, event: "ended", durationSeconds: p.durationSeconds };
}

export async function handleEndedEvent(p: HandleEndedParams) {
	const attribution = detectMarketingAttribution({
		utm_source: p.utm_source,
		utm_medium: p.utm_medium,
		utm_campaign: p.utm_campaign,
		advertising_channel: p.advertising_channel,
		targetRaw: p.targetRaw,
		targetPhone: p.targetPhone,
	});
	const virtualTrunkNumber = p.targetPhone?.e164 || p.targetRaw || null;

	let verifiedRecUrl: string | null = null;
	if (p.preVerifiedRecordingUrl !== undefined) {
		verifiedRecUrl = p.preVerifiedRecordingUrl;
	} else if (p.recordingUrl) {
		const ssrf = await validateSsrfSafeRecordingUrl(p.recordingUrl);
		if (ssrf.valid) {
			verifiedRecUrl = p.recordingUrl;
		} else {
			p.request.log.warn({ url: p.recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recording URL");
		}
	}

	if (p.tx) {
		return runEndedInTx(p.tx, p, verifiedRecUrl, virtualTrunkNumber, attribution);
	}

	return withTenantCtx(p.resolvedOrgId, async (tx) => {
		return runEndedInTx(tx, p, verifiedRecUrl, virtualTrunkNumber, attribution);
	});
}
