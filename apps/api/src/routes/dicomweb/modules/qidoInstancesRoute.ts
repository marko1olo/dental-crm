import fs from "node:fs/promises";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { parseDicomHeader } from "../../imaging/dicomParsing.js";
import {
	enforceClinicalDicomAccess,
	normalizeUid,
	organizationExists,
	readDicomIdentity,
	resolveTenantOrSampleDicomPath,
	sampleDicomOwnerOrganizationId,
	sampleDicomPath,
	verifyDicomOrganization,
} from "../../dicomwebHelpers.js";

export async function handleQidoInstances(
	request: FastifyRequest<{ Params: { studyUid: string; seriesUid: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom qido instances"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "объектам КТ / DICOM")) return;

	const studyUid = normalizeUid(request.params.studyUid);
	const seriesUid = normalizeUid(request.params.seriesUid);
	if (!studyUid || !seriesUid) {
		return reply.code(400).send({ error: "InvalidUid", message: "Не указан StudyInstanceUID или SeriesInstanceUID." });
	}

	if (!(await verifyDicomOrganization(organizationId, reply))) return;

	const rows = await withTenantCtx(organizationId, async (tx) => {
		const orgKnown = await organizationExists(organizationId, tx);
		if (!orgKnown) return null;

		return tx
			.select({
				sopInstanceUid: schema.imagingInstances.dicomSopInstanceUid,
				instanceNumber: schema.imagingInstances.instanceNumber,
				sopClassUid: schema.imagingInstances.sopClassUid,
				storagePath: schema.imagingInstances.storagePath,
				rows: schema.imagingInstances.rows,
				columns: schema.imagingInstances.columns,
			})
			.from(schema.imagingInstances)
			.innerJoin(schema.imagingSeries, eq(schema.imagingSeries.id, schema.imagingInstances.seriesId))
			.innerJoin(schema.imagingStudies, eq(schema.imagingStudies.id, schema.imagingSeries.studyId))
			.where(
				and(
					eq(schema.imagingInstances.organizationId, organizationId),
					eq(schema.imagingSeries.organizationId, organizationId),
					eq(schema.imagingStudies.organizationId, organizationId),
					eq(schema.imagingStudies.dicomStudyUid, studyUid),
					eq(schema.imagingSeries.dicomSeriesUid, seriesUid),
				),
			);
	});

	if (rows === null) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	const dicomJson: Record<string, unknown>[] = [];
	for (const r of rows) {
		let actualRows = r.rows;
		let actualColumns = r.columns;

		if ((actualRows == null || actualColumns == null) && r.storagePath) {
			try {
				const resolvedStoragePath = resolveTenantOrSampleDicomPath(organizationId, r.storagePath);
				if (resolvedStoragePath) {
					const ident = await readDicomIdentity(resolvedStoragePath, request.log);
					if (ident) {
						if (actualRows == null && ident.rows != null) actualRows = ident.rows;
						if (actualColumns == null && ident.columns != null) actualColumns = ident.columns;
					}

					if (actualRows == null || actualColumns == null) {
						const probeBuf = Buffer.alloc(262144);
						const fh = await fs.open(resolvedStoragePath, "r");
						try {
							const { bytesRead } = await fh.read(probeBuf, 0, probeBuf.length, 0);
							const parsedHdr = parseDicomHeader(probeBuf.subarray(0, bytesRead));
							if (actualRows == null && parsedHdr.imageRows != null) actualRows = parsedHdr.imageRows;
							if (actualColumns == null && parsedHdr.imageColumns != null) actualColumns = parsedHdr.imageColumns;
						} finally {
							await fh.close();
						}
					}
				}
			} catch (err) {
				request.log.warn(
					{ err, storagePath: r.storagePath, studyUid, seriesUid },
					"Failed to probe DICOM file header for dimensions in QIDO instances",
				);
			}
		}

		dicomJson.push({
			"0020000D": { vr: "UI", Value: [studyUid] },
			"0020000E": { vr: "UI", Value: [seriesUid] },
			"00080018": { vr: "UI", Value: [r.sopInstanceUid] },
			"00200013": { vr: "IS", Value: [r.instanceNumber ?? 1] },
			"00080016": { vr: "UI", Value: [r.sopClassUid ?? "1.2.840.10008.5.1.4.1.1.2"] },
			"00280010": { vr: "US", Value: [actualRows ?? 512] },
			"00280011": { vr: "US", Value: [actualColumns ?? 512] },
		});
	}

	if (dicomJson.length === 0) {
		const sampleOwnerOrgId = sampleDicomOwnerOrganizationId();
		if (sampleOwnerOrgId !== null && sampleOwnerOrgId === organizationId) {
			const samplePath = sampleDicomPath();
			const ident = await readDicomIdentity(samplePath);
			if (ident?.studyUid === studyUid && ident.seriesUid === seriesUid && ident.sopInstanceUid) {
				dicomJson.push({
					"0020000D": { vr: "UI", Value: [studyUid] },
					"0020000E": { vr: "UI", Value: [seriesUid] },
					"00080018": { vr: "UI", Value: [ident.sopInstanceUid] },
					"00200013": { vr: "IS", Value: [1] },
					"00080016": { vr: "UI", Value: ["1.2.840.10008.5.1.4.1.1.2"] },
					"00280010": { vr: "US", Value: [ident.rows ?? 512] },
					"00280011": { vr: "US", Value: [ident.columns ?? 512] },
				});
			}
		}
	}

	reply.header("Content-Type", "application/dicom+json");
	return reply.code(200).send(dicomJson);
}
