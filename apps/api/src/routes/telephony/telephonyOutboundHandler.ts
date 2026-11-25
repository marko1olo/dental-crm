import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
import {
	normalizePhoneNumber,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { telephonyOutboundCallBodySchema } from "./types.js";

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

	const parsedBody = telephonyOutboundCallBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "InvalidPhoneNumber",
			message: "Некорректные параметры исходящего звонка",
		});
	}

	const body = parsedBody.data;
	const rawPhone = body.phone;
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

	// Real dispatch to PBX gateway strictly outside PG TX
	const outboundResult = await TelephonyGatewayService.initiateOutboundCall({
		organizationId: orgId,
		callerPhone,
		patientId,
		patientName,
		logger: request.log,
	});

	const rawIdempotencyKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim() ? rawIdempotencyKey.trim() : null;

	if (!outboundResult.dispatched) {
		await withTenantCtx(orgId, async (tx) => {
			await tx.insert(communicationEvents).values({
				organizationId: orgId,
				providerCallId: outboundResult.callId,
				providerName: outboundResult.provider,
				patientId,
				callerPhone: callerPhone.e164,
				channel: "phone",
				direction: "outbound",
				status: "needs_call",
				message: `Исходящий вызов на ${callerPhone.e164} отклонён: АТС не подключена`,
				idempotencyKey,
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
	await withTenantCtx(orgId, async (tx) => {
		await tx.insert(communicationEvents).values({
			organizationId: orgId,
			providerCallId: callId,
			providerName: outboundResult.provider,
			patientId,
			callerPhone: callerPhone.e164,
			channel: "phone",
			direction: "outbound",
			status: "queued",
			message: `Исходящий вызов на ${callerPhone.e164} через ${outboundResult.provider}`,
			idempotencyKey,
		});

		onTenantTxCommit(() => {
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
		});
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
