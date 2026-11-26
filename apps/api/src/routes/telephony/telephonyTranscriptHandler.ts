import { and, desc, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { communicationEvents, uisCallSpeechTranscripts } from "../../db/schema.js";
import { UUID_REGEX } from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { telephonyTranscriptBodySchema } from "./types.js";

export async function telephonyTranscriptSaveHandler(
	request: FastifyRequest<{
		Params: { id: string; organizationId?: string };
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	const context = await requireClinicalMutationContext(
		request,
		reply,
		"save call transcript",
	);
	if (!context) return;
	const resolvedOrgId = context.organizationId;
	if (rawOrgId && rawOrgId !== resolvedOrgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}

	const rawParamId = (request.params.id || "").trim();
	if (!rawParamId) {
		return reply.status(400).send({
			error: "InvalidCallId",
			message: "Идентификатор звонка не указан",
		});
	}

	const parsed = telephonyTranscriptBodySchema.safeParse(request.body ?? {});
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные данные расшифровки звонка",
			details: parsed.error.issues,
		});
	}

	const body = parsed.data;
	const saved = await withTenantCtx(resolvedOrgId, async (tx) => {
		const [matchedEvent] = await tx
			.select({
				id: communicationEvents.id,
				providerCallId: communicationEvents.providerCallId,
				callerPhone: communicationEvents.callerPhone,
				durationSeconds: communicationEvents.durationSeconds,
			})
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, resolvedOrgId),
					or(
						UUID_REGEX.test(rawParamId)
							? eq(communicationEvents.id, rawParamId)
							: sql`false`,
						eq(communicationEvents.providerCallId, rawParamId),
						body.callId
							? eq(communicationEvents.providerCallId, body.callId)
							: sql`false`,
					),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(1);

		if (!matchedEvent) {
			return null;
		}

		const canonicalCallId =
			matchedEvent.providerCallId || body.callId || matchedEvent.id;
		const resolvedPhone = body.patientPhone || matchedEvent.callerPhone || null;
		const resolvedDuration =
			body.durationSeconds ?? matchedEvent.durationSeconds ?? null;

		const [existingTranscript] = await tx
			.select({ id: uisCallSpeechTranscripts.id })
			.from(uisCallSpeechTranscripts)
			.where(
				and(
					eq(uisCallSpeechTranscripts.organizationId, resolvedOrgId),
					or(
						eq(uisCallSpeechTranscripts.callId, canonicalCallId),
						eq(uisCallSpeechTranscripts.callId, matchedEvent.id),
					),
				),
			)
			.orderBy(desc(uisCallSpeechTranscripts.createdAt))
			.limit(1);

		const row = existingTranscript
			? (
					await tx
						.update(uisCallSpeechTranscripts)
						.set({
							callId: canonicalCallId,
							patientPhone: resolvedPhone,
							durationSeconds: resolvedDuration,
							transcript: body.transcript,
							sentiment: body.sentiment ?? null,
							aiSummary: body.aiSummary ?? null,
						})
						.where(
							and(
								eq(uisCallSpeechTranscripts.id, existingTranscript.id),
								eq(uisCallSpeechTranscripts.organizationId, resolvedOrgId),
							),
						)
						.returning()
				)[0]
			: (
					await tx
						.insert(uisCallSpeechTranscripts)
						.values({
							organizationId: resolvedOrgId,
							callId: canonicalCallId,
							patientPhone: resolvedPhone,
							durationSeconds: resolvedDuration,
							transcript: body.transcript,
							sentiment: body.sentiment ?? null,
							aiSummary: body.aiSummary ?? null,
						})
						.returning()
				)[0];

		onTenantTxCommit(() => {
			wsBroker.broadcastToOrganization(resolvedOrgId, {
				type: "TELEPHONY_CALL_TRANSCRIPT_UPDATED",
				payload: {
					eventId: matchedEvent.id,
					callId: canonicalCallId,
					sentiment: body.sentiment ?? null,
					updatedAt: new Date().toISOString(),
				},
			});
		});

		return { eventId: matchedEvent.id, transcriptRecord: row };
	});

	if (!saved) {
		return reply.status(404).send({
			error: "CallNotFound",
			message: `Звонок с ID ${rawParamId} не найден`,
		});
	}

	return reply.status(200).send({
		success: true,
		data: saved.transcriptRecord,
		eventId: saved.eventId,
	});
}
