import type { FastifyInstance } from "fastify";
import { definePublicRoute, defineStreamRoute } from "../../core/routeFactories.js";
import { MAX_SCAN_FILE_SIZE_BYTES } from "../../services/labScanDirectUpload.js";
import {
	handleDirectStorageDownload,
	handleDirectStorageUpload,
} from "./scansLocalStorageHandlers.js";
import { handlePortalLabScanDownloadUrl } from "./scansPortalHandlers.js";
import {
	handleLabScanDownloadUrl,
	handleLabScanUploadUrl,
} from "./scansUploadHandlers.js";

export async function registerLabScansUploadRoutes(app: FastifyInstance) {
	// Enable raw payload streaming for binary scan files to prevent RAM buffering / OOM
	const parsersToAdd: string[] = [];
	for (const ct of [
		"application/octet-stream",
		"model/stl",
		"model/ply",
		"model/obj",
		"application/dicom",
		"application/zip",
	]) {
		if (!app.hasContentTypeParser(ct)) {
			parsersToAdd.push(ct);
		}
	}
	if (parsersToAdd.length > 0) {
		app.addContentTypeParser(parsersToAdd, (_req, payload, done) => {
			done(null, payload);
		});
	}

	/**
	 * POST /api/lab/orders/:id/scans/upload-url
	 * Генерация Presigned URL для прямой загрузки тяжелых 3D сканов (STL/PLY/OBJ) в S3 бакет.
	 * Изоляция организации (organizationId) и заголовок Idempotency-Key (Мандат 8bo / RFC 9562).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lab/orders/:id/scans/upload-url",
		permission: "public",
		handler: async ({ request, reply }) => handleLabScanUploadUrl(request, reply),
	});

	/**
	 * GET /api/lab/orders/:id/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана для сотрудников клиники с изоляцией тенанта.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/lab/orders/:id/scans/download-url",
		permission: "public",
		handler: async ({ request, reply }) => handleLabScanDownloadUrl(request, reply),
	});

	/**
	 * GET /api/portal/lab-order/:token/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана зубным техником по токену наряда без авторизации клиники.
	 */
	definePublicRoute(app, {
		method: "GET",
		path: "/api/portal/lab-order/:token/scans/download-url",
		handler: async ({ request, reply }) => handlePortalLabScanDownloadUrl(request, reply),
	});

	/**
	 * PUT /api/portal/direct-storage/upload
	 * Локальное защищенное хранилище сканов клиники при отсутствии S3 (защита от path traversal, потоковый стриминг на диск).
	 * Потоковая запись без удержания PG-соединений (defineStreamRoute).
	 */
	defineStreamRoute(app, {
		method: "PUT",
		path: "/api/portal/direct-storage/upload",
		permission: "public",
		bodyLimit: MAX_SCAN_FILE_SIZE_BYTES + 1024 * 1024,
		schema: {
			headers: {
				type: "object",
				description:
					"Локальная загрузка 3D скана с проверкой organizationId и поддержкой Idempotency-Key",
			},
		},
		handler: async ({ request, reply }) =>
			handleDirectStorageUpload(request, reply),
	});

	/**
	 * GET /api/portal/direct-storage/download
	 * Локальная защищенная выдача сканов клиники зубному технику или врачу при отсутствии S3 (defineStreamRoute).
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/portal/direct-storage/download",
		permission: "public",
		handler: async ({ request, reply }) =>
			handleDirectStorageDownload(request, reply),
	});
}
