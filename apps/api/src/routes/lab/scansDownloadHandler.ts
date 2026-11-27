import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { withTenantReadCtx } from "../../db/rls.js";
import { labOrders } from "../../db/schema.js";
import {
	getRequestIdentity,
	verifyActiveStaffSession,
} from "../../security/identity.js";
import {
	getLabScanDownloadPresignedUrl,
	isS3DirectUploadConfigured,
} from "../../services/labScanDirectUpload.js";

export async function handleLabScanDownloadUrl(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const rawId =
		typeof request.params === "object" && request.params !== null && "id" in request.params
			? request.params.id
			: undefined;
	const id = typeof rawId === "string" ? rawId : "";
	const identity = getRequestIdentity(request);
	const orgId = identity?.organizationId;
	if (!orgId) {
		return reply.code(401).send({
			error: "Unauthorized",
			message: "Требуется авторизация сотрудника клиники.",
		});
	}
	if (identity.userId) {
		const sessionValid = await verifyActiveStaffSession(
			request,
			reply,
			orgId,
			identity.userId,
			identity.sessionId,
		);
		if (!sessionValid) return;
	}

	const query =
		typeof request.query === "object" && request.query !== null
			? (request.query as Record<string, unknown>)
			: undefined;
	const storageKey = query?.storageKey;
	if (!storageKey || typeof storageKey !== "string" || !storageKey.trim()) {
		return reply.code(400).send({
			error: "BadRequest",
			message: "Параметр storageKey обязателен.",
		});
	}

	const order = await withTenantReadCtx(orgId, async (tx) => {
		const [found] = await tx
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);
		return found ?? null;
	});

	if (!order) {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден.",
		});
	}

	const orgClean = orgId.replace(/[^a-zA-Z0-9_-]/g, "");
	const orderClean = id.replace(/[^a-zA-Z0-9_-]/g, "");
	const expectedPrefix = `org_${orgClean}/lab_orders/${orderClean}/`;
	if (!storageKey.startsWith(expectedPrefix)) {
		return reply.code(403).send({
			error: "AccessDenied",
			message: "Доступ к файлам скана другого наряда или клиники запрещен.",
		});
	}

	const expiresInSeconds =
		typeof query.expiresInSeconds === "string"
			? Number.parseInt(query.expiresInSeconds, 10)
			: undefined;
	const presigned = getLabScanDownloadPresignedUrl({
		storageKey,
		expiresInSeconds: Number.isNaN(expiresInSeconds) ? undefined : expiresInSeconds,
	});

	return reply.send({
		success: true,
		isDirectS3: isS3DirectUploadConfigured(),
		...presigned,
	});
}
