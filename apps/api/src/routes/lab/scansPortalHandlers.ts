import type { FastifyReply, FastifyRequest } from "fastify";
import { getLabOrderByToken } from "../../db/labQuery.js";
import {
	getLabScanDownloadPresignedUrl,
	isS3DirectUploadConfigured,
} from "../../services/labScanDirectUpload.js";

export async function handlePortalLabScanDownloadUrl(request: FastifyRequest, reply: FastifyReply) {
	const { token } = request.params as { token: string };
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

	const query = request.query as { storageKey?: string; expiresInSeconds?: string } | undefined;
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

	const expiresInSeconds = query.expiresInSeconds ? Number.parseInt(query.expiresInSeconds, 10) : undefined;
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
