import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import {
	normalizePhoneNumber,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";

export async function telephonyOutboundCallHandler(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: { phone: string; patientId?: string; patientName?: string };
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	let resolvedOrgId: string | null = null;
	if (rawOrgId && UUID_REGEX.test(rawOrgId)) {
		resolvedOrgId = rawOrgId;
	} else {
		resolvedOrgId = await requireResolvedOrganizationId(request, reply, "outbound call");
	}
	if (!resolvedOrgId) return;

	const body = request.body || ({} as { phone?: string; patientId?: string; patientName?: string });
	const callerPhone = normalizePhoneNumber(body.phone);
	if (!callerPhone.isValid) {
		return reply.status(400).send({
			error: "InvalidPhoneNumber",
			message: "Некорректный номер телефона для исходящего звонка",
		});
	}

	const callId = `outbound-${Date.now()}-${randomBytes(4).toString("hex")}`;
	const patientName = body.patientName || "Пациент";

	await withTenantCtx(resolvedOrgId, async () => {
		if (body.patientId && UUID_REGEX.test(body.patientId)) {
			await db.insert(communicationEvents).values({
				organizationId: resolvedOrgId!,
				patientId: body.patientId,
				channel: "phone",
				direction: "outbound",
				status: "completed",
				message: `Исходящий вызов на ${callerPhone.e164} [call_id: ${callId}]`,
			});
		}
	});

	wsBroker.broadcastToOrganization(resolvedOrgId, {
		type: "TELEPHONY_OUTBOUND_CALL",
		payload: {
			callId,
			phone: callerPhone.e164,
			patientId: body.patientId || null,
			patientName,
			status: "dialing",
			timestamp: new Date().toISOString(),
		},
	});

	return reply.status(200).send({
		success: true,
		callId,
		phone: callerPhone.e164,
		patientId: body.patientId || null,
		patientName,
		status: "dialing",
	});
}

export const telephonyOutboundHandler = telephonyOutboundCallHandler;

