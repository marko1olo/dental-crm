import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import {
	enforceClinicalDicomAccess,
	normalizeUid,
	organizationExists,
	readDicomIdentity,
	sampleDicomOwnerOrganizationId,
	sampleDicomPath,
	verifyDicomOrganization,
} from "../../dicomwebHelpers.js";

export async function handleQidoSeries(
	request: FastifyRequest<{ Params: { studyUid: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom qido series"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "сериям КТ / DICOM")) return;

	const studyUid = normalizeUid(request.params.studyUid);
	if (!studyUid) {
		return reply.code(400).send({ error: "InvalidStudyUid", message: "Не указан StudyInstanceUID." });
	}

	if (!(await verifyDicomOrganization(organizationId, reply))) return;

	const rows = await withTenantCtx(organizationId, async () => {
		const orgKnown = await organizationExists(organizationId);
		if (!orgKnown) return null;

		return db
			.select({
				seriesUid: schema.imagingSeries.dicomSeriesUid,
				modality: schema.imagingSeries.modality,
				seriesNumber: schema.imagingSeries.seriesNumber,
				seriesDescription: schema.imagingSeries.seriesDescription,
			})
			.from(schema.imagingSeries)
			.innerJoin(schema.imagingStudies, eq(schema.imagingStudies.id, schema.imagingSeries.studyId))
			.where(
				and(
					eq(schema.imagingSeries.organizationId, organizationId),
					eq(schema.imagingStudies.organizationId, organizationId),
					eq(schema.imagingStudies.dicomStudyUid, studyUid),
				),
			);
	});

	if (rows === null) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	const dicomJson: Record<string, unknown>[] = rows.map((r) => ({
		"0020000D": { vr: "UI", Value: [studyUid] },
		"0020000E": { vr: "UI", Value: [r.seriesUid] },
		"00080060": { vr: "CS", Value: [r.modality ?? "CT"] },
		"00200011": { vr: "IS", Value: [r.seriesNumber ?? 1] },
		"0008103E": { vr: "LO", Value: [r.seriesDescription ?? "Series"] },
	}));

	if (dicomJson.length === 0) {
		const sampleOwnerOrgId = sampleDicomOwnerOrganizationId();
		if (sampleOwnerOrgId !== null && sampleOwnerOrgId === organizationId) {
			const samplePath = sampleDicomPath();
			const ident = await readDicomIdentity(samplePath);
			if (ident?.studyUid === studyUid && ident.seriesUid) {
				dicomJson.push({
					"0020000D": { vr: "UI", Value: [studyUid] },
					"0020000E": { vr: "UI", Value: [ident.seriesUid] },
					"00080060": { vr: "CS", Value: ["CT"] },
					"00200011": { vr: "IS", Value: [1] },
					"0008103E": { vr: "LO", Value: ["Sample Series"] },
				});
			}
		}
	}

	reply.header("Content-Type", "application/dicom+json");
	return reply.code(200).send(dicomJson);
}
