import type { FastifyRequest, FastifyReply } from "fastify";
import {
	imagingImportPreviewRequestSchema,
	imagingImportCommitResponseSchema,
	type ImagingSourceKind,
} from "@dental/shared";
import { getImagingOrganizationId, parseImagingPayload } from "../imagingHelpers.js";
import { requireClinicalMutationAccess } from "../../../accessGuard.js";
import { extractIdempotencyKey, isValidUuid } from "../../../utils/httpIdempotency.js";
import { parseImagingManifest } from "../manifestParser.js";
import { createImagingStudyInDb } from "../../../db/imagingQuery.js";
import { kindLabels } from "../imagingConstants.js";
import { withTenantCtx } from "../../../db/rls.js";

export async function handleImagingImportCommit(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "imaging import commit"))) return;

	const orgId = getImagingOrganizationId(request, reply);
	if (!orgId) return;

	const idempotencyKey = extractIdempotencyKey(request);
	if (idempotencyKey && !isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "InvalidIdempotencyKey",
			message: "Некорректный заголовок Idempotency-Key (ожидается UUID RFC 9562)",
		});
	}
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);
	}

	const parsed = parseImagingPayload(
		imagingImportPreviewRequestSchema, request.body,
		"Импорт снимков не выполнен: повторно передайте ту же непустую выгрузку перед записью.",
	);
	if (!parsed.ok) return reply.code(400).send(parsed.response);
	return commitImagingImport(orgId, parsed.data);
}

export async function commitImagingImport(
	orgId: string,
	input: { sourceName: string; sourceKind: ImagingSourceKind; rawText: string },
) {
	return withTenantCtx(orgId, async (tx) => {
		const preview = await parseImagingManifest(orgId, input);
		const ids: string[] = [];
		for (const row of preview.rows) {
			if (row.status !== "ready" || !row.patientId || !row.kind || !row.filePath) {
				continue;
			}
			const study = await createImagingStudyInDb(
				orgId,
				{
					patientId: row.patientId,
					kind: row.kind,
					title: row.title ?? kindLabels[row.kind],
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
		const createdStudyIds = ids;

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
