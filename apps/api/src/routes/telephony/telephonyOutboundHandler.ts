import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
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

	const patientName = body.patientName || "Пациент";
	const patientId = body.patientId && UUID_REGEX.test(body.patientId) ? body.patientId : null;

	// Real dispatch to PBX gateway
	const outboundResult = await TelephonyGatewayService.initiateOutboundCall({
		organizationId: resolvedOrgId,
		callerPhone,
		patientId,
		patientName,
	});

	if (!outboundResult.dispatched) {
		await withTenantCtx(resolvedOrgId, async () => {
			await db.insert(communicationEvents).values({
				organizationId: resolvedOrgId!,
				patientId,
				callerPhone: callerPhone.e164,
				channel: "phone",
				direction: "outbound",
				status: "needs_call",
				message: `Исходящий вызов на ${callerPhone.e164} отклонён: АТС не подключена`,
			});
		});

		return reply.status(422).send({
			success: false,
			error: "TelephonyNotConfigured",
			message: outboundResult.error || "АТС не подключена в клинике",
			callId: outboundResult.callId,
			telephonyConfigured: false,
		});
	}

	const callId = outboundResult.callId;

	// In progress call recorded as pending, never fake completed before talk
	await withTenantCtx(resolvedOrgId, async () => {
		await db.insert(communicationEvents).values({
			organizationId: resolvedOrgId!,
			patientId,
			callerPhone: callerPhone.e164,
			channel: "phone",
			direction: "outbound",
			status: "pending",
			message: `Исходящий вызов на ${callerPhone.e164} [call_id: ${callId}] через ${outboundResult.provider}`,
		});
	});

	wsBroker.broadcastToOrganization(resolvedOrgId, {
		type: "TELEPHONY_OUTBOUND_CALL",
		payload: {
			callId,
			phone: callerPhone.e164,
			patientId,
			patientName,
			status: "dialing",
			provider: outboundResult.provider,
			timestamp: new Date().toISOString(),
		},
	});

	return reply.status(200).send({
		success: true,
		callId,
		phone: callerPhone.e164,
		patientId,
		patientName,
		status: "dialing",
		provider: outboundResult.provider,
		pbxDispatched: true,
	});
}

export const telephonyOutboundHandler = telephonyOutboundCallHandler;

