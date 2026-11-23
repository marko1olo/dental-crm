import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents, crmLeads, patients } from "../../db/schema.js";
import {
	authenticatePbxWebhook,
	normalizePhoneNumber,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
import { resolveWebhookOrgId } from "./telephonyEngine.js";
import {
	type TelephonySmsWebhookPayload,
	type TelephonyWebhookPayload,
	telephonySmsWebhookPayloadSchema,
} from "./types.js";

export async function telephonySmsWebhookHandler(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	const rawPayload = request.body;
	if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
		return reply.status(400).send({ error: "InvalidPayload", message: "Request body must be a JSON object" });
	}

	const parsed = telephonySmsWebhookPayloadSchema.safeParse(rawPayload);
	if (!parsed.success) return reply.status(400).send({ error: "Missing 'from' or 'message'" });
	const data: TelephonySmsWebhookPayload = parsed.data;

	const callerPhone = normalizePhoneNumber(data.from || data.sender || data.phone);
	const messageText = (data.message || data.text || "").trim();
	if (!callerPhone.isValid || !messageText) return reply.status(400).send({ error: "Missing 'from' or 'message'" });

	const targetPhone = normalizePhoneNumber(data.to);
	const resolvedOrgId = await resolveWebhookOrgId(request.params.organizationId, targetPhone);

	if (!resolvedOrgId) {
		return reply.status(404).send({ error: "OrganizationNotFound", message: "Tenant organization could not be resolved" });
	}

	const isAuthenticated = await authenticatePbxWebhook(request, reply, resolvedOrgId, data as TelephonyWebhookPayload);
	if (!isAuthenticated) return reply;

	if (data.timestamp != null) {
		const numTs = typeof data.timestamp === "number" ? data.timestamp : Number.parseInt(String(data.timestamp), 10);
		if (!Number.isNaN(numTs) && numTs > 0) {
			const msgTsSec = numTs > 1e11 ? Math.floor(numTs / 1000) : numTs;
			if (Math.abs(Math.floor(Date.now() / 1000) - msgTsSec) > 300) {
				return reply.status(400).send({ error: "Timestamp drift window exceeded (>300s)" });
			}
		}
	}

	const orgId = resolvedOrgId;
	const rawIdempotencyKey = request.headers["idempotency-key"] || request.headers["x-idempotency-key"];
	const idempotencyKey = typeof rawIdempotencyKey === "string" && rawIdempotencyKey.trim() ? rawIdempotencyKey.trim() : null;

	return withTenantCtx(orgId, async () => {
		const smsId = (data.sms_id || data.call_id || data.id || "").trim();
		if (smsId) {
			const existing = await db
				.select({ id: communicationEvents.id })
				.from(communicationEvents)
				.where(
					and(
						eq(communicationEvents.organizationId, orgId),
						ilike(communicationEvents.message, `%${smsId}%`),
					),
				)
				.limit(1);
			if (existing.length > 0) return { success: true, duplicate: true };
		}

		const searchPatient = await db
			.select()
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, orgId),
					or(
						eq(patients.phone, callerPhone.e164),
						ilike(patients.phone, `%${callerPhone.national10}%`),
						sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`,
					),
				),
			)
			.limit(1);
		const existingPatient = searchPatient[0] || null;

		let patientId: string | null = null;
		try {
			await db.transaction(async (tx) => {
				if (existingPatient) {
					patientId = existingPatient.id;
				} else if (callerPhone.isValid) {
					const existingLead = await tx
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

					if (existingLead.length > 0 && existingLead[0]?.id) {
						await tx
							.update(crmLeads)
							.set({
								lastContactedAt: new Date(),
								notes: `Входящее SMS: ${messageText}`,
							})
							.where(eq(crmLeads.id, existingLead[0].id));
					} else {
						await tx.insert(crmLeads).values({
							organizationId: orgId,
							phone: callerPhone.e164,
							patientName: `SMS Лид ${callerPhone.e164}`,
							name: `SMS Лид ${callerPhone.e164}`,
							source: "sms",
							status: "new",
							lastContactedAt: new Date(),
							notes: `Входящее SMS: ${messageText}`,
						});
					}
				}

				await tx.insert(communicationEvents).values({
					organizationId: orgId,
					patientId: patientId || null,
					callerPhone: callerPhone.e164,
					channel: "sms",
					direction: "inbound",
					status: "delivered",
					message: smsId ? `${messageText} [sms_id: ${smsId}]` : messageText,
					idempotencyKey,
				});
			});
		} catch (err) {
			request.log.error(
				{ err, orgId },
				"[TelephonySms] Failed to persist SMS event in transaction",
			);
			return reply.status(500).send({
				error: "SmsPersistenceError",
				message: "Failed to persist communication event",
			});
		}

		wsBroker.broadcastToOrganization(orgId, {
			type: "INBOX_NEW_MESSAGE",
			payload: {
				channel: "sms",
				patientId,
				phone: callerPhone.e164,
				text: messageText,
			},
		});
		return { success: true };
	});
}

export const telephonySmsHandler = telephonySmsWebhookHandler;

