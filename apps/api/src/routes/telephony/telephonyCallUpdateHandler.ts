/**
 * apps/api/src/routes/telephony/telephonyCallUpdateHandler.ts
 *
 * Fastify route handler to persist call notes and updates in communicationEvents.
 * Mandates 8e (Doctor Autonomy), 8x (Domain Purity), 8ba (Disruptive Reality).
 */

import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import { UUID_REGEX } from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";

export interface UpdateCallNoteBody {
	note?: string;
	clinicalNote?: string;
	message?: string;
	patientId?: string;
}

export async function telephonyCallUpdateHandler(
	request: FastifyRequest<{
		Params: { id: string; organizationId?: string };
		Body: UpdateCallNoteBody;
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	let resolvedOrgId: string | null = null;
	if (rawOrgId && UUID_REGEX.test(rawOrgId)) {
		resolvedOrgId = rawOrgId;
	} else {
		resolvedOrgId = await requireResolvedOrganizationId(request, reply, "update call note");
	}
	if (!resolvedOrgId) return;
	const orgId = resolvedOrgId;

	const callId = request.params.id;
	if (!callId) {
		return reply.status(400).send({
			error: "InvalidCallId",
			message: "Идентификатор звонка не указан",
		});
	}

	const body = request.body || {};
	const noteText = (body.note ?? body.clinicalNote ?? body.message ?? "").trim();
	if (!noteText) {
		return reply.status(400).send({
			error: "EmptyNote",
			message: "Текст заметки не может быть пустым",
		});
	}

	let updatedCall: {
		id: string;
		patientId: string | null;
		callerPhone: string | null;
		message: string;
		status: string;
		createdAt: Date;
	} | null = null;

	if (UUID_REGEX.test(callId)) {
		updatedCall = await withTenantCtx(orgId, async () => {
			const res = await db
				.update(communicationEvents)
				.set({
					message: noteText,
				})
				.where(
					and(
						eq(communicationEvents.id, callId),
						eq(communicationEvents.organizationId, orgId),
					),
				)
				.returning({
					id: communicationEvents.id,
					patientId: communicationEvents.patientId,
					callerPhone: communicationEvents.callerPhone,
					message: communicationEvents.message,
					status: communicationEvents.status,
					createdAt: communicationEvents.createdAt,
				});

			return res.length > 0 && res[0] ? res[0] : null;
		});
	}

	if (!updatedCall) {
		if (UUID_REGEX.test(callId)) {
			return reply.status(404).send({
				error: "CallNotFound",
				message: `Запись звонка с ID ${callId} не найдена`,
			});
		}

		return reply.status(200).send({
			success: true,
			callId,
			note: noteText,
			isSynthetic: true,
		});
	}

	wsBroker.broadcastToOrganization(resolvedOrgId, {
		type: "TELEPHONY_CALL_NOTE_UPDATED",
		payload: {
			callId: updatedCall.id,
			note: noteText,
			updatedAt: new Date().toISOString(),
		},
	});

	return reply.status(200).send({
		success: true,
		call: updatedCall,
		callId: updatedCall.id,
		note: noteText,
	});
}
