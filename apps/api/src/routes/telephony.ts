import { and, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import {
	clinics,
	communicationEvents,
	crmLeads,
	patients,
} from "../db/schema.js";
import { MissedCallService } from "../services/telephony/missedCallService.js";
import {
	authenticatePbxWebhook,
	isForbiddenPrivateIp,
	normalizePhoneNumber,
	type NormalizedPhone,
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../services/telephony/telephonySecurity.js";
import { wsBroker } from "../services/websocketBroker.js";
import { telephonyRecordingRoutes } from "./telephonyRecordingRoutes.js";
import { telephonySipRoutes } from "./telephonySipRoutes.js";

// Re-export security utilities for backward compatibility
export {
	UUID_REGEX,
	type NormalizedPhone,
	normalizePhoneNumber,
	authenticatePbxWebhook,
	isForbiddenPrivateIp,
	validateSsrfSafeRecordingUrl,
};

export const telephonyCallEventSchema = z.enum([
	"ringing",
	"call_started",
	"dial-in",
	"answered",
	"connected",
	"ended",
	"hangup",
	"call_ended",
	"cdr",
	"record_ready",
	"missed",
	"no-answer",
	"no_answer",
	"busy",
	"cancel",
	"lost_call",
]);

export type TelephonyCallEvent = z.infer<typeof telephonyCallEventSchema>;

export const telephonyWebhookPayloadSchema = z.object({
	event: z.string().optional(),
	notification_name: z.string().optional(),
	event_type: z.string().optional(),
	from: z.string().optional(),
	caller_id: z.string().optional(),
	caller_number: z.string().optional(),
	CallerIdNum: z.string().optional(),
	from_number: z.string().optional(),
	to: z.string().optional(),
	called_did: z.string().optional(),
	called_number: z.string().optional(),
	CalledIdNum: z.string().optional(),
	to_number: z.string().optional(),
	call_id: z.string().optional(),
	call_session_id: z.string().optional(),
	CallId: z.string().optional(),
	uniqueid: z.string().optional(),
	entry_id: z.string().optional(),
	recording_url: z.string().optional(),
	record_url: z.string().optional(),
	RecUrl: z.string().optional(),
	link: z.string().optional(),
	duration: z.union([z.number(), z.string()]).optional(),
	duration_seconds: z.union([z.number(), z.string()]).optional(),
	billsec: z.union([z.number(), z.string()]).optional(),
	talk_time: z.union([z.number(), z.string()]).optional(),
	timestamp: z.union([z.number(), z.string()]).optional(),
	call_start: z.union([z.number(), z.string()]).optional(),
	call_end: z.union([z.number(), z.string()]).optional(),
	call_duration: z.union([z.number(), z.string()]).optional(),
	api_key: z.string().optional(),
	vpbx_api_key: z.string().optional(),
	sign: z.string().optional(),
	signature: z.string().optional(),
});

export type TelephonyWebhookPayload = z.infer<
	typeof telephonyWebhookPayloadSchema
>;

export const telephonySmsWebhookPayloadSchema = z.object({
	from: z.string().optional(),
	sender: z.string().optional(),
	phone: z.string().optional(),
	to: z.string().optional(),
	message: z.string().optional(),
	text: z.string().optional(),
	sms_id: z.string().optional(),
	call_id: z.string().optional(),
	id: z.string().optional(),
	timestamp: z.union([z.number(), z.string()]).optional(),
});

export type TelephonySmsWebhookPayload = z.infer<
	typeof telephonySmsWebhookPayloadSchema
>;

export const telephonyRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// Register SIP & WebRTC sub-routes
	await server.register(telephonySipRoutes);
	await server.register(telephonyRecordingRoutes);

	// --------------------------------------------------------------------------
	// PBX Call Webhook (supports /:organizationId/webhook and /:organizationId?/webhook)
	// --------------------------------------------------------------------------
	const handleCallWebhook = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const rawPayload = request.body;
		if (typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Request body must be a JSON object",
			});
		}

		if (rawPayload == null) {
			return reply.status(400).send({
				error: "Missing 'from' phone number",
				message:
					"Missing or unparseable 'from' caller phone number in PBX payload",
			});
		}

		const parsed = telephonyWebhookPayloadSchema.safeParse(rawPayload);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Missing or malformed 'from' phone number in PBX payload",
			});
		}
		const data = parsed.data;

		const rawEvent = (
			data.event ||
			data.notification_name ||
			data.event_type ||
			"ringing"
		).toLowerCase();
		let event: "ringing" | "answered" | "ended" | "missed" = "ringing";

		if (
			rawEvent.includes("miss") ||
			rawEvent.includes("no-answer") ||
			rawEvent.includes("no_answer") ||
			rawEvent.includes("lost") ||
			rawEvent.includes("busy") ||
			rawEvent.includes("cancel")
		) {
			event = "missed";
		} else if (
			rawEvent.includes("ring") ||
			rawEvent.includes("start") ||
			rawEvent.includes("dial-in")
		) {
			event = "ringing";
		} else if (rawEvent.includes("answer") || rawEvent.includes("connect")) {
			event = "answered";
		} else if (
			rawEvent.includes("end") ||
			rawEvent.includes("hangup") ||
			rawEvent.includes("cdr") ||
			rawEvent.includes("record")
		) {
			event = "ended";
		}

		const callerRaw =
			data.from ||
			data.caller_id ||
			data.caller_number ||
			data.CallerIdNum ||
			data.from_number;
		const targetRaw =
			data.to ||
			data.called_did ||
			data.called_number ||
			data.CalledIdNum ||
			data.to_number;

		const callerPhone = normalizePhoneNumber(callerRaw);
		const targetPhone = normalizePhoneNumber(targetRaw);

		if (!callerPhone.isValid) {
			return reply.status(400).send({
				error: "Missing 'from' phone number",
				message: "Missing or unparseable 'from' caller phone number",
			});
		}

		let resolvedOrgId: string | null = null;
		const routeOrgId = request.params.organizationId;

		if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
			resolvedOrgId = routeOrgId;
		} else if (targetPhone.isValid) {
			const matchedClinic = await withSuperuserBypass(async (tx) => {
				return tx
					.select({ organizationId: clinics.organizationId })
					.from(clinics)
					.where(
						or(
							eq(clinics.phone, targetPhone.e164),
							ilike(clinics.phone, `%${targetPhone.national10}%`),
							sql`regexp_replace(coalesce(${clinics.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${targetPhone.national10}%`}`,
						),
					)
					.limit(1);
			});
			const clinic = matchedClinic[0];
			if (clinic) {
				resolvedOrgId = clinic.organizationId;
			}
		}

		if (!resolvedOrgId) {
			return reply.status(404).send({
				error: "OrganizationNotFound",
				message: "Could not identify tenant organization for this call webhook",
			});
		}

		const isAuthenticated = await authenticatePbxWebhook(
			request,
			reply,
			resolvedOrgId,
			data,
		);
		if (!isAuthenticated) {
			return reply;
		}

		// Replay protection: check event delivery timestamp.
		let rawTs = data.timestamp || data.call_end;
		if (rawTs == null && data.call_start != null) {
			const startNum =
				typeof data.call_start === "number"
					? data.call_start
					: Number.parseInt(String(data.call_start), 10);
			const durationSec = Number(
				data.duration || data.billsec || data.call_duration || 0,
			);
			rawTs =
				!Number.isNaN(startNum) && startNum > 0
					? startNum > 1e11
						? startNum + durationSec * 1000
						: startNum + durationSec
					: data.call_start;
		}
		if (rawTs != null) {
			const numTs =
				typeof rawTs === "number" ? rawTs : Number.parseInt(String(rawTs), 10);
			if (!Number.isNaN(numTs) && numTs > 0) {
				const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					request.log.warn(
						{ msgTsSec, nowSec, resolvedOrgId },
						"[Telephony] Replay timestamp drift window exceeded (>300s)",
					);
					return reply.status(400).send({
						error: "Timestamp drift window exceeded (>300s)",
					});
				}
			}
		}

		return withTenantCtx(resolvedOrgId, async () => {
			const callId = (
				data.call_id ||
				data.uniqueid ||
				data.CallId ||
				data.entry_id ||
				""
			).trim();
			const recordingUrl = (
				data.recording_url ||
				data.record_url ||
				data.RecUrl ||
				data.link ||
				""
			).trim();

			const rawDuration =
				data.duration ||
				data.duration_seconds ||
				data.billsec ||
				data.talk_time;
			const durationSeconds =
				rawDuration != null
					? Math.max(0, Number.parseInt(String(rawDuration), 10) || 0)
					: 0;

			// Match Patient within this tenant
			const searchPatient = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, resolvedOrgId),
						or(
							eq(patients.phone, callerPhone.e164),
							ilike(patients.phone, `%${callerPhone.national10}%`),
							sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
							sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
						),
					),
				)
				.limit(1);

			const matchedPatient = searchPatient[0] || null;

			// Detect provider from payload fingerprint
			const detectedProvider =
				data.vpbx_api_key || data.sign || rawEvent.includes("mango")
					? "mango"
					: data.call_session_id ||
							data.from_number ||
							data.notification_name
						? "uis"
						: data.CallerIdNum || data.uniqueid || data.CalledIdNum
							? "asterisk"
							: data.signature || data.caller_id
								? "zadarma"
								: "mango";

			if (event === "ringing") {
				let matchedLead: typeof crmLeads.$inferSelect | null = null;

				if (!matchedPatient && callerPhone.national10.length >= 7) {
					try {
						matchedLead = await db.transaction(async (tx) => {
							// Advisory lock per organization and national caller phone to serialize concurrent ringing webhooks
							await tx.execute(
								sql`SELECT pg_advisory_xact_lock(hashtext(${`telephony:lead:${resolvedOrgId}:${callerPhone.national10}`}))`,
							);

							const existingLeads = await tx
								.select()
								.from(crmLeads)
								.where(
									and(
										eq(crmLeads.organizationId, resolvedOrgId),
										or(
											eq(crmLeads.phone, callerPhone.e164),
											ilike(crmLeads.phone, `%${callerPhone.national10}%`),
											sql`regexp_replace(coalesce(${crmLeads.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
										),
									),
								)
								.limit(1);

							if (existingLeads.length > 0) {
								return existingLeads[0] ?? null;
							}

							const insertedLeads = await tx
								.insert(crmLeads)
								.values({
									organizationId: resolvedOrgId,
									name: `Входящий звонок ${callerPhone.e164}`,
									patientName: `Звонок ${callerPhone.e164}`,
									phone: callerPhone.e164,
									source: "telephony",
									status: "new",
									notes: `Автоматический лид из входящего звонка АТС (${callId ? `call_id: ${callId}` : "прямой вызов"})`,
								})
								.returning();
							return insertedLeads[0] ?? null;
						});
					} catch (leadErr) {
						request.log.warn(
							{ leadErr, resolvedOrgId },
							"[Telephony] Lead creation lock resolution warning",
						);
					}
				}

				const patientDisplayName =
					matchedPatient?.fullName?.trim() ||
					matchedLead?.patientName?.trim() ||
					"Неизвестный номер";

				wsBroker.broadcastToOrganization(resolvedOrgId, {
					type: "TELEPHONY_INCOMING_CALL",
					payload: {
						phone: callerPhone.e164,
						patientId: matchedPatient?.id || null,
						patientName: patientDisplayName,
						callId: callId || null,
						provider: detectedProvider,
						timestamp: new Date().toISOString(),
					},
				});

				return {
					success: true,
					event: "ringing",
					patientId: matchedPatient?.id || null,
				};
			}

			if (event === "missed" || (event === "ended" && durationSeconds === 0)) {
				const missedResult = await MissedCallService.handleMissedCall({
					organizationId: resolvedOrgId,
					phone: callerPhone.e164,
					rawPhone: callerPhone.raw,
					callId: callId || null,
					provider: detectedProvider,
					reason: event === "missed" ? "missed" : "zero_duration_hangup",
				});

				return {
					success: true,
					event: "missed",
					taskId: missedResult.taskId,
					patientId: missedResult.patientId,
					isNewLead: missedResult.isNewLead,
				};
			}

			if (event === "ended") {
				if (callId || recordingUrl) {
					const dedupeConditions: SQL[] = [];
					if (callId) {
						dedupeConditions.push(
							ilike(communicationEvents.message, `%${callId}%`),
						);
					}
					if (recordingUrl) {
						dedupeConditions.push(
							eq(communicationEvents.recordingUrl, recordingUrl),
						);
					}

					const existingEvent = await db
						.select({ id: communicationEvents.id })
						.from(communicationEvents)
						.where(
							and(
								eq(communicationEvents.organizationId, resolvedOrgId),
								or(...dedupeConditions),
							),
						)
						.limit(1);

					if (existingEvent.length > 0) {
						request.log.info(
							{ callId, recordingUrl, resolvedOrgId },
							"[Telephony] CDR event already processed (idempotent skip)",
						);
						return { success: true, duplicate: true };
					}
				}

				if (matchedPatient) {
					let verifiedRecUrl: string | null = null;
					if (recordingUrl) {
						const ssrfCheck = await validateSsrfSafeRecordingUrl(recordingUrl);
						if (ssrfCheck.valid) {
							verifiedRecUrl = recordingUrl;
						} else {
							request.log.warn(
								{ recordingUrl, error: ssrfCheck.error },
								"[Telephony] Recording URL blocked by SSRF filter",
							);
						}
					}

					await db.insert(communicationEvents).values({
						organizationId: resolvedOrgId,
						patientId: matchedPatient.id,
						channel: "phone",
						direction: "inbound",
						status: "completed",
						message: callId
							? `Звонок завершён (call_id: ${callId})`
							: "Звонок завершён (запись приложена)",
						recordingUrl: verifiedRecUrl,
						durationSeconds: durationSeconds > 0 ? durationSeconds : null,
					});
				}

				return { success: true, event: "ended", durationSeconds };
			}

			return { success: true, event };
		});
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/webhook",
		handleCallWebhook,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/webhook",
		handleCallWebhook,
	);

	// --------------------------------------------------------------------------
	// SMS Webhook (supports /:organizationId/sms/webhook and /sms/webhook)
	// --------------------------------------------------------------------------
	const handleSmsWebhook = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const rawPayload = request.body;
		if (
			!rawPayload ||
			typeof rawPayload !== "object" ||
			Array.isArray(rawPayload)
		) {
			return reply.status(400).send({
				error: "InvalidPayload",
				message: "Request body must be a JSON object",
			});
		}

		const parsed = telephonySmsWebhookPayloadSchema.safeParse(rawPayload);
		if (!parsed.success) {
			return reply
				.status(400)
				.send({ error: "Missing 'from' or 'message'" });
		}
		const data = parsed.data;

		const fromRaw = data.from || data.sender || data.phone;
		const messageText = (data.message || data.text || "").trim();

		const callerPhone = normalizePhoneNumber(fromRaw);
		if (!callerPhone.isValid || !messageText) {
			return reply
				.status(400)
				.send({ error: "Missing 'from' or 'message'" });
		}

		let resolvedOrgId: string | null = null;
		const routeOrgId = request.params.organizationId;

		if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
			resolvedOrgId = routeOrgId;
		} else if (data.to) {
			const targetPhone = normalizePhoneNumber(data.to);
			if (targetPhone.isValid) {
				const matchedClinic = await withSuperuserBypass(async (tx) => {
					return tx
						.select({ organizationId: clinics.organizationId })
						.from(clinics)
						.where(ilike(clinics.phone, `%${targetPhone.national10}%`))
						.limit(1);
				});
				const clinic = matchedClinic[0];
				if (clinic) {
					resolvedOrgId = clinic.organizationId;
				}
			}
		}

		if (!resolvedOrgId) {
			return reply.status(404).send({
				error: "OrganizationNotFound",
				message: "Tenant organization could not be resolved",
			});
		}

		const isAuthenticated = await authenticatePbxWebhook(
			request,
			reply,
			resolvedOrgId,
			data as TelephonyWebhookPayload,
		);
		if (!isAuthenticated) {
			return reply;
		}

		const rawSmsTs = data.timestamp;
		if (rawSmsTs != null) {
			const numTs =
				typeof rawSmsTs === "number"
					? rawSmsTs
					: Number.parseInt(String(rawSmsTs), 10);
			if (!Number.isNaN(numTs) && numTs > 0) {
				const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
				const nowSec = Math.floor(Date.now() / 1000);
				if (Math.abs(nowSec - msgTsSec) > 300) {
					return reply.status(400).send({
						error: "Timestamp drift window exceeded (>300s)",
					});
				}
			}
		}

		return withTenantCtx(resolvedOrgId, async () => {
			const smsId = (data.sms_id || data.call_id || data.id || "").trim();

			if (smsId) {
				const existingSms = await db
					.select({ id: communicationEvents.id })
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.organizationId, resolvedOrgId),
							ilike(communicationEvents.message, `%${smsId}%`),
						),
					)
					.limit(1);

				if (existingSms.length > 0) {
					request.log.info(
						{ smsId, resolvedOrgId },
						"[Telephony] SMS webhook duplicate received (idempotent skip)",
					);
					return { success: true, duplicate: true };
				}
			}

			const searchPatient = await db
				.select()
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, resolvedOrgId),
						or(
							eq(patients.phone, callerPhone.e164),
							ilike(patients.phone, `%${callerPhone.national10}%`),
							sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
							sql`regexp_replace(coalesce(${patients.administrativeProfile}->>'legalRepresentativePhone', ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
						),
					),
				)
				.limit(1);

			let patient = searchPatient[0] || null;

			if (!patient) {
				const inserted = await db
					.insert(patients)
					.values({
						organizationId: resolvedOrgId,
						fullName: `SMS User ${callerPhone.e164}`,
						phone: callerPhone.e164,
						notes: "Лид из входящего SMS",
						status: "active",
					})
					.returning();
				patient = inserted[0] || null;
			}

			if (!patient) {
				return reply.status(500).send({
					error: "PatientPersistenceError",
					message: "Failed to persist patient",
				});
			}

			await db.insert(communicationEvents).values({
				organizationId: resolvedOrgId,
				patientId: patient.id,
				channel: "sms",
				direction: "inbound",
				status: "delivered",
				message: smsId ? `${messageText} [sms_id: ${smsId}]` : messageText,
			});

			wsBroker.broadcastToOrganization(resolvedOrgId, {
				type: "INBOX_NEW_MESSAGE",
				payload: {
					channel: "sms",
					patientId: patient.id,
					text: messageText,
				},
			});

			return { success: true };
		});
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/sms/webhook",
		handleSmsWebhook,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/sms/webhook",
		handleSmsWebhook,
	);
};

