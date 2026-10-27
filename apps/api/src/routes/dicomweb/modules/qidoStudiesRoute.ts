import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { auditMedicalAccessFromRequest } from "../../../security/medicalAuditTrail.js";
import { enforceClinicalDicomAccess, normalizeUid, organizationExists, UUID_SHAPE, verifyDicomOrganization } from "../../dicomwebHelpers.js";

export async function handleQidoStudies(
	request: FastifyRequest<{
		Querystring: { StudyInstanceUID?: string; PatientID?: string; PatientName?: string; limit?: string | number; offset?: string | number };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom qido studies"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "реестру КТ / DICOM исследований")) return;

	await auditMedicalAccessFromRequest(request, {
		organizationId, action: "VIEW_DICOM_STUDIES", diagnosis: "Поиск КТ / DICOM исследований (QIDO-RS)",
	});

	if (!(await verifyDicomOrganization(organizationId, reply))) return;

	const queryStudyUid = normalizeUid(request.query.StudyInstanceUID);
	const queryPatientId = request.query.PatientID?.trim();
	const limit = Math.min(Math.max(1, Number(request.query.limit) || 25), 100);
	const offset = Math.max(0, Number(request.query.offset) || 0);

	const results = await withTenantCtx(organizationId, async () => {
		const orgKnown = await organizationExists(organizationId);
		if (!orgKnown) return null;

		const conditions = [eq(schema.imagingStudies.organizationId, organizationId), isNotNull(schema.imagingStudies.dicomStudyUid)];
		if (queryStudyUid) conditions.push(eq(schema.imagingStudies.dicomStudyUid, queryStudyUid));
		if (queryPatientId && UUID_SHAPE.test(queryPatientId)) conditions.push(eq(schema.imagingStudies.patientId, queryPatientId));

		return db
			.select({
				studyId: schema.imagingStudies.id, dicomStudyUid: schema.imagingStudies.dicomStudyUid,
				patientId: schema.imagingStudies.patientId, capturedAt: schema.imagingStudies.capturedAt,
				title: schema.imagingStudies.title, kind: schema.imagingStudies.kind,
			})
			.from(schema.imagingStudies).where(and(...conditions)).orderBy(desc(schema.imagingStudies.capturedAt)).limit(limit).offset(offset);
	});

	if (results === null) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	const dicomJson = results.map((row) => {
		const dateObj = new Date(row.capturedAt);
		const studyDate = dateObj.toISOString().slice(0, 10).replace(/-/g, "");
		const studyTime = dateObj.toISOString().slice(11, 19).replace(/:/g, "");
		return {
			"0020000D": { vr: "UI", Value: [row.dicomStudyUid] },
			"00100020": { vr: "LO", Value: [row.patientId] },
			"00080020": { vr: "DA", Value: [studyDate] },
			"00080030": { vr: "TM", Value: [studyTime] },
			"00080060": { vr: "CS", Value: [row.kind?.toUpperCase() ?? "OT"] },
			"00081030": { vr: "LO", Value: [row.title] },
		};
	});

	reply.header("Content-Type", "application/dicom+json");
	return reply.code(200).send(dicomJson);
}
