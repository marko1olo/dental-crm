import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { getLabOrderByToken } from "../../db/labQuery.js";
import { labOrders } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	getLabScanDownloadPresignedUrl,
	getLabScanUploadPresignedUrl,
	isS3DirectUploadConfigured,
	validateScanFileMeta,
} from "../../services/labScanDirectUpload.js";

export async function registerLabScansUploadRoutes(app: FastifyInstance) {
	/**
	 * POST /api/lab/orders/:id/scans/upload-url
	 * Генерация Presigned URL для прямой загрузки тяжелых 3D сканов (STL/PLY/OBJ) в S3 бакет.
	 */
	app.post("/api/lab/orders/:id/scans/upload-url", async (request, reply) => {
		const { id } = request.params as { id: string };
		const identity = getRequestIdentity(request);
		const orgId = identity?.organizationId;
		if (!orgId) {
			return reply.code(401).send({
				error: "Unauthorized",
				message: "Требуется авторизация сотрудника клиники.",
			});
		}

		const body = request.body as { fileName?: string; fileSizeBytes?: number; expiresInSeconds?: number } | undefined;
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

		const [order] = await db
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);

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
	});

	/**
	 * GET /api/lab/orders/:id/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана для сотрудников клиники с изоляцией тенанта.
	 */
	app.get("/api/lab/orders/:id/scans/download-url", async (request, reply) => {
		const { id } = request.params as { id: string };
		const identity = getRequestIdentity(request);
		const orgId = identity?.organizationId;
		if (!orgId) {
			return reply.code(401).send({
				error: "Unauthorized",
				message: "Требуется авторизация сотрудника клиники.",
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

		const [order] = await db
			.select({ id: labOrders.id })
			.from(labOrders)
			.where(and(eq(labOrders.id, id), eq(labOrders.organizationId, orgId)))
			.limit(1);

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
	});

	/**
	 * GET /api/portal/lab-order/:token/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана зубным техником по токену наряда без авторизации клиники.
	 */
	app.get("/api/portal/lab-order/:token/scans/download-url", async (request, reply) => {
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
	});
}
