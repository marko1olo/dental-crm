import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { generateUuidV7, isValidUuid } from "@dental/shared";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import { evaluateClinicalAccess } from "../../security/medicalSecrecyWarden.js";
import {
	getLabScanDownloadPresignedUrl,
	getLabScanUploadPresignedUrl,
	isS3DirectUploadConfigured,
	validateScanFileMeta,
} from "../../services/labScanDirectUpload.js";

export async function handleLabScanUploadUrl(
	request: FastifyRequest<{
		Params: { id: string };
		Body: { fileName?: string; fileSizeBytes?: number; expiresInSeconds?: number };
	}>,
	reply: FastifyReply,
) {
	const orgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"lab scan upload url",
	);
	if (reply.sent || !orgId) return reply;

	const identity = getRequestIdentity(request);
	const staffRole = identity.role ?? request.user?.role ?? null;
	const evalAccess = evaluateClinicalAccess(staffRole);
	if (!evalAccess.hasClinicalAccess) {
		return reply.code(403).send({
			error: "PermissionDenied",
			permission: "clinical.lab_order.write",
			role: staffRole,
			message: `Отказ в загрузке скана ЗТЛ: ${evalAccess.reason}`,
		});
	}

	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.headers?.["Idempotency-Key"] as string | undefined);

	let idempotencyKey = rawIdempotencyKey?.trim();
	if (!idempotencyKey) {
		idempotencyKey = generateUuidV7();
	} else if (!isValidUuid(idempotencyKey)) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный формат Idempotency-Key (ожидается UUID/UUIDv7).",
		});
	}
	reply.header("Idempotency-Key", idempotencyKey);

	const id = request.params.id;
	const body = request.body;
	if (!body || !body.fileName) {
		return reply.code(400).send({
			error: "BadRequest",
			message: "Имя файла скана (fileName) обязательно.",
		});
	}

	const validation = validateScanFileMeta(body.fileName, body.fileSizeBytes);
	if (!validation.isValid) {
		return reply.code(400).send({
			error: "InvalidScanFile",
			message: validation.error,
		});
	}

	const order = await withTenantReadCtx(orgId, async (tx) => {
		const [res] = await tx
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);
		return res ?? null;
	});

	if (!order) {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден.",
		});
	}

	const presigned = getLabScanUploadPresignedUrl({
		organizationId: orgId,
		labOrderId: id,
		fileName: body.fileName,
		fileSizeBytes: body.fileSizeBytes,
		expiresInSeconds: body.expiresInSeconds,
	});

	return reply.send({
		success: true,
		isDirectS3: isS3DirectUploadConfigured(),
		...presigned,
	});
}

export { handleLabScanDownloadUrl } from "./scansDownloadHandler.js";
