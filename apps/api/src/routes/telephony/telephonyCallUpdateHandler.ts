/**
 * apps/api/src/routes/telephony/telephonyCallUpdateHandler.ts
 *
 * Fastify route handler to persist call notes and updates in communicationEvents.
 * Mandates 8e (Doctor Autonomy), 8x (Domain Purity), 8ba (Disruptive Reality).
 */

import { and, desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../accessGuard.js";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import { UUID_REGEX } from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { telephonyCallUpdateBodySchema } from "./types.js";

export interface UpdateCallNoteBody {
	note?: string;
	clinicalNote?: string;
	message?: string;
	patientId?: string;
	callerPhone?: string;
	phone?: string;
	direction?: "inbound" | "outbound";
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

	const callId = (request.params.id || "").trim();
	if (!callId) {
		return reply.status(400).send({
			error: "InvalidCallId",
			message: "Идентификатор звонка не указан",
		});
	}

	const parsedBody = telephonyCallUpdateBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный формат данных заметки к звонку",
		});
	}

	const body = parsedBody.data;
	const noteText = (body.note ?? body.clinicalNote ?? body.message ?? "").trim();
	if (!noteText) {
		return reply.status(400).send({
			error: "EmptyNote",
			message: "Текст заметки не может быть пустым",
		});
	}

	const updatedCall = await withTenantCtx(orgId, async (tx) => {
		if (UUID_REGEX.test(callId)) {
			const existing = await tx
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
			if (!existingRow) {
				return null;
			}

			const inferredProviderCallId =
				existingRow.providerCallId ||
				extractCallIdMarker(existingRow.message, undefined);

			const res = await tx
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

			const row = res[0] ?? null;
			if (row) {
				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(resolvedOrgId, {
						type: "TELEPHONY_CALL_NOTE_UPDATED",
						payload: {
							callId: row.id,
							note: noteText,
							updatedAt: new Date().toISOString(),
						},
					});
				});
			}
			return row;
		}

		// Non-UUID providerCallId lookup ONLY (never create fake call records on PATCH)
		const matchedEvents = await tx
			.select({
				id: communicationEvents.id,
				providerCallId: communicationEvents.providerCallId,
			})
			.from(communicationEvents)
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.providerCallId, callId),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(1);

		const targetEvent = matchedEvents[0];
		if (!targetEvent) {
			return null;
		}

		const res = await tx
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

		const row = res[0] ?? null;
		if (row) {
			onTenantTxCommit(() => {
				wsBroker.broadcastToOrganization(resolvedOrgId, {
					type: "TELEPHONY_CALL_NOTE_UPDATED",
					payload: {
						callId: row.id,
						note: noteText,
						updatedAt: new Date().toISOString(),
					},
				});
			});
		}
		return row;
	});

	if (!updatedCall) {
		return reply.status(404).send({
			error: "CallNotFound",
			message: `Запись звонка с ID ${callId} не найдена`,
		});
	}

	return reply.status(200).send({
		success: true,
		call: updatedCall,
		callId,
		eventId: updatedCall.id,
		note: noteText,
	});
}
