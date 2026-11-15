import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getRequestIdentity } from "../../security/identity.js";
import {
	ALLOWED_SCAN_EXTENSIONS,
	createMockStorageSignature,
	MAX_SCAN_FILE_SIZE_BYTES,
	SCAN_MIME_TYPES,
} from "../../services/labScanDirectUpload.js";

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

function extractOrgFromKey(key: string): string | null {
	const match = key.match(/^org_([a-zA-Z0-9_-]+)\//);
	return match ? (match[1] ?? null) : null;
}

interface MockStorageQuery {
	key?: string;
	exp?: string;
	sig?: string;
}

function isMockStorageAuthorized(
	request: FastifyRequest<{ Querystring: MockStorageQuery }>,
	rawKey: string,
	action: "upload" | "download",
): { authorized: boolean; reason?: string; statusCode?: number } {
	const expStr = request.query?.exp;
	const sig = request.query?.sig;

	// Check 1: Cryptographic presigned URL signature (HMAC-SHA256)
	if (sig && expStr) {
		const exp = Number.parseInt(expStr, 10);
		if (Number.isNaN(exp)) {
			return { authorized: false, reason: "Некорректный параметр срока действия exp.", statusCode: 400 };
		}
		const nowSeconds = Math.floor(Date.now() / 1000);
		if (nowSeconds > exp) {
			return { authorized: false, reason: "Срок действия ссылки истек.", statusCode: 403 };
		}
		const expectedSig = createMockStorageSignature({
			storageKey: rawKey,
			action,
			expiresAtSeconds: exp,
		});
		if (
			sig.length === expectedSig.length &&
			crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))
		) {
			return { authorized: true };
		}
		return { authorized: false, reason: "Недействительная цифровая подпись ссылки.", statusCode: 403 };
	}

	// Check 2: Authenticated clinic staff session with tenant isolation
	const identity = getRequestIdentity(request);
	if (identity.organizationId) {
		const keyOrg = extractOrgFromKey(rawKey);
		const callerOrgClean = identity.organizationId.replace(/[^a-zA-Z0-9_-]/g, "");
		if (keyOrg && keyOrg === callerOrgClean) {
			return { authorized: true };
		}
		return {
			authorized: false,
			reason: "Доступ к файлам скана другой клиники или наряда запрещен.",
			statusCode: 403,
		};
	}

	return {
		authorized: false,
		reason: "Требуется авторизация сотрудника клиники или подписанный URL с параметрами exp и sig.",
		statusCode: 401,
	};
}

async function streamPayloadToDisk(
	source: Readable,
	destinationPath: string,
	maxSizeBytes: number,
): Promise<{ bytesWritten: number }> {
	const dir = path.dirname(destinationPath);
	if (!fs.existsSync(dir)) {
		await fs.promises.mkdir(dir, { recursive: true });
	}

	const tempPath = `${destinationPath}.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
	let bytes = 0;

	const byteCounter = new Transform({
		transform(chunk: Buffer, _encoding, callback) {
			bytes += chunk.length;
			if (bytes > maxSizeBytes) {
				callback(new Error("FILE_TOO_LARGE"));
				return;
			}
			callback(null, chunk);
		},
	});

	const outStream = fs.createWriteStream(tempPath);
	try {
		await pipeline(source, byteCounter, outStream);
		await fs.promises.rename(tempPath, destinationPath);
		return { bytesWritten: bytes };
	} catch (err) {
		try {
			if (fs.existsSync(tempPath)) {
				await fs.promises.unlink(tempPath);
			}
		} catch {
			// ignore cleanup error
		}
		throw err;
	}
}

export async function handleMockStorageUpload(
	request: FastifyRequest<{ Querystring: MockStorageQuery }>,
	reply: FastifyReply,
) {
	const rawKey = request.query?.key;
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

	// Security gate: Authorization check
	const authCheck = isMockStorageAuthorized(request, rawKey, "upload");
	if (!authCheck.authorized) {
		return reply.code(authCheck.statusCode ?? 401).send({
			error: authCheck.statusCode === 403 ? "Forbidden" : "Unauthorized",
			message: authCheck.reason,
		});
	}

	try {
		const body = request.body;
		let streamSource: Readable;

		if (body && typeof (body as { pipe?: unknown }).pipe === "function") {
			// Fastify custom parser stream
			streamSource = body as Readable;
		} else if (Buffer.isBuffer(body)) {
			if (body.length > MAX_SCAN_FILE_SIZE_BYTES) {
				return reply.code(413).send({
					error: "PayloadTooLarge",
					message: `Размер файла (${Math.round(body.length / (1024 * 1024))} МБ) превышает лимит 500 МБ.`,
				});
			}
			streamSource = Readable.from(body);
		} else if (typeof body === "string") {
			const buf = Buffer.from(body, "utf-8");
			if (buf.length > MAX_SCAN_FILE_SIZE_BYTES) {
				return reply.code(413).send({
					error: "PayloadTooLarge",
					message: "Размер файла превышает лимит 500 МБ.",
				});
			}
			streamSource = Readable.from(buf);
		} else if (request.raw && typeof request.raw.pipe === "function" && !request.raw.destroyed) {
			streamSource = request.raw;
		} else {
			streamSource = Readable.from(Buffer.alloc(0));
		}

		const { bytesWritten } = await streamPayloadToDisk(
			streamSource,
			resolved.resolvedPath,
			MAX_SCAN_FILE_SIZE_BYTES,
		);

		return reply.code(200).send({
			success: true,
			key: rawKey,
			storedPath: resolved.resolvedPath,
			bytesWritten,
		});
	} catch (err: unknown) {
		if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
			return reply.code(413).send({
				error: "PayloadTooLarge",
				message: "Размер файла превышает допустимый лимит 500 МБ.",
			});
		}
		request.log?.error?.(err, "Failed to stream scan upload to disk");
		return reply.code(500).send({
			error: "UploadFailed",
			message: "Не удалось сохранить файл 3D скана на сервере.",
		});
	}
}

export async function handleMockStorageDownload(
	request: FastifyRequest<{ Querystring: MockStorageQuery }>,
	reply: FastifyReply,
) {
	const rawKey = request.query?.key;
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

	// Security gate: Authorization check
	const authCheck = isMockStorageAuthorized(request, rawKey, "download");
	if (!authCheck.authorized) {
		return reply.code(authCheck.statusCode ?? 401).send({
			error: authCheck.statusCode === 403 ? "Forbidden" : "Unauthorized",
			message: authCheck.reason,
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
