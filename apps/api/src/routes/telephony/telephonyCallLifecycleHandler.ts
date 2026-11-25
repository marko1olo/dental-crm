import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { onTenantTxCommit, withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { communicationEvents, crmLeads, patients } from "../../db/schema.js";
import {
	detectMarketingAttribution,
	normalizePhoneNumber,
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import {
	escapeLikePattern,
	telephonyAnswerCallBodySchema,
	telephonyEndCallBodySchema,
} from "./types.js";

export interface AnswerCallBody {
	callId: string;
	phone: string;
	patientId?: string | undefined;
	lineId?: 1 | 2 | undefined;
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	virtualNumber?: string | undefined;
}

export interface EndCallBody {
	callId: string;
	phone: string;
	patientId?: string | undefined;
	direction?: "inbound" | "outbound" | undefined;
	durationSeconds?: number | undefined;
	recordingUrl?: string | undefined;
	outcome?: string | undefined;
	notes?: string | undefined;
	utm_source?: string | undefined;
	utm_campaign?: string | undefined;
	utm_medium?: string | undefined;
	advertising_channel?: string | undefined;
	virtualNumber?: string | undefined;
}

export async function handleAnswerCall(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: AnswerCallBody;
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	const context = await requireClinicalMutationContext(request, reply, "answer call");
	if (!context) return;
	const resolvedOrgId = context.organizationId;
	if (rawOrgId && rawOrgId !== resolvedOrgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}

	const parsedBody = telephonyAnswerCallBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры ответа на звонок",
		});
	}

	const body = parsedBody.data;
	const rawIdempotencyKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim()
		? rawIdempotencyKey.trim()
		: `telephony:lead:answer:${resolvedOrgId}:${body.callId}`;
	const callerPhone = normalizePhoneNumber(body.phone);
	const callId = body.callId;
	const now = new Date().toISOString();

	// Постоянный лид регистрируется при ответе на звонок (event: "answered"), исключая спам первого гудка
	if (callerPhone.isValid && callerPhone.national10.length >= 7) {
		const targetOrgId = resolvedOrgId;
		const escapedNational10 = escapeLikePattern(callerPhone.national10);
		try {
			await withTenantCtx(targetOrgId, async (tx) => {
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext('telephony:lead:' || ${targetOrgId} || ':' || ${callerPhone.national10}))`,
				);

				let targetPatientId: string | null = body.patientId || null;
				if (!targetPatientId) {
					const searchPatient = await tx
						.select({ id: patients.id })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, targetOrgId),
								or(
									eq(patients.phone, callerPhone.e164),
									ilike(patients.phone, `%${escapedNational10}%`),
									sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
								),
							),
						)
						.limit(1);
					targetPatientId = searchPatient[0]?.id || null;
				}

				if (!targetPatientId) {
					const existingLead = await tx
						.select({ id: crmLeads.id })
						.from(crmLeads)
						.where(
							and(
								eq(crmLeads.organizationId, targetOrgId),
								or(
									eq(crmLeads.phone, callerPhone.e164),
									ilike(crmLeads.phone, `%${escapedNational10}%`),
									callId ? sql`${crmLeads.metadata}->>'callId' = ${callId}` : sql`false`,
									sql`${crmLeads.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
								),
							),
						)
						.limit(1);

					if (existingLead.length === 0) {
						const attribution = detectMarketingAttribution({
							utm_source: body.utm_source,
							utm_campaign: body.utm_campaign,
							utm_medium: body.utm_medium,
							advertising_channel: body.advertising_channel,
							targetRaw: body.virtualNumber,
						});
						await tx.insert(crmLeads).values({
							organizationId: targetOrgId,
							name: `Входящий звонок ${callerPhone.e164}`,
							patientName: `Звонок ${callerPhone.e164}`,
							phone: callerPhone.e164,
							source: attribution.channel || "telephony",
							status: "new",
							notes: `Лид из принятого входящего звонка (call_id: ${callId})`,
							metadata: {
								idempotencyKey,
								utm_source: body.utm_source || null,
								utm_campaign: body.utm_campaign || null,
								utm_medium: body.utm_medium || null,
								advertising_channel: attribution.channel,
								channelLabel: attribution.channelLabel,
								virtualNumber: body.virtualNumber || null,
								callId,
							},
							stageEnteredAt: new Date(),
							priority: "normal",
						});
					}
				}
			});
		} catch (err) {
			request.log.warn({ err, orgId: targetOrgId }, "[Telephony] Answer call lead creation warning");
		}
	}

	wsBroker.broadcastToOrganization(resolvedOrgId, {
		type: "TELEPHONY_CALL_ANSWERED",
		payload: {
			callId,
			phone: callerPhone.isValid ? callerPhone.e164 : body.phone,
			patientId: body.patientId || null,
			lineId: body.lineId || 1,
			answeredAt: now,
		},
	});

	return reply.status(200).send({
		success: true,
		callId,
		status: "answered",
		answeredAt: now,
	});
}

