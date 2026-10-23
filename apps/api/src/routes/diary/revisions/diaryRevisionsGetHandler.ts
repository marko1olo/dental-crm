import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, resolveOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { users, visitDiaries, visitDiaryRevisions } from "../../../db/schema.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { evaluateClinicalAccess } from "../../../security/medicalSecrecyWarden.js";
import {
	DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
	DIARY_NOT_FOUND_REVISIONS_MESSAGE,
	diaryIdParamsSchema,
} from "../types.js";

export async function handleDiaryRevisionsGet(req: FastifyRequest, reply: FastifyReply): Promise<void> {
	if (!(await requireClinicalReadAccess(req, reply, "read diary revisions"))) return;
	const parsedIdParams = diaryIdParamsSchema.safeParse(req.params);
	if (!parsedIdParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Идентификатор дневника в адресе должен быть UUID (id).",
		});
	}
	const { id } = parsedIdParams.data;
	const orgId = await resolveOrganizationId(req);
	if (!orgId) {
		return reply.code(403).send({
			error: "OrgRequired",
			message: DIARY_CLINIC_UNKNOWN_REVISIONS_MESSAGE,
		});
	}

	const identity = getRequestIdentity(req);
	const staffRole = identity.role ?? req.user?.role ?? null;
	if (staffRole) {
		const evalAccess = evaluateClinicalAccess(staffRole);
		if (!evalAccess.hasClinicalAccess) {
			return reply.code(403).send({
				error: "PermissionDenied",
				permission: "clinical.diary.read",
				role: staffRole,
				message: `Отказ в доступе к ревизиям дневника приёма: ${evalAccess.reason}`,
			});
		}
	}

	const [diary] = await db
		.select({
			id: visitDiaries.id,
			patientId: visitDiaries.patientId,
			diagnosisIcd10: visitDiaries.diagnosisIcd10,
		})
		.from(visitDiaries)
		.where(and(eq(visitDiaries.id, id), eq(visitDiaries.organizationId, orgId)));

	if (!diary) {
		return reply.code(404).send({
			error: "NotFound",
			message: DIARY_NOT_FOUND_REVISIONS_MESSAGE,
		});
	}

	await auditMedicalAccessFromRequest(req, {
		organizationId: orgId,
		patientId: diary.patientId ?? "unknown",
		action: "VIEW_DIARY_REVISIONS",
		diagnosis: diary.diagnosisIcd10 ?? "Ревизии дневника приёма",
	});

	const revisions = await db
		.select()
		.from(visitDiaryRevisions)
		.where(and(eq(visitDiaryRevisions.diaryId, id), eq(visitDiaryRevisions.organizationId, orgId)))
		.orderBy(desc(visitDiaryRevisions.revisedAt));

	const reviserIds = Array.from(
		new Set(
			revisions
				.map((r) => r.revisedByUserId)
				.filter((uid): uid is string => typeof uid === "string" && uid.length > 0),
		),
	);
	const reviserNameById = new Map<string, string>();
	if (reviserIds.length > 0) {
		const reviserRows = await db
			.select({ id: users.id, fullName: users.fullName })
			.from(users)
			.where(and(inArray(users.id, reviserIds), eq(users.organizationId, orgId)));
		for (const row of reviserRows) {
			const name = typeof row.fullName === "string" ? row.fullName.trim() : "";
			if (name) reviserNameById.set(row.id, name);
		}
	}
	const revisionsWithAuthor = revisions.map((r) => {
		const uid = typeof r.revisedByUserId === "string" && r.revisedByUserId.length > 0 ? r.revisedByUserId : null;
		const revisedByFullName = uid ? (reviserNameById.get(uid) ?? null) : null;
		return { ...r, revisedByFullName };
	});

	return reply.send({ revisions: revisionsWithAuthor });
}
