import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents, crmLeads, patients } from "../../db/schema.js";
import {
	normalizePhoneNumber,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";

export interface AnswerCallBody {
	callId: string;
	phone: string;
	patientId?: string;
	lineId?: 1 | 2;
}

export interface EndCallBody {
	callId: string;
	phone: string;
	patientId?: string;
	direction?: "inbound" | "outbound";
	durationSeconds?: number;
	recordingUrl?: string;
	outcome?: string;
	notes?: string;
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

	const body = request.body || ({} as AnswerCallBody);
	const callerPhone = normalizePhoneNumber(body.phone);
	const callId = body.callId || `call-${Date.now()}`;
	const now = new Date().toISOString();

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

	// Постоянный лид регистрируется при ответе на звонок (event: "answered"), исключая спам первого гудка
	if (callerPhone.isValid && callerPhone.national10.length >= 7) {
		const targetOrgId = resolvedOrgId;
		void withTenantCtx(targetOrgId, async () => {
			try {
				await db.transaction(async (tx) => {
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
										ilike(patients.phone, `%${callerPhone.national10}%`),
										sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
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
										ilike(crmLeads.phone, `%${callerPhone.national10}%`),
									),
								),
							)
							.limit(1);

						if (existingLead.length === 0) {
							await tx.insert(crmLeads).values({
								organizationId: targetOrgId,
								name: `Входящий звонок ${callerPhone.e164}`,
								patientName: `Звонок ${callerPhone.e164}`,
								phone: callerPhone.e164,
								source: "telephony",
								status: "new",
								notes: `Лид из принятого входящего звонка (call_id: ${callId})`,
								stageEnteredAt: new Date(),
								priority: "normal",
							});
						}
					}
				});
			} catch (err) {
				request.log.warn({ err, orgId: targetOrgId }, "[Telephony] Answer call lead creation warning");
			}
		}).catch((err) => {
			request.log.warn({ err, orgId: targetOrgId }, "[Telephony] withTenantCtx lead creation rejected");
		});
	}

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

	const body = request.body || ({} as EndCallBody);
	const callerPhone = normalizePhoneNumber(body.phone);
	const callId = body.callId || `call-${Date.now()}`;
	const parsedDuration = typeof body.durationSeconds === "number"
		? body.durationSeconds
		: (typeof body.durationSeconds === "string" ? Number(body.durationSeconds) : NaN);
	const durationSeconds = Number.isFinite(parsedDuration) && parsedDuration > 0
		? Math.min(Math.floor(parsedDuration), 86400 * 7)
		: null;
	const isCompleted = durationSeconds !== null && durationSeconds > 0;
	const phoneStr = callerPhone.isValid ? callerPhone.e164 : (body.phone || "не указан");

	await withTenantCtx(orgId, async () => {
		let targetPatientId: string | null = null;
		if (body.patientId && UUID_REGEX.test(body.patientId)) {
			targetPatientId = body.patientId;
		} else if (callerPhone.isValid && callerPhone.national10.length >= 7) {
			const found = await db.select({ id: patients.id }).from(patients).where(
				and(
					eq(patients.organizationId, orgId),
					or(
						eq(patients.phone, callerPhone.e164),
						ilike(patients.phone, `%${callerPhone.national10}%`),
						sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
					),
				),
			).limit(1);
			if (found.length > 0 && found[0]?.id) {
				targetPatientId = found[0].id;
			}
		}

		// Всегда производим запись в communicationEvents и синхронизируем crmLeads в единой ACID транзакции
		await db.transaction(async (tx) => {
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
						ilike(communicationEvents.message, `%${callId}%`),
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
						...(body.recordingUrl ? { recordingUrl: body.recordingUrl } : {}),
						...(durationSeconds !== null && (existing.durationSeconds === null || durationSeconds > 0)
							? { durationSeconds }
							: {}),
					})
					.where(eq(communicationEvents.id, existing.id));
			} else {
				await tx.insert(communicationEvents).values({
					organizationId: orgId,
					patientId: targetPatientId || null,
					callerPhone: callerPhone.isValid ? callerPhone.e164 : (body.phone || null),
					channel: "phone",
					direction: body.direction === "outbound" ? "outbound" : "inbound",
					status: isCompleted ? "completed" : "needs_call",
					message: body.notes
						? `Звонок (${phoneStr}): ${body.notes} [call_id: ${callId}]`
						: `Звонок (${phoneStr}) [call_id: ${callId}]`,
					recordingUrl: body.recordingUrl || null,
					durationSeconds,
				});
			}

			// Если пациент не найден и телефон валиден — параллельно обновляем или создаем crmLeads
			if (!targetPatientId && callerPhone.isValid) {
				try {
					const existing = await tx
						.select({ id: crmLeads.id })
						.from(crmLeads)
						.where(
							and(
								eq(crmLeads.organizationId, orgId),
								or(
									eq(crmLeads.phone, callerPhone.e164),
									ilike(crmLeads.phone, `%${callerPhone.national10}%`),
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
							.where(eq(crmLeads.id, existing[0].id));
					} else {
						await tx.insert(crmLeads).values({
							organizationId: orgId,
							phone: callerPhone.e164,
							patientName: "Новый лид",
							name: "Новый лид",
							source: "telephony",
							status: "new",
							lastContactedAt: new Date(),
							...(body.notes ? { notes: body.notes } : {}),
						});
					}
				} catch (err) {
					request.log.warn({ err }, "[Telephony] Lead creation error in tx");
				}
			}
		});
	});

	wsBroker.broadcastToOrganization(orgId, {
		type: "TELEPHONY_CALL_ENDED",
		payload: {
			callId,
			phone: phoneStr,
			durationSeconds: durationSeconds || 0,
			timestamp: new Date().toISOString(),
		},
	});

	return reply.status(200).send({
		success: true,
		callId,
		status: "ended",
		durationSeconds: durationSeconds || 0,
	});
}

export const telephonyCallLifecycleRoutes: FastifyPluginAsync = async (server) => {
	server.post<{ Params: { organizationId: string }; Body: AnswerCallBody }>(
		"/:organizationId/calls/answer",
		handleAnswerCall,
	);
	server.post<{ Params: { organizationId?: string }; Body: AnswerCallBody }>(
		"/calls/answer",
		handleAnswerCall,
	);

	server.post<{ Params: { organizationId: string }; Body: EndCallBody }>(
		"/:organizationId/calls/end",
		handleEndCall,
	);
	server.post<{ Params: { organizationId?: string }; Body: EndCallBody }>(
		"/calls/end",
		handleEndCall,
	);
};
