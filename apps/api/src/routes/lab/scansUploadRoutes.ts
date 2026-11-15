import type { FastifyInstance } from "fastify";
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
	 */
	app.post("/api/lab/orders/:id/scans/upload-url", handleLabScanUploadUrl);

	/**
	 * GET /api/lab/orders/:id/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана для сотрудников клиники с изоляцией тенанта.
	 */
	app.get("/api/lab/orders/:id/scans/download-url", handleLabScanDownloadUrl);

	/**
	 * GET /api/portal/lab-order/:token/scans/download-url
	 * Получение Presigned URL на скачивание 3D скана зубным техником по токену наряда без авторизации клиники.
	 */
	app.get("/api/portal/lab-order/:token/scans/download-url", handlePortalLabScanDownloadUrl);

	/**
	 * PUT /api/portal/direct-storage/upload
	 * Локальное защищенное хранилище сканов клиники при отсутствии S3 (защита от path traversal, потоковый стриминг на диск).
	 */
	app.put(
		"/api/portal/direct-storage/upload",
		{
			bodyLimit: MAX_SCAN_FILE_SIZE_BYTES + 1024 * 1024,
		},
		handleDirectStorageUpload,
	);

	/**
	 * GET /api/portal/direct-storage/download
	 * Локальная защищенная выдача сканов клиники зубному технику или врачу при отсутствии S3.
	 */
	app.get("/api/portal/direct-storage/download", handleDirectStorageDownload);

	// Backward-compatible alias for legacy / mock URLs
	app.put(
		"/api/portal/mock-storage/upload",
		{
			bodyLimit: MAX_SCAN_FILE_SIZE_BYTES + 1024 * 1024,
		},
		handleDirectStorageUpload,
	);
	app.get("/api/portal/mock-storage/download", handleDirectStorageDownload);
}
