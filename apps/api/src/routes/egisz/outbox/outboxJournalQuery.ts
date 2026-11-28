/**
 * outboxJournalQuery.ts — Database query logic for EGISZ REMD Journal and Outbox lists.
 * Mandate 8b compliant (<= 120 lines).
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantReadCtx, type TenantDb } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { formatOutboxRowForJournal } from "./outboxRowFormatter.js";

const egiszJournalQuerySchema = z
	.object({
		status: z.string().trim().max(64).optional(),
		limit: z.coerce.number().int().min(1).optional(),
	})
	.strict();

export async function handleEgiszJournalQuery(
	request: FastifyRequest,
	reply: FastifyReply,
	actionName: string,
	existingTx?: TenantDb,
	resolvedOrgId?: string,
) {
	let orgId = resolvedOrgId;
	if (!orgId) {
		if (!(await requireClinicalReadAccess(request, reply, actionName))) return;
		const resolved = requireOrganizationId(request, reply);
		if (!resolved) return;
		orgId = resolved;
	}

	const queryParsed = egiszJournalQuerySchema.safeParse(request.query ?? {});
	if (!queryParsed.success) {
		return reply.status(400).send({
			success: false,
			error: "ValidationError",
			message: "Некорректные параметры фильтрации журнала ЕГИСЗ.",
			issues: queryParsed.error.issues,
		});
	}
	const query = queryParsed.data;
	const limit = Math.min(100, Math.max(1, query.limit ?? 50));

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
		} else if ((schema.egiszOutboxStatus.enumValues as readonly string[]).includes(query.status)) {
			conditions.push(eq(schema.egiszOutbox.status, query.status as (typeof schema.egiszOutboxStatus.enumValues)[number]));
		}
	}

	const runQuery = (tx: TenantDb) =>
		tx
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
			.leftJoin(
				schema.patients,
				and(
					eq(schema.egiszOutbox.patientId, schema.patients.id),
					eq(schema.patients.organizationId, orgId),
				),
			)
			.leftJoin(schema.users, eq(schema.egiszOutbox.doctorId, schema.users.id))
			.leftJoin(schema.organizations, eq(schema.egiszOutbox.organizationId, schema.organizations.id))
			.where(and(...conditions))
			.orderBy(desc(schema.egiszOutbox.createdAt))
			.limit(limit);

	const rows = existingTx
		? await runQuery(existingTx)
		: await withTenantReadCtx(orgId, runQuery);

	const items = rows.map(formatOutboxRowForJournal);
	return reply.status(200).send({ success: true, items, totalCount: items.length });
}
