import { and, eq, ilike, or, sql } from "drizzle-orm";
import { onTenantTxCommit, withTenantCtx } from "../../../db/rls.js";
import { communicationEvents, crmLeads, patients } from "../../../db/schema.js";
import { wsBroker } from "../../websocketBroker.js";
import type { AsteriskAmiEventPayload } from "./telephonyGatewayConfig.js";

function escapeLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export async function processAsteriskAmiEvent(
	organizationId: string,
	payload: AsteriskAmiEventPayload,
): Promise<{
	success: boolean;
	event: "ringing" | "answered" | "ended";
	patientId: string | null;
	patientName: string;
}> {
	const rawEvent = (payload.event || "Newchannel").toLowerCase();
	let event: "ringing" | "answered" | "ended" = "ringing";

	if (
		rawEvent.includes("ring") ||
		rawEvent.includes("newchannel") ||
		rawEvent.includes("dial")
	) {
		event = "ringing";
	} else if (rawEvent.includes("answer") || rawEvent.includes("bridge")) {
		event = "answered";
	} else if (rawEvent.includes("hangup") || rawEvent.includes("cdr")) {
		event = "ended";
	}

	const callerPhoneRaw = payload.callerIdNum || payload.callerIdName || "";
	const cleanDigits = callerPhoneRaw.replace(/\D/g, "");
	const national10 =
		cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
	const e164 =
		cleanDigits.startsWith("8") || cleanDigits.startsWith("7")
			? `+7${national10}`
			: `+${cleanDigits}`;
	const escapedNational10 = escapeLikePattern(national10);

	const { patient, patientName } = await withTenantCtx(
		organizationId,
		async (tx) => {
			const matchedPatients = national10
				? await tx
						.select({ id: patients.id, fullName: patients.fullName })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								or(
									eq(patients.phone, e164),
									ilike(patients.phone, `%${escapedNational10}%`),
									sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
								),
							),
						)
						.limit(1)
				: [];

			const foundPatient = matchedPatients[0] || null;
			const resolvedName = foundPatient?.fullName || `Звонок Asterisk ${e164}`;

			if (event === "ringing") {
				if (!foundPatient && national10.length >= 7) {
					await tx.execute(
						sql`SELECT pg_advisory_xact_lock(hashtext('telephony:lead:asterisk:' || ${organizationId} || ':' || ${national10}));`,
					);
					const existingLead = await tx
						.select({ id: crmLeads.id })
						.from(crmLeads)
						.where(
							and(
								eq(crmLeads.organizationId, organizationId),
								or(
									eq(crmLeads.phone, e164),
									ilike(crmLeads.phone, `%${escapedNational10}%`),
								),
							),
						)
						.limit(1);

					if (existingLead.length === 0) {
						await tx.insert(crmLeads).values({
							organizationId,
							phone: e164,
							name: `Лид Asterisk ${e164}`,
							source: "telephony_asterisk",
							status: "new",
						});
					}
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "TELEPHONY_INCOMING_CALL",
						payload: {
							phone: e164,
							patientId: foundPatient?.id || null,
							patientName: resolvedName,
							callId: payload.uniqueid || payload.channel || null,
							provider: "asterisk",
							timestamp: new Date().toISOString(),
						},
					});
				});
			} else if (event === "ended") {
				const callId = payload.uniqueid || payload.channel || null;
				const duration =
					typeof payload.billsec === "number"
						? payload.billsec
						: Number.parseInt(String(payload.billsec || "0"), 10) || 0;
				const durationSeconds = duration > 0 ? duration : null;
				const recordingUrl = payload.recordingUrl || null;

				let existingId: string | null = null;
				if (callId) {
					const escapedCallId = escapeLikePattern(callId);
					const existing = await tx
						.select({ id: communicationEvents.id })
						.from(communicationEvents)
						.where(
							and(
								eq(communicationEvents.organizationId, organizationId),
								or(
									eq(communicationEvents.providerCallId, callId),
									ilike(communicationEvents.message, `%ID: ${escapedCallId}%`),
									ilike(
										communicationEvents.message,
										`%call_id: ${escapedCallId}%`,
									),
								),
							),
						)
						.limit(1);
					if (existing.length > 0 && existing[0]) {
						existingId = existing[0].id;
					}
				}

				if (existingId) {
					await tx
						.update(communicationEvents)
						.set({
							status: "completed",
							...(durationSeconds !== null ? { durationSeconds } : {}),
							...(recordingUrl ? { recordingUrl } : {}),
							...(foundPatient?.id ? { patientId: foundPatient.id } : {}),
						})
						.where(
							and(
								eq(communicationEvents.id, existingId),
								eq(communicationEvents.organizationId, organizationId),
							),
						);
				} else if (callId) {
					await tx
						.insert(communicationEvents)
						.values({
							organizationId,
							providerCallId: callId,
							providerName: "asterisk",
							patientId: foundPatient?.id || null,
							callerPhone: e164,
							channel: "phone",
							direction: "inbound",
							status: "completed",
							message: `Локальный звонок Asterisk завершён${!foundPatient ? " (первичный абонент)" : ""}`,
							durationSeconds,
							recordingUrl,
						})
						.onConflictDoUpdate({
							target: [
								communicationEvents.organizationId,
								communicationEvents.providerCallId,
							],
							set: {
								status: "completed",
								...(durationSeconds !== null ? { durationSeconds } : {}),
								...(recordingUrl ? { recordingUrl } : {}),
								...(foundPatient?.id ? { patientId: foundPatient.id } : {}),
							},
						});
				} else {
					await tx.insert(communicationEvents).values({
						organizationId,
						providerCallId: null,
						providerName: "asterisk",
						patientId: foundPatient?.id || null,
						callerPhone: e164,
						channel: "phone",
						direction: "inbound",
						status: "completed",
						message: `Локальный звонок Asterisk завершён${!foundPatient ? " (первичный абонент)" : ""}`,
						durationSeconds,
						recordingUrl,
					});
				}
			}

			return { patient: foundPatient, patientName: resolvedName };
		},
	);

	return {
		success: true,
		event,
		patientId: patient?.id || null,
		patientName,
	};
}
