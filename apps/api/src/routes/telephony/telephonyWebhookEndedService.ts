import { and, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { communicationEvents, crmLeads, type patients } from "../../db/schema.js";
import {
	type NormalizedPhone,
	detectMarketingAttribution,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";

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
	durationSeconds: number;
	transcriptionSnippet: string | null;
	matchedPatient: typeof patients.$inferSelect | null;
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	targetRaw?: string | undefined;
	targetPhone?: NormalizedPhone | undefined;
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
	if (p.recordingUrl) {
		const ssrf = await validateSsrfSafeRecordingUrl(p.recordingUrl);
		if (ssrf.valid) {
			verifiedRecUrl = p.recordingUrl;
		} else {
			p.request.log.warn({ url: p.recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recording URL");
		}
	}

	const cleanCallId = p.callId ? p.callId.trim() : "";
	const nextDuration =
		Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
			? Math.min(Math.floor(p.durationSeconds), 86400 * 7)
			: null;

	// Атомарный UPSERT (onConflictDoUpdate) по (organization_id, provider_call_id)
	if (cleanCallId) {
		await db.transaction(async (tx) => {
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

			if (!p.matchedPatient && p.callerPhone.national10.length >= 7) {
				const leadIdempotencyKey = `telephony:lead:ended:${p.resolvedOrgId}:${cleanCallId || p.callerPhone.national10}`;
				const existingLead = await tx
					.select({ id: crmLeads.id })
					.from(crmLeads)
					.where(
						and(
							eq(crmLeads.organizationId, p.resolvedOrgId),
							or(
								eq(crmLeads.phone, p.callerPhone.e164),
								ilike(crmLeads.phone, `%${p.callerPhone.national10}%`),
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

			if (verifiedRecUrl || p.transcriptionSnippet) {
				await tx
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
			}

			p.request.log.info(
				{ callId: cleanCallId, orgId: p.resolvedOrgId, id: savedEvent?.id },
				"[Telephony] CDR upserted call with recording/duration",
			);
		});

		wsBroker.broadcastToOrganization(p.resolvedOrgId, {
			type: "TELEPHONY_CALL_ENDED",
			payload: {
				callId: cleanCallId,
				phone: p.callerPhone.e164,
				durationSeconds: p.durationSeconds,
				timestamp: new Date().toISOString(),
			},
		});

		return { success: true, event: "ended", durationSeconds: p.durationSeconds };
	}

	// Fallback для звонков без provider call_id (по recordingUrl или новый insert)
	if (p.recordingUrl) {
		const existing = await db
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
			await db.transaction(async (tx) => {
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
			});
			return { success: true, duplicate: true, updated: true };
		}
	}

	const fallbackEventIdempotencyKey = `telephony:ended:fallback:${p.resolvedOrgId}:${p.recordingUrl || `${p.callerPhone.national10}_${Date.now()}`}`;
	await db.transaction(async (tx) => {
		await tx.insert(communicationEvents).values({
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
		});

		if (!p.matchedPatient && p.callerPhone.national10.length >= 7) {
			const fallbackLeadKey = `telephony:lead:ended:fallback:${p.resolvedOrgId}:${p.callerPhone.national10}`;
			const existingLead = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${p.callerPhone.national10}%`),
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

		if (verifiedRecUrl || p.transcriptionSnippet) {
			await tx
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
		}
	});

	wsBroker.broadcastToOrganization(p.resolvedOrgId, {
		type: "TELEPHONY_CALL_ENDED",
		payload: {
			callId: p.callId,
			phone: p.callerPhone.e164,
			durationSeconds: p.durationSeconds,
			timestamp: new Date().toISOString(),
		},
	});

	return { success: true, event: "ended", durationSeconds: p.durationSeconds };
}
