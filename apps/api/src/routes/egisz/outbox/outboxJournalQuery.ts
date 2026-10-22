/**
 * outboxJournalQuery.ts — Database query logic for EGISZ REMD Journal and Outbox lists.
 * Mandate 8b compliant (<= 120 lines).
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { formatOutboxRowForJournal } from "./outboxRowFormatter.js";

export async function handleEgiszJournalQuery(
	request: FastifyRequest,
	reply: FastifyReply,
	actionName: string,
) {
	if (!(await requireClinicalReadAccess(request, reply, actionName))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const query = (request.query || {}) as { status?: string; limit?: string };
	const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

	const conditions = [eq(schema.egiszOutbox.organizationId, orgId)];
	if (query.status && query.status !== "all") {
		if (query.status === "registered" || query.status === "accepted_by_egisz") {
			conditions.push(eq(schema.egiszOutbox.status, "registered_in_remd"));
		} else if (query.status === "sent") {
			conditions.push(eq(schema.egiszOutbox.status, "sending"));
		} else if (query.status === "signed") {
			conditions.push(eq(schema.egiszOutbox.status, "ready_for_dispatch"));
		} else if (query.status === "draft") {
			conditions.push(eq(schema.egiszOutbox.status, "queued"));
		} else if (query.status === "error") {
			conditions.push(inArray(schema.egiszOutbox.status, ["failed", "rejected_by_remd"]));
		} else if (schema.egiszOutboxStatus.enumValues.includes(query.status as any)) {
			conditions.push(eq(schema.egiszOutbox.status, query.status as (typeof schema.egiszOutboxStatus.enumValues)[number]));
		}
	}

	const rows = await db
		.select({
			id: schema.egiszOutbox.id, visitId: schema.egiszOutbox.visitId, documentId: schema.egiszOutbox.documentId,
			patientId: schema.egiszOutbox.patientId, doctorId: schema.egiszOutbox.doctorId, docTypeNsiCode: schema.egiszOutbox.docTypeNsiCode,
			status: schema.egiszOutbox.status, attempts: schema.egiszOutbox.attempts, maxAttempts: schema.egiszOutbox.maxAttempts,
			scheduledAt: schema.egiszOutbox.scheduledAt, nextAttemptAt: schema.egiszOutbox.nextAttemptAt,
			remdDocumentId: schema.egiszOutbox.remdDocumentId, remdTransactionId: schema.egiszOutbox.remdTransactionId,
			lastErrorClass: schema.egiszOutbox.lastErrorClass, lastErrorMessage: schema.egiszOutbox.lastErrorMessage,
			doctorSignaturePkcs7: schema.egiszOutbox.doctorSignaturePkcs7, doctorCertSerial: schema.egiszOutbox.doctorCertSerial,
			doctorCertSubject: schema.egiszOutbox.doctorCertSubject, doctorSignedAt: schema.egiszOutbox.doctorSignedAt,
			moSignaturePkcs7: schema.egiszOutbox.moSignaturePkcs7, moCertSerial: schema.egiszOutbox.moCertSerial,
			moCertSubject: schema.egiszOutbox.moCertSubject, moSignedAt: schema.egiszOutbox.moSignedAt,
			payloadHashSha256: schema.egiszOutbox.payloadHashSha256, dedupeKey: schema.egiszOutbox.dedupeKey,
			createdAt: schema.egiszOutbox.createdAt, updatedAt: schema.egiszOutbox.updatedAt,
			patientFullName: schema.patients.fullName, patientBirthDate: schema.patients.birthDate,
			patientAdministrativeProfile: schema.patients.administrativeProfile,
			doctorFullName: schema.users.fullName, doctorRole: schema.users.role, doctorSnils: schema.users.snils,
			organizationName: schema.organizations.name, organizationInn: schema.organizations.inn, organizationOgrn: schema.organizations.ogrn,
		})
		.from(schema.egiszOutbox)
		.leftJoin(schema.patients, eq(schema.egiszOutbox.patientId, schema.patients.id))
		.leftJoin(schema.users, eq(schema.egiszOutbox.doctorId, schema.users.id))
		.leftJoin(schema.organizations, eq(schema.egiszOutbox.organizationId, schema.organizations.id))
		.where(and(...conditions))
		.orderBy(desc(schema.egiszOutbox.createdAt))
		.limit(limit);

	const items = rows.map(formatOutboxRowForJournal);
	return reply.status(200).send({ success: true, items, totalCount: items.length });
}
