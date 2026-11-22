import type { FastifyRequest, FastifyReply } from "fastify";
import {
	imagingImportPreviewRequestSchema,
	imagingImportCommitResponseSchema,
	type ImagingSourceKind,
} from "@dental/shared";
import { getImagingOrganizationId, parseImagingPayload } from "../imagingHelpers.js";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { parseImagingManifest } from "../manifestParser.js";
import { createImagingStudyInDb } from "../../../db/imagingQuery.js";
import { kindLabels } from "../imagingConstants.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";

export async function handleImagingImportCommit(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging import commit"))) return;
	const parsed = parseImagingPayload(
		imagingImportPreviewRequestSchema, request.body,
		"Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;
	return commitImagingImport(orgId, parsed.data);
}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	return withTenantCtx(orgId, async () => {
		const preview = await parseImagingManifest(orgId, input);
		const readyRows = preview.rows.filter(
			(row) => row.status === "ready" && row.patientId && row.kind && row.filePath,
		);
		const createdStudyIds = await db.transaction(async (tx) => {
			const ids: string[] = [];
			for (const row of readyRows) {
				const study = await createImagingStudyInDb(
					orgId,
					{
						patientId: row.patientId!,
						kind: row.kind!,
						title: row.title ?? kindLabels[row.kind!],
						toothCode: row.toothCode,
						region: row.region,
						sourceKind: row.sourceKind,
						sourceName: row.sourceName,
						storagePath: row.filePath,
						capturedAt: row.capturedAt ?? undefined,
					},
					tx,
				);
				ids.push(study.id);
			}
			return ids;
		});

		return imagingImportCommitResponseSchema.parse({
			sourceName: input.sourceName,
			sourceKind: input.sourceKind,
			importedCount: createdStudyIds.length,
			skippedCount: preview.totalRows - createdStudyIds.length,
			createdStudyIds,
			preview,
		});
	});
}
