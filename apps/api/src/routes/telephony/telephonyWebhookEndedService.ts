import { and, eq, ilike, or, type SQL } from "drizzle-orm";
import type { FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { communicationEvents, crmLeads, type patients } from "../../db/schema.js";
import {
	type NormalizedPhone,
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
}

export async function handleEndedEvent(p: HandleEndedParams) {
	let verifiedRecUrl: string | null = null;
	if (p.recordingUrl) {
		const ssrf = await validateSsrfSafeRecordingUrl(p.recordingUrl);
		if (ssrf.valid) {
			verifiedRecUrl = p.recordingUrl;
		} else {
			p.request.log.warn({ url: p.recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recording URL");
		}
	}

	if (p.callId || p.recordingUrl) {
		let existing = p.callId
			? await db
					.select({
						id: communicationEvents.id,
						recordingUrl: communicationEvents.recordingUrl,
						durationSeconds: communicationEvents.durationSeconds,
					})
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.organizationId, p.resolvedOrgId),
							ilike(communicationEvents.message, `%${p.callId}%`),
						),
					)
					.limit(1)
			: [];

		if (existing.length === 0 && p.recordingUrl) {
			existing = await db
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
		}

		if (existing.length > 0 && existing[0]) {
			const existingRow = existing[0];
			const nextDuration =
				Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
					? Math.min(Math.floor(p.durationSeconds), 86400 * 7)
					: existingRow.durationSeconds ?? null;
			const nextRecUrl = verifiedRecUrl || existingRow.recordingUrl || null;

			await db.transaction(async (tx) => {
				await tx
					.update(communicationEvents)
					.set({
						...(nextRecUrl ? { recordingUrl: nextRecUrl } : {}),
						...(nextDuration !== null ? { durationSeconds: nextDuration } : {}),
						status: "completed",
					})
					.where(eq(communicationEvents.id, existingRow.id));

				if (nextRecUrl || p.transcriptionSnippet) {
					await tx
						.update(crmLeads)
						.set({
							...(nextRecUrl ? { audioRecordUrl: nextRecUrl } : {}),
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

			p.request.log.info(
				{ callId: p.callId, orgId: p.resolvedOrgId, id: existingRow.id },
				"[Telephony] CDR updated existing call with recording/duration",
			);
			return { success: true, duplicate: true, updated: true };
		}
	}

	await db.transaction(async (tx) => {
		await tx.insert(communicationEvents).values({
			organizationId: p.resolvedOrgId,
			patientId: p.matchedPatient?.id || null,
			callerPhone: p.callerPhone.e164,
			channel: "phone",
			direction: "inbound",
			status: "completed",
			message: p.callId
				? `Звонок завершён (call_id: ${p.callId}${!p.matchedPatient ? ", первичный звонок" : ""})`
				: `Звонок завершён (запись приложена${!p.matchedPatient ? ", первичный звонок" : ""})`,
			recordingUrl: verifiedRecUrl,
			durationSeconds: Number.isFinite(p.durationSeconds) && p.durationSeconds > 0
				? Math.min(Math.floor(p.durationSeconds), 86400 * 7)
				: null,
		});

		if (!p.matchedPatient && p.callerPhone.national10.length >= 7) {
			const existingLead = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, p.resolvedOrgId),
						or(
							eq(crmLeads.phone, p.callerPhone.e164),
							ilike(crmLeads.phone, `%${p.callerPhone.national10}%`),
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
					source: "telephony",
					status: "new",
					notes: `Автоматический лид из входящего звонка телефонии. ${p.callId ? `call_id: ${p.callId}.` : ""}${p.durationSeconds > 0 ? ` Длительность: ${p.durationSeconds}с.` : ""}`,
					audioRecordUrl: verifiedRecUrl || null,
					transcriptionSnippet: p.transcriptionSnippet || null,
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
