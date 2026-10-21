import type { FastifyInstance } from "fastify";
import { handlePortalLabScanDownloadUrl } from "./scansPortalHandlers.js";
import {
	handleLabScanDownloadUrl,
	handleLabScanUploadUrl,
} from "./scansUploadHandlers.js";

export async function registerLabScansUploadRoutes(app: FastifyInstance) {
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
}
