import type { FastifyInstance, FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import path from "node:path";
import fs from "node:fs";
import { pipeline } from "node:stream/promises";
import {
	ALLOWED_SCAN_EXTENSIONS,
	MAX_SCAN_FILE_SIZE_BYTES,
	SCAN_MIME_TYPES,
} from "../../services/labScanDirectUpload.js";

const BASE_STORAGE_DIR = path.resolve(process.cwd(), ".data", "lab_scans");

/**
 * Безопасное разрешение пути к файлу 3D-скана в локальном офлайн-хранилище (.data/lab_scans/)
 * с защитой от Path Traversal, изоляцией организации и проверкой расширения.
 */
export function resolveSafeStoragePath(key: string): string | null {
	if (!key || typeof key !== "string") return null;
	// Строгий запрет на попытки Path Traversal и абсолютные пути
	if (key.includes("..") || key.includes("\\") || path.isAbsolute(key)) {
		return null;
	}
	// Изоляция организации: ключ ОБЯЗАН начинаться с префикса org_<id>/
	if (!/^org_[a-zA-Z0-9_-]+\//.test(key)) {
		return null;
	}
	// Валидация расширения файла (только стоматологические 3D форматы: stl, ply, obj, dcm, zip)
	const extMatch = /\.([a-zA-Z0-9]+)$/.exec(key);
	const rawExt = extMatch?.[1];
	const ext = typeof rawExt === "string" ? rawExt.toLowerCase() : undefined;
	if (!ext || !ALLOWED_SCAN_EXTENSIONS.has(ext)) {
		return null;
	}
	const fullPath = path.resolve(BASE_STORAGE_DIR, key);
	if (!fullPath.startsWith(BASE_STORAGE_DIR)) return null;
	return fullPath;
}

interface MockStorageQuery {
	key?: string;
}

export async function registerPortalMockStorageRoutes(server: FastifyInstance): Promise<void> {
	// Добавляем парсер двоичных данных для стоматологических форматов 3D сканов
	for (const ct of [
		"application/octet-stream",
		"model/stl",
		"model/ply",
		"application/x-ply",
		"model/obj",
		"application/dicom",
		"application/zip",
		"application/sla",
	]) {
		if (!server.hasContentTypeParser(ct)) {
			server.addContentTypeParser(ct, (_request, payload, done) => {
				done(null, payload);
			});
		}
	}

	/**
	 * PUT / POST /api/portal/mock-storage/upload?key=...
	 * Локальное сохранение файла скана в .data/lab_scans/ при отсутствии S3 ключей (офлайн клиники).
	 */
	const handleUpload = async (request: FastifyRequest<{ Querystring: MockStorageQuery }>, reply: FastifyReply) => {
		const key = request.query?.key;
		if (!key) {
			return reply.status(400).send({ error: "Ключ хранилища (key) обязателен для загрузки скана" });
		}

		const fullPath = resolveSafeStoragePath(key);
		if (!fullPath) {
			return reply.status(400).send({ error: "Недопустимый ключ хранилища (Path Traversal запрещен, требуется формат org_<id>/... и расширение STL/PLY/OBJ/DCM/ZIP)" });
		}

		// Изоляция организации: проверка соответствия ключа вызывающей организации
		const orgHeader = (request.headers["x-organization-id"] as string | undefined)?.trim();
		const requestContext = request as unknown as { tenantId?: string; organizationId?: string };
		const callerOrg = requestContext.tenantId || requestContext.organizationId || orgHeader;
		if (callerOrg && typeof callerOrg === "string") {
			const cleanOrg = "org_" + callerOrg.replace(/[^a-zA-Z0-9_-]/g, "");
			const keyOrg = key.split("/")[0] ?? "";
			if (!keyOrg || keyOrg !== cleanOrg) {
				return reply.status(403).send({ error: "Доступ к хранилищу другой организации запрещен" });
			}
		}

		// Проверка размера буфера в памяти
		if (Buffer.isBuffer(request.body) && request.body.length > MAX_SCAN_FILE_SIZE_BYTES) {
			return reply.status(413).send({ error: "Размер файла превышает допустимый лимит 500 МБ" });
		}

		try {
			await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

			let bytesWritten = 0;
			if (Buffer.isBuffer(request.body)) {
				await fs.promises.writeFile(fullPath, request.body);
				bytesWritten = request.body.length;
			} else if (
				request.body &&
				typeof request.body === "object" &&
				"pipe" in request.body &&
				typeof (request.body as { pipe?: unknown }).pipe === "function"
			) {
				const writeStream = fs.createWriteStream(fullPath);
				await pipeline(request.body as unknown as NodeJS.ReadableStream, writeStream);
				const stat = await fs.promises.stat(fullPath);
				bytesWritten = stat.size;
			} else if (
				request.raw &&
				typeof request.raw === "object" &&
				"pipe" in request.raw &&
				typeof (request.raw as { pipe?: unknown }).pipe === "function"
			) {
				const writeStream = fs.createWriteStream(fullPath);
				await pipeline(request.raw, writeStream);
				const stat = await fs.promises.stat(fullPath);
				bytesWritten = stat.size;
			} else {
				return reply.status(400).send({ error: "Отсутствует тело файла для загрузки" });
			}

			if (bytesWritten > MAX_SCAN_FILE_SIZE_BYTES) {
				await fs.promises.unlink(fullPath).catch(() => {});
				return reply.status(413).send({ error: "Размер файла превышает допустимый лимит 500 МБ" });
			}

			return reply.status(200).send({
				success: true,
				storageKey: key,
				bytesWritten,
				provider: "local_mock_fallback",
			});
		} catch (err) {
			request.log.error(err, "Ошибка при локальном сохранении 3D-скана");
			return reply.status(500).send({ error: "Ошибка при сохранении файла скана на диск" });
		}
	};

	server.put("/mock-storage/upload", handleUpload);
	server.post("/mock-storage/upload", handleUpload);

	/**
	 * GET /api/portal/mock-storage/download?key=...
	 * Локальная отдача файла скана технику из .data/lab_scans/
	 */
	server.get("/mock-storage/download", async (request: FastifyRequest<{ Querystring: MockStorageQuery }>, reply: FastifyReply) => {
		const key = request.query?.key;
		if (!key) {
			return reply.status(400).send({ error: "Ключ хранилища (key) обязателен для скачивания скана" });
		}

		const fullPath = resolveSafeStoragePath(key);
		if (!fullPath) {
			return reply.status(400).send({ error: "Недопустимый ключ хранилища" });
		}

		// Изоляция организации: проверка соответствия ключа вызывающей организации
		const orgHeader = (request.headers["x-organization-id"] as string | undefined)?.trim();
		const requestContext = request as unknown as { tenantId?: string; organizationId?: string };
		const callerOrg = requestContext.tenantId || requestContext.organizationId || orgHeader;
		if (callerOrg && typeof callerOrg === "string") {
			const cleanOrg = "org_" + callerOrg.replace(/[^a-zA-Z0-9_-]/g, "");
			const keyOrg = key.split("/")[0] ?? "";
			if (!keyOrg || keyOrg !== cleanOrg) {
				return reply.status(403).send({ error: "Доступ к скачиванию скана другой организации запрещен" });
			}
		}

		if (!fs.existsSync(fullPath)) {
			return reply.status(404).send({ error: "Файл 3D-скана не найден на диске" });
		}

		try {
			const stat = await fs.promises.stat(fullPath);
			const ext = path.extname(fullPath).toLowerCase().replace(".", "");
			const mimeType = SCAN_MIME_TYPES[ext] || "application/octet-stream";
			const fileName = path.basename(fullPath);

			reply.header("content-type", mimeType);
			reply.header("content-disposition", `attachment; filename="${fileName}"`);
			reply.header("content-length", stat.size);

			return reply.send(fs.createReadStream(fullPath));
		} catch (err) {
			request.log.error(err, "Ошибка при чтении файла 3D-скана");
			return reply.status(500).send({ error: "Ошибка при чтении файла с диска" });
		}
	});
};

export default registerPortalMockStorageRoutes;
