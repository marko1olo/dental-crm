import { randomBytes } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
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
	const context = await requireClinicalMutationContext(request, reply, "outbound call");
	if (!context) return;
	const resolvedOrgId = context.organizationId;

	if (rawOrgId && rawOrgId !== resolvedOrgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Идентификатор организации в параметрах маршрута не совпадает с авторизованным контекстом клиники",
		});
	}
	const orgId = resolvedOrgId;

	const body = request.body || ({} as { phone?: string; patientId?: string; patientName?: string });
	const rawPhone = (body.phone || "").trim();
	const cleanDigits = rawPhone.replace(/\D/g, "");
	const isSipExtension = cleanDigits.length === 3 && /^\d{3}$/.test(rawPhone);

	let callerPhone = normalizePhoneNumber(body.phone);
	if (!callerPhone.isValid && isSipExtension) {
		callerPhone = {
			raw: rawPhone,
			cleanDigits,
			e164: cleanDigits,
			national10: cleanDigits,
			isValid: true,
		};
	}

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
		organizationId: orgId,
		callerPhone,
		patientId,
		patientName,
		logger: request.log,
	});

	if (!outboundResult.dispatched) {
		await withTenantCtx(orgId, async () => {
			await db.insert(communicationEvents).values({
				organizationId: orgId,
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

	// In progress call recorded as queued, never fake completed before talk
	await withTenantCtx(orgId, async () => {
		await db.insert(communicationEvents).values({
			organizationId: orgId,
			patientId,
			callerPhone: callerPhone.e164,
			channel: "phone",
			direction: "outbound",
			status: "queued",
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

