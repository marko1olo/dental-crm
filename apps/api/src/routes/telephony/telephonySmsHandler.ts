import { and, eq, ilike, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withSuperuserBypass, withTenantCtx } from "../../db/rls.js";
import { clinics, communicationEvents, patients } from "../../db/schema.js";
import {
	authenticatePbxWebhook,
	normalizePhoneNumber,
	UUID_REGEX,
} from "../../services/telephony/telephonySecurity.js";
import { wsBroker } from "../../services/websocketBroker.js";
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

	let resolvedOrgId: string | null = null;
	const routeOrgId = request.params.organizationId;
	if (routeOrgId && UUID_REGEX.test(routeOrgId)) {
		resolvedOrgId = routeOrgId;
	} else if (data.to) {
		const targetPhone = normalizePhoneNumber(data.to);
		if (targetPhone.isValid) {
			const matchedClinic = await withSuperuserBypass(async (tx) => {
				return tx.select({ organizationId: clinics.organizationId }).from(clinics).where(ilike(clinics.phone, `%${targetPhone.national10}%`)).limit(1);
			});
			resolvedOrgId = matchedClinic[0]?.organizationId || null;
		}
	}

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

	return withTenantCtx(resolvedOrgId, async () => {
		const smsId = (data.sms_id || data.call_id || data.id || "").trim();
		if (smsId) {
			const existing = await db.select({ id: communicationEvents.id }).from(communicationEvents).where(and(eq(communicationEvents.organizationId, resolvedOrgId!), ilike(communicationEvents.message, `%${smsId}%`))).limit(1);
			if (existing.length > 0) return { success: true, duplicate: true };
		}

		const searchPatient = await db.select().from(patients).where(and(eq(patients.organizationId, resolvedOrgId!), or(eq(patients.phone, callerPhone.e164), ilike(patients.phone, `%${callerPhone.national10}%`), sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${callerPhone.national10}%`}`))).limit(1);
		let patient = searchPatient[0] || null;
		if (!patient) {
			const inserted = await db.insert(patients).values({ organizationId: resolvedOrgId!, fullName: `SMS User ${callerPhone.e164}`, phone: callerPhone.e164, notes: "Лид из входящего SMS", status: "active" }).returning();
			patient = inserted[0] || null;
		}
		if (!patient) return reply.status(500).send({ error: "PatientPersistenceError", message: "Failed to persist patient" });

		await db.insert(communicationEvents).values({
			organizationId: resolvedOrgId!, patientId: patient.id, channel: "sms", direction: "inbound", status: "delivered", message: smsId ? `${messageText} [sms_id: ${smsId}]` : messageText,
		});

		wsBroker.broadcastToOrganization(resolvedOrgId!, { type: "INBOX_NEW_MESSAGE", payload: { channel: "sms", patientId: patient.id, text: messageText } });
		return { success: true };
	});
}

export const telephonySmsHandler = telephonySmsWebhookHandler;