export async function handleEndCall(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: EndCallBody;
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	const context = await requireClinicalMutationContext(request, reply, "end call");
	if (!context) return;
	const resolvedOrgId = context.organizationId;
	if (rawOrgId && rawOrgId !== resolvedOrgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}
	const orgId = resolvedOrgId;

	const parsedBody = telephonyEndCallBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры завершения звонка",
		});
	}

	const body = parsedBody.data;
	const rawIdempotencyKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim()
		? rawIdempotencyKey.trim()
		: `telephony:end:${orgId}:${body.callId}`;
	const callerPhone = normalizePhoneNumber(body.phone);
	const callId = body.callId;
	const parsedDuration = body.durationSeconds ?? NaN;
	const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0
		? Math.min(Math.floor(parsedDuration), 86400 * 7)
		: null;
	const isCompleted = durationSeconds !== null && durationSeconds > 0;
	const phoneStr = callerPhone.isValid ? callerPhone.e164 : (body.phone || "не указан");
	const escapedNational10 = escapeLikePattern(callerPhone.national10);

	// Validate recording URL SSRF safety outside PG TX
	let verifiedRecordingUrl: string | null = null;
	if (body.recordingUrl?.trim()) {
		const ssrf = await validateSsrfSafeRecordingUrl(body.recordingUrl.trim());
		if (ssrf.valid) {
			verifiedRecordingUrl = body.recordingUrl.trim();
		} else {
			request.log.warn({ url: body.recordingUrl, err: ssrf.error }, "[Telephony] SSRF rejected recordingUrl on endCall");
		}
	}

	await withTenantCtx(orgId, async (tx) => {
		let targetPatientId: string | null = null;
		if (body.patientId && UUID_REGEX.test(body.patientId)) {
			targetPatientId = body.patientId;
		} else if (callerPhone.isValid && callerPhone.national10.length >= 7) {
			const found = await tx.select({ id: patients.id }).from(patients).where(
				and(
					eq(patients.organizationId, orgId),
					or(
						eq(patients.phone, callerPhone.e164),
						ilike(patients.phone, `%${escapedNational10}%`),
						sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
					),
				),
			).limit(1);
			if (found.length > 0 && found[0]?.id) {
				targetPatientId = found[0].id;
			}
		}

		const existingEvents = await tx
			.select({
				id: communicationEvents.id,
				recordingUrl: communicationEvents.recordingUrl,
				durationSeconds: communicationEvents.durationSeconds,
				message: communicationEvents.message,
			})
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					or(
						eq(communicationEvents.providerCallId, callId),
						UUID_REGEX.test(callId) ? eq(communicationEvents.id, callId) : sql`false`,
					),
				),
			)
			.limit(1);

		if (existingEvents.length > 0 && existingEvents[0]) {
			const existing = existingEvents[0];
			const updatedMessage = body.notes
				? `${existing.message}\nЗаметка: ${body.notes}`
				: existing.message;
			await tx
				.update(communicationEvents)
				.set({
					...(targetPatientId ? { patientId: targetPatientId } : {}),
					status: isCompleted ? "completed" : "needs_call",
					message: updatedMessage,
					...(verifiedRecordingUrl ? { recordingUrl: verifiedRecordingUrl } : {}),
					...(durationSeconds !== null && (existing.durationSeconds === null || durationSeconds > 0)
						? { durationSeconds }
						: {}),
					...(idempotencyKey ? { idempotencyKey } : {}),
				})
				.where(
					and(
						eq(communicationEvents.id, existing.id),
						eq(communicationEvents.organizationId, orgId),
					),
				);
		} else {
			await tx.insert(communicationEvents).values({
				organizationId: orgId,
				providerCallId: callId,
				providerName: "telephony",
				patientId: targetPatientId || null,
				callerPhone: callerPhone.isValid ? callerPhone.e164 : (body.phone || null),
				channel: "phone",
				direction: body.direction === "outbound" ? "outbound" : "inbound",
				status: isCompleted ? "completed" : "needs_call",
				message: body.notes
					? `Звонок (${phoneStr}): ${body.notes}`
					: `Звонок (${phoneStr})`,
				recordingUrl: verifiedRecordingUrl,
				durationSeconds,
				idempotencyKey,
			});
		}

		// Если пациент не найден и телефон валиден — синхронизируем crmLeads в той же ACID транзакции
		if (!targetPatientId && callerPhone.isValid && callerPhone.national10.length >= 7) {
			await tx.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext('telephony:lead:' || ${orgId} || ':' || ${callerPhone.national10}))`,
			);
			const existing = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(
					and(
						eq(crmLeads.organizationId, orgId),
						or(
							eq(crmLeads.phone, callerPhone.e164),
							ilike(crmLeads.phone, `%${escapedNational10}%`),
							callId ? sql`${crmLeads.metadata}->>'callId' = ${callId}` : sql`false`,
							sql`${crmLeads.metadata}->>'idempotencyKey' = ${idempotencyKey}`,
						),
					),
				)
				.limit(1);

			if (existing.length > 0 && existing[0]?.id) {
				await tx
					.update(crmLeads)
					.set({
						lastContactedAt: new Date(),
						...(body.notes ? { notes: body.notes } : {}),
					})
					.where(
						and(
							eq(crmLeads.id, existing[0].id),
							eq(crmLeads.organizationId, orgId),
						),
					);
			} else {
				const attribution = detectMarketingAttribution({
					utm_source: body.utm_source,
					utm_campaign: body.utm_campaign,
					utm_medium: body.utm_medium,
					advertising_channel: body.advertising_channel,
					targetRaw: body.virtualNumber,
				});
				await tx.insert(crmLeads).values({
					organizationId: orgId,
					phone: callerPhone.e164,
					patientName: "Новый лид",
					name: "Новый лид",
					source: attribution.channel || "telephony",
					status: "new",
					lastContactedAt: new Date(),
					metadata: {
						idempotencyKey,
						utm_source: body.utm_source || null,
						utm_campaign: body.utm_campaign || null,
						utm_medium: body.utm_medium || null,
						advertising_channel: attribution.channel,
						channelLabel: attribution.channelLabel,
						virtualNumber: body.virtualNumber || null,
						callId,
					},
					...(body.notes ? { notes: body.notes } : {}),
				});
			}
		}

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(orgId, {
				type: "TELEPHONY_CALL_ENDED",
				payload: {
					callId,
					phone: phoneStr,
					durationSeconds: durationSeconds || 0,
					timestamp: new Date().toISOString(),
				},
			});
		});
	});

	return reply.status(200).send({
		success: true,
		callId,
		status: "ended",
		durationSeconds: durationSeconds || 0,
	});
}

export async function cleanupStaleRingingCalls(
	organizationId?: string,
	timeoutSeconds = 300,
): Promise<{ cleanedCount: number }> {
	const cutoff = new Date(Date.now() - timeoutSeconds * 1000);
	const hasTenantOrg = Boolean(organizationId && UUID_REGEX.test(organizationId));

	const runCleanup = async (tx: Parameters<Parameters<typeof withTenantCtx>[1]>[0]) => {
		const conditions = [
			eq(communicationEvents.channel, "phone"),
			eq(communicationEvents.status, "queued"),
			sql`${communicationEvents.createdAt} < ${cutoff}`,
			sql`(${communicationEvents.durationSeconds} IS NULL OR ${communicationEvents.durationSeconds} = 0)`,
		];
		if (hasTenantOrg && organizationId) {
			conditions.push(eq(communicationEvents.organizationId, organizationId));
		}

		const stale = await tx
			.select({
				id: communicationEvents.id,
				organizationId: communicationEvents.organizationId,
				callerPhone: communicationEvents.callerPhone,
				providerCallId: communicationEvents.providerCallId,
			})
			.from(communicationEvents)
			.where(and(...conditions))
			.limit(100);

		if (stale.length === 0) {
			return { cleanedCount: 0 };
		}

		for (const row of stale) {
			await tx
				.update(communicationEvents)
				.set({
					status: "failed",
					message: sql`coalesce(${communicationEvents.message}, '') || ' [Авто-завершение: таймаут звонка >300с]'`,
				})
				.where(
					and(
						eq(communicationEvents.id, row.id),
						eq(communicationEvents.organizationId, row.organizationId),
					),
				);

			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(row.organizationId, {
					type: "TELEPHONY_CALL_ENDED",
					payload: {
						callId: row.providerCallId || row.id,
						phone: row.callerPhone || "",
						durationSeconds: 0,
						timestamp: new Date().toISOString(),
					},
				});
			});
		}

		return { cleanedCount: stale.length };
	};

	if (hasTenantOrg && organizationId) {
		return withTenantCtx(organizationId, runCleanup);
	}
	return withSuperuserBypass(runCleanup);
}

export async function handleCleanupStaleCalls(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	const context = await requireClinicalMutationContext(request, reply, "cleanup stale calls");
	if (!context) return;
	const orgId = context.organizationId;
	const rawOrgId = request.params.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}
	const result = await cleanupStaleRingingCalls(orgId, 300);
	return reply.status(200).send({ success: true, ...result });
}

export const telephonyCallLifecycleRoutes: FastifyPluginAsync = async (server) => {
	server.post<{ Params: { organizationId: string }; Body: AnswerCallBody }>(
		"/:organizationId/calls/answer",
		{ config: { tenantTxSelfManaged: true } },
		handleAnswerCall,
	);
	server.post<{ Params: { organizationId?: string }; Body: AnswerCallBody }>(
		"/calls/answer",
		{ config: { tenantTxSelfManaged: true } },
		handleAnswerCall,
	);

	server.post<{ Params: { organizationId: string }; Body: EndCallBody }>(
		"/:organizationId/calls/end",
		{ config: { tenantTxSelfManaged: true } },
		handleEndCall,
	);
	server.post<{ Params: { organizationId?: string }; Body: EndCallBody }>(
		"/calls/end",
		{ config: { tenantTxSelfManaged: true } },
		handleEndCall,
	);

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/calls/cleanup-stale",
		{ config: { tenantTxSelfManaged: true } },
		handleCleanupStaleCalls,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/calls/cleanup-stale",
		{ config: { tenantTxSelfManaged: true } },
		handleCleanupStaleCalls,
	);
};
