import fs from "node:fs";
import path from "node:path";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ALLOWED_SCAN_EXTENSIONS, SCAN_MIME_TYPES } from "../../services/labScanDirectUpload.js";

const LOCAL_SCANS_DIR = path.resolve(process.cwd(), ".data", "lab_scans");

export function validateAndResolveStoragePath(rawKey: string): { resolvedPath: string; ext: string; safeFileName: string } | null {
	if (!rawKey || typeof rawKey !== "string") return null;
	const normalizedKey = rawKey.replace(/\\/g, "/").trim();
	// Path traversal protection: no .. or leading slash
	if (normalizedKey.includes("..") || normalizedKey.startsWith("/")) {
		return null;
	}
	// Pattern check: org_<clean>/lab_orders/<clean>/<filename>
	const keyPattern = /^org_[a-zA-Z0-9_-]+\/lab_orders\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/;
	if (!keyPattern.test(normalizedKey)) {
		return null;
	}

	const parts = normalizedKey.split("/");
	const safeFileName = parts[parts.length - 1] ?? "scan.stl";
	const dotIdx = safeFileName.lastIndexOf(".");
	if (dotIdx === -1 || dotIdx === safeFileName.length - 1) {
		return null;
	}
	const ext = safeFileName.slice(dotIdx + 1).toLowerCase();
	if (!ALLOWED_SCAN_EXTENSIONS.has(ext)) {
		return null;
	}

	const resolvedPath = path.resolve(LOCAL_SCANS_DIR, normalizedKey);
	if (!resolvedPath.startsWith(LOCAL_SCANS_DIR)) {
		return null;
	}

	return { resolvedPath, ext, safeFileName };
}

export async function handleMockStorageUpload(request: FastifyRequest, reply: FastifyReply) {
	const query = request.query as { key?: string };
	const rawKey = query.key;
	if (!rawKey) {
		return reply.code(400).send({ error: "BadRequest", message: "Параметр key обязателен." });
	}

	const resolved = validateAndResolveStoragePath(rawKey);
	if (!resolved) {
		return reply.code(400).send({
			error: "InvalidStorageKey",
			message: "Недопустимый ключ хранилища или формат файла. Разрешены только .stl, .ply, .obj, .dcm, .zip.",
		});
	}

	const dir = path.dirname(resolved.resolvedPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const body = request.body;
	if (Buffer.isBuffer(body)) {
		await fs.promises.writeFile(resolved.resolvedPath, body);
	} else if (typeof body === "string") {
		await fs.promises.writeFile(resolved.resolvedPath, Buffer.from(body, "utf-8"));
	} else if (body && typeof body === "object") {
		await fs.promises.writeFile(resolved.resolvedPath, JSON.stringify(body));
	} else {
		await fs.promises.writeFile(resolved.resolvedPath, Buffer.alloc(0));
	}

	return reply.code(200).send({
		success: true,
		key: rawKey,
		storedPath: resolved.resolvedPath,
	});
}

export async function handleMockStorageDownload(request: FastifyRequest, reply: FastifyReply) {
	const query = request.query as { key?: string };
	const rawKey = query.key;
	if (!rawKey) {
		return reply.code(400).send({ error: "BadRequest", message: "Параметр key обязателен." });
	}

	const resolved = validateAndResolveStoragePath(rawKey);
	if (!resolved) {
		return reply.code(400).send({
			error: "InvalidStorageKey",
			message: "Недопустимый ключ хранилища или формат файла.",
		});
	}

	if (!fs.existsSync(resolved.resolvedPath)) {
		return reply.code(404).send({
			error: "FileNotFound",
			message: "Файл скана не найден на сервере клиники.",
		});
	}

	const mimeType = SCAN_MIME_TYPES[resolved.ext] || "application/octet-stream";
	const stream = fs.createReadStream(resolved.resolvedPath);
	reply.header("Content-Type", mimeType);
	reply.header("Content-Disposition", `attachment; filename="${resolved.safeFileName}"`);
	return reply.send(stream);
}
