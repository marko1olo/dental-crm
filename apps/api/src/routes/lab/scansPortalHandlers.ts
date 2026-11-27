import type { FastifyReply, FastifyRequest } from "fastify";
import { getLabOrderByToken } from "../../db/labQuery.js";
import {
	getLabScanDownloadPresignedUrl,
	isS3DirectUploadConfigured,
} from "../../services/labScanDirectUpload.js";

export async function handlePortalLabScanDownloadUrl(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const rawToken =
		typeof request.params === "object" && request.params !== null && "token" in request.params
			? request.params.token
			: undefined;
	const token = typeof rawToken === "string" ? rawToken : "";
	if (!token) {
		return reply.code(400).send({
			error: "TokenRequired",
			message: "Токен наряда обязателен.",
		});
	}

	const order = await getLabOrderByToken(token);
	if (!order) {
		return reply.code(404).send({
			error: "LabOrderNotFound",
			message: "Заказ-наряд ЗТЛ не найден или ссылка недействительна.",
		});
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

	const orgClean = order.organizationId.replace(/[^a-zA-Z0-9_-]/g, "");
	const orderClean = order.id.replace(/[^a-zA-Z0-9_-]/g, "");
	const expectedPrefix = `org_${orgClean}/lab_orders/${orderClean}/`;
	if (!storageKey.startsWith(expectedPrefix)) {
		return reply.code(403).send({
			error: "AccessDenied",
			message: "Доступ к файлам скана чужого наряда или клиники запрещен.",
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
