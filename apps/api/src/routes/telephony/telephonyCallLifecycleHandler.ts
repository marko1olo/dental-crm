import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
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
	let resolvedOrgId: string | null = null;
	if (rawOrgId && UUID_REGEX.test(rawOrgId)) {
		resolvedOrgId = rawOrgId;
	} else {
		resolvedOrgId = await requireResolvedOrganizationId(request, reply, "answer call");
	}
	if (!resolvedOrgId) return;

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
	let resolvedOrgId: string | null = null;
	if (rawOrgId && UUID_REGEX.test(rawOrgId)) {
		resolvedOrgId = rawOrgId;
	} else {
		resolvedOrgId = await requireResolvedOrganizationId(request, reply, "end call");
	}
	if (!resolvedOrgId) return;

	const body = request.body || ({} as EndCallBody);
	const callerPhone = normalizePhoneNumber(body.phone);
	const callId = body.callId || `call-${Date.now()}`;
	const durationSeconds = typeof body.durationSeconds === "number" && body.durationSeconds > 0
		? Math.floor(body.durationSeconds)
		: null;
	const isCompleted = durationSeconds !== null && durationSeconds > 0;
	const phoneStr = callerPhone.isValid ? callerPhone.e164 : (body.phone || "не указан");

	await withTenantCtx(resolvedOrgId, async () => {
		let targetPatientId: string | null = null;
		if (body.patientId && UUID_REGEX.test(body.patientId)) {
			targetPatientId = body.patientId;
		} else if (callerPhone.isValid && callerPhone.national10.length >= 7) {
			const found = await db.select({ id: patients.id }).from(patients).where(
				and(
					eq(patients.organizationId, resolvedOrgId!),
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

		if (targetPatientId) {
			await db.insert(communicationEvents).values({
				organizationId: resolvedOrgId!,
				patientId: targetPatientId,
				channel: "phone",
				direction: body.direction === "outbound" ? "outbound" : "inbound",
				status: isCompleted ? "completed" : "missed",
				message: body.notes
					? `Звонок (${phoneStr}): ${body.notes} [call_id: ${callId}]`
					: `Звонок (${phoneStr}) [call_id: ${callId}]`,
				recordingUrl: body.recordingUrl || null,
				durationSeconds,
			});
		} else if (callerPhone.isValid) {
			// Если пациент не найден, обновляем или фиксируем активность по лиду
			try {
				await db.update(crmLeads).set({
					...(body.recordingUrl ? { audioRecordUrl: body.recordingUrl } : {}),
					lastContactedAt: new Date(),
				}).where(
					and(
						eq(crmLeads.organizationId, resolvedOrgId!),
						or(
							eq(crmLeads.phone, callerPhone.e164),
							ilike(crmLeads.phone, `%${callerPhone.national10}%`),
						),
					),
				);
			} catch {}
		}
	});

	wsBroker.broadcastToOrganization(resolvedOrgId, {
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
