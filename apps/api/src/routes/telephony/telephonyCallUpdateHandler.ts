/**
 * apps/api/src/routes/telephony/telephonyCallUpdateHandler.ts
 *
 * Fastify route handler to persist call notes and updates in communicationEvents.
 * Mandates 8e (Doctor Autonomy), 8x (Domain Purity), 8ba (Disruptive Reality).
 */

import { and, desc, eq, ilike, or } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
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
	callerPhone?: string;
	phone?: string;
}

export function extractCallIdMarker(
	existingMessage: string | null | undefined,
	fallbackCallId?: string,
): string | undefined {
	const match = existingMessage?.match(/\[call_id:\s*([^\]]+)\]/i);
	return match ? match[1]?.trim() : fallbackCallId;
}

export function preserveCallIdMarker(
	_existingMessage: string | null | undefined,
	newNote: string,
	_fallbackCallId?: string,
): string {
	return newNote.trim();
}

export async function telephonyCallUpdateHandler(
	request: FastifyRequest<{
		Params: { id: string; organizationId?: string };
		Body: UpdateCallNoteBody;
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	const context = await requireClinicalMutationContext(request, reply, "update call note");
	if (!context) return;
	const resolvedOrgId = context.organizationId;
	if (rawOrgId && rawOrgId !== resolvedOrgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}
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
		providerCallId?: string | null;
		patientId: string | null;
		callerPhone: string | null;
		message: string;
		status: string;
		createdAt: Date;
	} | null = null;

	if (UUID_REGEX.test(callId)) {
		updatedCall = await withTenantCtx(orgId, async () => {
			const existing = await db
				.select({
					message: communicationEvents.message,
					providerCallId: communicationEvents.providerCallId,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.id, callId),
						eq(communicationEvents.organizationId, orgId),
					),
				)
				.limit(1);

			const existingRow = existing[0];
			const inferredProviderCallId =
				existingRow?.providerCallId ||
				extractCallIdMarker(existingRow?.message, undefined);

			const res = await db
				.update(communicationEvents)
				.set({
					message: noteText,
					...(inferredProviderCallId ? { providerCallId: inferredProviderCallId } : {}),
				})
				.where(
					and(
						eq(communicationEvents.id, callId),
						eq(communicationEvents.organizationId, orgId),
					),
				)
				.returning({
					id: communicationEvents.id,
					providerCallId: communicationEvents.providerCallId,
					patientId: communicationEvents.patientId,
					callerPhone: communicationEvents.callerPhone,
					message: communicationEvents.message,
					status: communicationEvents.status,
					createdAt: communicationEvents.createdAt,
				});

			return res.length > 0 && res[0] ? res[0] : null;
		});
	} else {
		// Non-UUID call identifier (e.g. Mango, Zadarma, UIS, Asterisk string tokens)
		// Search in communicationEvents by providerCallId (relational column)
		const callerPhone = body.callerPhone ?? body.phone ?? null;

		updatedCall = await withTenantCtx(orgId, async () => {
			// 1. Точный поиск события звонка строго по providerCallId (индексированная колонка)
			const matchedEvents = await db
				.select({
					id: communicationEvents.id,
					providerCallId: communicationEvents.providerCallId,
				})
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, orgId),
						or(
							eq(communicationEvents.providerCallId, callId),
							ilike(communicationEvents.message, `%${callId}%`),
						),
					),
				)
				.orderBy(desc(communicationEvents.createdAt))
				.limit(1);

			const targetEvent = matchedEvents[0];

			if (targetEvent) {
				const res = await db
					.update(communicationEvents)
					.set({
						message: noteText,
						providerCallId: targetEvent.providerCallId || callId,
					})
					.where(
						and(
							eq(communicationEvents.id, targetEvent.id),
							eq(communicationEvents.organizationId, orgId),
						),
					)
					.returning({
						id: communicationEvents.id,
						providerCallId: communicationEvents.providerCallId,
						patientId: communicationEvents.patientId,
						callerPhone: communicationEvents.callerPhone,
						message: communicationEvents.message,
						status: communicationEvents.status,
						createdAt: communicationEvents.createdAt,
					});

				return res[0] ?? null;
			}

			// 2. Если звонок ещё не сохранён в БД (in-flight), создаём новую запись с привязкой providerCallId
			const [created] = await db
				.insert(communicationEvents)
				.values({
					organizationId: orgId,
					providerCallId: callId,
					providerName: "telephony",
					callerPhone,
					patientId: body.patientId && UUID_REGEX.test(body.patientId) ? body.patientId : null,
					channel: "phone",
					direction: "inbound",
					status: "completed",
					message: noteText,
				})
				.returning({
					id: communicationEvents.id,
					providerCallId: communicationEvents.providerCallId,
					patientId: communicationEvents.patientId,
					callerPhone: communicationEvents.callerPhone,
					message: communicationEvents.message,
					status: communicationEvents.status,
					createdAt: communicationEvents.createdAt,
				});

			return created ?? null;
		});
	}

	if (!updatedCall) {
		return reply.status(404).send({
			error: "CallNotFound",
			message: `Запись звонка с ID ${callId} не найдена`,
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
		callId: callId,
		eventId: updatedCall.id,
		note: noteText,
	});
}
