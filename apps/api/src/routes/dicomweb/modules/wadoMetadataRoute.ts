import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import * as schema from "../../../db/schema.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { parseDicomHeader } from "../../imaging/dicomParsing.js";
import {
	type DicomFileIdentity,
	enforceClinicalDicomAccess,
	normalizeUid,
	organizationExists,
	readDicomIdentity,
	sampleDicomOwnerOrganizationId,
	sampleDicomPath,
	verifyDicomOrganization,
} from "../../dicomwebHelpers.js";

export async function handleWadoSeriesMetadata(
	request: FastifyRequest<{ Params: { studyUid: string; seriesUid: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "dicom series metadata"))) return;
	const organizationId = requireOrganizationId(request, reply);
	if (!organizationId) return;

	if (!enforceClinicalDicomAccess(request, reply, "метаданным серии")) return;

	const studyUid = normalizeUid(request.params.studyUid);
	const seriesUid = normalizeUid(request.params.seriesUid);
	if (!studyUid || !seriesUid) {
		return reply.code(400).send({ error: "InvalidUid", message: "Не указан StudyInstanceUID или SeriesInstanceUID." });
	}

	if (!(await verifyDicomOrganization(organizationId, reply))) return;

	const instances = await withTenantCtx(organizationId, async () => {
		const orgKnown = await organizationExists(organizationId);
		if (!orgKnown) return null;

		return db
			.select({
				sopInstanceUid: schema.imagingInstances.dicomSopInstanceUid,
				instanceNumber: schema.imagingInstances.instanceNumber,
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

	if (instances === null) {
		return reply.code(403).send({ error: "OrganizationUnknown", message: "Организация из токена не существует." });
	}

	const metadataList: Record<string, unknown>[] = [];
	for (const inst of instances) {
		let ident: DicomFileIdentity | null = null;
		let actualRows = inst.rows;
		let actualColumns = inst.columns;

		if (inst.storagePath) {
			try {
				const resolvedStoragePath = path.resolve(inst.storagePath);
				ident = await readDicomIdentity(resolvedStoragePath);
				if (actualRows == null && ident?.rows != null) actualRows = ident.rows;
				if (actualColumns == null && ident?.columns != null) actualColumns = ident.columns;

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
			} catch (err) {
				request.log.warn({ err, storagePath: inst.storagePath, studyUid, seriesUid }, "Failed to probe DICOM file header for dimensions in WADO series metadata");
			}
		}
		metadataList.push({
			"0020000D": { vr: "UI", Value: [studyUid] },
			"0020000E": { vr: "UI", Value: [seriesUid] },
			"00080018": { vr: "UI", Value: [inst.sopInstanceUid] },
			"00200013": { vr: "IS", Value: [inst.instanceNumber ?? 1] },
			"00280008": { vr: "IS", Value: [ident?.numberOfFrames ?? 1] },
			"00280010": { vr: "US", Value: [actualRows ?? 512] },
			"00280011": { vr: "US", Value: [actualColumns ?? 512] },
			"00280100": { vr: "US", Value: [ident?.bitsAllocated ?? 16] },
		});
	}

	if (metadataList.length === 0) {
		const sampleOwnerOrgId = sampleDicomOwnerOrganizationId();
		if (sampleOwnerOrgId !== null && sampleOwnerOrgId === organizationId) {
			const samplePath = sampleDicomPath();
			const ident = await readDicomIdentity(samplePath);
			if (ident?.studyUid === studyUid && ident.seriesUid === seriesUid && ident.sopInstanceUid) {
				metadataList.push({
					"0020000D": { vr: "UI", Value: [studyUid] },
					"0020000E": { vr: "UI", Value: [seriesUid] },
					"00080018": { vr: "UI", Value: [ident.sopInstanceUid] },
					"00200013": { vr: "IS", Value: [1] },
					"00280008": { vr: "IS", Value: [ident.numberOfFrames] },
					"00280010": { vr: "US", Value: [ident.rows ?? 512] },
					"00280011": { vr: "US", Value: [ident.columns ?? 512] },
					"00280100": { vr: "US", Value: [ident.bitsAllocated ?? 16] },
				});
			}
		}
	}

	reply.header("Content-Type", "application/dicom+json");
	return reply.code(200).send(metadataList);
}
