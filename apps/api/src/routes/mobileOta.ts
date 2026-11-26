/**
 * mobileOta.ts — Маршруты и сервис Over-The-Air (OTA) обновлений DENTE CRM.
 *
 * МАРШРУТЫ:
 * - GET /api/mobile/version.json — Возвращает манифест актуальной версии, SHA-256 хеш бандла,
 *   минимально поддерживаемую версию и флаг обязательного обновления.
 * - GET /api/mobile/bundle.zip — Раздача упакованного бинарного бандла веб-диста с проверкой целостности.
 * - POST /api/mobile/publish — Динамическая публикация новой версии (для CI/CD и тестов).
 * - GET /api/mobile/health — Проверка состояния подсистемы OTA.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { ZipFile } from "yazl";
import {
	type MobileOtaVersionQuery,
	type MobileOtaVersionResponse,
	evaluateOtaUpdatePolicy,
	mobileOtaVersionQuerySchema,
	mobileOtaVersionResponseSchema,
} from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireSuperadmin,
	resolveOrganizationId,
} from "../accessGuard.js";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import { createApiLogger } from "../observability/logger.js";

const otaLogger = createApiLogger("mobileOta");

const mobileOtaPublishBodySchema = z
	.object({
		version: z.string().trim().min(1),
		minSupportedVersion: z.string().trim().min(1).optional(),
		releaseNotes: z.string().max(4000).optional(),
		customContent: z.string().max(250_000).optional(),
	})
	.strict();

/**
 * Конфигурация OTA по умолчанию.
 */
export interface OtaRuntimeConfig {
	version: string;
	minSupportedVersion: string;
	releaseNotes: string;
	downloadUrl: string;
	publishedAt: string;
	customBundleZipPath?: string;
}

function createDefaultOtaConfig(): OtaRuntimeConfig {
	return {
		version: process.env.DENTE_OTA_VERSION ?? "2.4.0",
		minSupportedVersion:
			process.env.DENTE_OTA_MIN_SUPPORTED_VERSION ?? "2.0.0",
		releaseNotes:
			"Плановое обновление DENTE CRM: оптимизация работы со снимками, защита целостности офлайн-мутаций, ускорение рендеринга зубной формулы.",
		downloadUrl: "/api/mobile/bundle.zip",
		publishedAt: new Date().toISOString(),
	};
}

/**
 * Кэш сгенерированного / прочитанного с диска бандла.
 */
interface CachedBundle {
	version: string;
	buffer: Buffer | null;
	filePath?: string | undefined;
	mtimeMs?: number | undefined;
	sha256: string;
	sizeBytes: number;
	generatedAt: string;
}

interface TenantOtaState {
	config: OtaRuntimeConfig;
	cachedBundle: CachedBundle | null;
}

const otaStateByOrg = new BoundedTtlMap<string, TenantOtaState>({
	maxEntries: 200,
	ttlMs: 24 * 60 * 60 * 1000,
});

function otaStateKey(orgId: string | null): string {
	return orgId?.trim() || "__platform__";
}

function getTenantOtaState(orgId: string | null): TenantOtaState {
	const key = otaStateKey(orgId);
	let state = otaStateByOrg.get(key);
	if (!state) {
		state = {
			config: createDefaultOtaConfig(),
			cachedBundle: null,
		};
		otaStateByOrg.set(key, state);
	}
	return state;
}

/**
 * Вычисление CRC-32 для ZIP заголовков.
 */
export function calculateCrc32(buf: Buffer): number {
	let crc = 0xffffffff;
	for (let i = 0; i < buf.length; i++) {
		const byte = buf[i] ?? 0;
		crc ^= byte;
		for (let j = 0; j < 8; j++) {
			crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
		}
	}
	return (crc ^ 0xffffffff) >>> 0;
}

async function computeFileSha256Stream(filePath: string): Promise<string> {
	const hash = crypto.createHash("sha256");
	const stream = fs.createReadStream(filePath, { highWaterMark: 64 * 1024 });
	for await (const chunk of stream) {
		hash.update(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return hash.digest("hex");
}

function normalizeAndValidateZipEntryName(rawInput: string): string {
	const rawName = rawInput.replace(/\\/g, "/");
	const normalized = path.posix.normalize(rawName);
	const cleanName = normalized.replace(/^\/+/, "");

	if (
		!cleanName ||
		cleanName.includes("\0") ||
		cleanName.startsWith("../") ||
		cleanName === ".." ||
		path.posix.isAbsolute(normalized) ||
		cleanName.split("/").includes("..")
	) {
		throw new Error(
			`Zip Slip Security Guard: некорректный или небезопасный путь записи в архив: "${rawInput}"`,
		);
	}
	return cleanName;
}

/**
 * Потоковый сборщик PKZIP на базе yazl (MIT) с Zip Slip защитой.
 */
export function createZipStream(
	entries: Array<{ name: string; data: Buffer }>,
): NodeJS.ReadableStream {
	const zip = new ZipFile();
	const deterministicDate = new Date(0);
	for (const entry of entries) {
		const cleanName = normalizeAndValidateZipEntryName(entry.name);
		zip.addBuffer(entry.data, cleanName, {
			compress: true,
			compressionLevel: 6,
			mtime: deterministicDate,
		});
	}
	zip.end();
	return zip.outputStream;
}

export async function createZipArchiveAsync(
	entries: Array<{ name: string; data: Buffer }>,
): Promise<Buffer> {
	const stream = createZipStream(entries);
	const chunks: Buffer[] = [];
	for await (const chunk of stream) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

/**
 * Чистый генератор PKZIP архива без сторонних бинарных зависимостей (синхронный для unit-тестов).
 */
export function createZipArchive(
	entries: Array<{ name: string; data: Buffer }>,
): Buffer {
	const localHeaders: Buffer[] = [];
	const centralHeaders: Buffer[] = [];
	let offset = 0;

	for (const entry of entries) {
		const cleanName = normalizeAndValidateZipEntryName(entry.name);

		const nameBuffer = Buffer.from(cleanName, "utf-8");
		const uncompressedSize = entry.data.length;
		const crc = calculateCrc32(entry.data);

		// Сжатие Deflate
		const deflated = zlib.deflateRawSync(entry.data, { level: 6 });
		const useDeflate = deflated.length < uncompressedSize;
		const compressedData = useDeflate ? deflated : entry.data;
		const compressionMethod = useDeflate ? 8 : 0;
		const compressedSize = compressedData.length;

		// Local file header (30 bytes + name length + data length)
		const localHeader = Buffer.alloc(30 + nameBuffer.length);
		localHeader.writeUInt32LE(0x04034b50, 0); // signature
		localHeader.writeUInt16LE(20, 4); // version needed (2.0)
		localHeader.writeUInt16LE(0x0800, 6); // general purpose flags (bit 11 = UTF-8)
		localHeader.writeUInt16LE(compressionMethod, 8);
		localHeader.writeUInt16LE(0, 10); // mod time
		localHeader.writeUInt16LE(0, 12); // mod date
		localHeader.writeUInt32LE(crc, 14);
		localHeader.writeUInt32LE(compressedSize, 18);
		localHeader.writeUInt32LE(uncompressedSize, 22);
		localHeader.writeUInt16LE(nameBuffer.length, 26);
		localHeader.writeUInt16LE(0, 28); // extra field length
		nameBuffer.copy(localHeader, 30);

		localHeaders.push(localHeader, compressedData);

		// Central directory header (46 bytes + name length)
		const centralHeader = Buffer.alloc(46 + nameBuffer.length);
		centralHeader.writeUInt32LE(0x02014b50, 0); // signature
		centralHeader.writeUInt16LE(20, 4); // version made by
		centralHeader.writeUInt16LE(20, 6); // version needed
		centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
		centralHeader.writeUInt16LE(compressionMethod, 10);
		centralHeader.writeUInt16LE(0, 12); // mod time
		centralHeader.writeUInt16LE(0, 14); // mod date
		centralHeader.writeUInt32LE(crc, 16);
		centralHeader.writeUInt32LE(compressedSize, 20);
		centralHeader.writeUInt32LE(uncompressedSize, 24);
		centralHeader.writeUInt16LE(nameBuffer.length, 28);
		centralHeader.writeUInt16LE(0, 30); // extra field length
		centralHeader.writeUInt16LE(0, 32); // comment length
		centralHeader.writeUInt16LE(0, 34); // disk number start
		centralHeader.writeUInt16LE(0, 36); // internal file attributes
		centralHeader.writeUInt32LE(0, 38); // external file attributes
		centralHeader.writeUInt32LE(offset, 42); // relative offset of local header
		nameBuffer.copy(centralHeader, 46);

		centralHeaders.push(centralHeader);

		offset += localHeader.length + compressedData.length;
	}

	const centralDirOffset = offset;
	const centralDirBuffer = Buffer.concat(centralHeaders);
	const centralDirSize = centralDirBuffer.length;

	// End of central directory record (22 bytes)
	const eocd = Buffer.alloc(22);
	eocd.writeUInt32LE(0x06054b50, 0); // signature
	eocd.writeUInt16LE(0, 4); // disk number
	eocd.writeUInt16LE(0, 6); // start disk
	eocd.writeUInt16LE(entries.length, 8); // records on disk
	eocd.writeUInt16LE(entries.length, 10); // total records
	eocd.writeUInt32LE(centralDirSize, 12);
	eocd.writeUInt32LE(centralDirOffset, 16);
	eocd.writeUInt16LE(0, 20); // comment length

	return Buffer.concat([...localHeaders, centralDirBuffer, eocd]);
}

function buildDynamicBundleEntries(
	state: TenantOtaState,
	effectiveVersion: string,
	customContent?: string,
): Array<{ name: string; data: Buffer }> {
	const manifestContent = JSON.stringify(
		{
			app: "dente-crm",
			version: effectiveVersion,
			minSupportedVersion: state.config.minSupportedVersion,
			builtAt: state.config.publishedAt,
			customPayload: customContent ?? "production-web-bundle",
		},
		null,
		2,
	);

	const htmlContent = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>DENTE CRM — OTA Bundle v${effectiveVersion}</title>
</head>
<body>
	<div id="dente-bundle-root" data-version="${effectiveVersion}">
		<h1>DENTE Dynamic Shell v${effectiveVersion}</h1>
	</div>
</body>
</html>`;

	return [
		{
			name: "manifest.json",
			data: Buffer.from(manifestContent, "utf-8"),
		},
		{
			name: "index.html",
			data: Buffer.from(htmlContent, "utf-8"),
		},
		{
			name: "assets/version.txt",
			data: Buffer.from(`DENTE_VERSION=${effectiveVersion}`, "utf-8"),
		},
	];
}

/**
 * Потоковое получение или генерация бандла OTA (без загрузки кастомных ZIP с диска в RAM).
 */
export async function getOrCreateOtaBundleAsync(
	version?: string,
	customContent?: string,
	orgId: string | null = null,
): Promise<CachedBundle> {
	const state = getTenantOtaState(orgId);
	const effectiveVersion = version ?? state.config.version;
	const customPath = state.config.customBundleZipPath;

	if (customPath && !customContent) {
		try {
			const st = await fs.promises.stat(customPath);
			if (
				state.cachedBundle &&
				state.cachedBundle.version === effectiveVersion &&
				state.cachedBundle.filePath === customPath &&
				state.cachedBundle.mtimeMs === st.mtimeMs &&
				state.cachedBundle.sizeBytes === st.size
			) {
				return state.cachedBundle;
			}
			const sha256 = await computeFileSha256Stream(customPath);
			state.cachedBundle = {
				version: effectiveVersion,
				buffer: null,
				filePath: customPath,
				mtimeMs: st.mtimeMs,
				sha256,
				sizeBytes: st.size,
				generatedAt: new Date().toISOString(),
			};
			return state.cachedBundle;
		} catch (err) {
			otaLogger.warn(
				{ err },
				"Failed to stat/hash custom OTA bundle on disk, falling back to yazl generator",
			);
		}
	}

	if (
		state.cachedBundle &&
		state.cachedBundle.version === effectiveVersion &&
		!customContent
	) {
		return state.cachedBundle;
	}

	const entries = buildDynamicBundleEntries(state, effectiveVersion, customContent);
	const zipBuffer = await createZipArchiveAsync(entries);
	const sha256 = crypto.createHash("sha256").update(zipBuffer).digest("hex");

	state.cachedBundle = {
		version: effectiveVersion,
		buffer: zipBuffer,
		sha256,
		sizeBytes: zipBuffer.length,
		generatedAt: new Date().toISOString(),
	};

	return state.cachedBundle;
}

/**
 * Получение или создание детерминированного бандла для синхронных unit-тестов.
 */
export function getOrCreateOtaBundle(
	version?: string,
	customContent?: string,
	orgId: string | null = null,
): CachedBundle {
	const state = getTenantOtaState(orgId);
	const effectiveVersion = version ?? state.config.version;
	if (
		state.cachedBundle &&
		state.cachedBundle.version === effectiveVersion &&
		!customContent
	) {
		return state.cachedBundle;
	}

	const entries = buildDynamicBundleEntries(state, effectiveVersion, customContent);
	const zipBuffer = createZipArchive(entries);
	const sha256 = crypto
		.createHash("sha256")
		.update(zipBuffer)
		.digest("hex");

	state.cachedBundle = {
		version: effectiveVersion,
		buffer: zipBuffer,
		sha256,
		sizeBytes: zipBuffer.length,
		generatedAt: new Date().toISOString(),
	};

	return state.cachedBundle;
}

/**
 * Сброс состояния для тестов.
 */
export function resetOtaRuntimeState(newConfig?: Partial<OtaRuntimeConfig>): void {
	otaStateByOrg.clear();
	const platformState = getTenantOtaState(null);
	if (newConfig) {
		platformState.config = {
			...platformState.config,
			...newConfig,
		};
	}
}

/**
 * Регистрация Fastify-маршрутов OTA обновлений.
 */
export async function registerMobileOtaRoutes(
	app: FastifyInstance,
): Promise<void> {
	/**
	 * GET /api/mobile/version.json — Манифест актуальной версии.
	 */
	app.get(
		"/api/mobile/version.json",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const parsedQuery = mobileOtaVersionQuerySchema.safeParse(
				request.query ?? {},
			);
			if (!parsedQuery.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Некорректные параметры запроса версии OTA.",
					details: parsedQuery.error.format(),
				});
			}

			const requesterOrgId = await resolveOrganizationId(request);
			const state = getTenantOtaState(requesterOrgId);
			const clientVersion = parsedQuery.data.clientVersion;

			const bundle = await getOrCreateOtaBundleAsync(
				state.config.version,
				undefined,
				requesterOrgId,
			);
			const policy = evaluateOtaUpdatePolicy(
				clientVersion,
				state.config.version,
				state.config.minSupportedVersion,
			);

			const responsePayload: MobileOtaVersionResponse = {
				version: state.config.version,
				bundleSha256: bundle.sha256,
				minSupportedVersion: state.config.minSupportedVersion,
				downloadUrl: state.config.downloadUrl,
				releaseNotes: state.config.releaseNotes,
				mandatory: policy.mandatory,
				updateAvailable: policy.updateAvailable,
				isDeprecated: policy.isBlocked,
				publishedAt: state.config.publishedAt,
				bundleSizeBytes: bundle.sizeBytes,
			};

			reply
				.header("Content-Type", "application/json; charset=utf-8")
				.header("Cache-Control", "no-cache, no-store, must-revalidate")
				.header("ETag", `"${bundle.sha256}"`)
				.header("X-Bundle-SHA256", bundle.sha256);

			return responsePayload;
		},
	);

	/**
	 * GET /api/mobile/bundle.zip — Потоковая раздача упакованного бандла.
	 */
	app.get(
		"/api/mobile/bundle.zip",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const requesterOrgId = await resolveOrganizationId(request);
			const state = getTenantOtaState(requesterOrgId);
			const bundle = await getOrCreateOtaBundleAsync(
				state.config.version,
				undefined,
				requesterOrgId,
			);

			const clientEtag = request.headers["if-none-match"];
			if (
				clientEtag &&
				(clientEtag === bundle.sha256 ||
					clientEtag === `"${bundle.sha256}"`)
			) {
				reply.status(304).send();
				return;
			}

			reply
				.status(200)
				.header("Content-Type", "application/zip")
				.header(
					"Content-Disposition",
					`attachment; filename="dente-bundle-v${bundle.version}.zip"`,
				)
				.header("Content-Length", bundle.sizeBytes)
				.header("X-Bundle-SHA256", bundle.sha256)
				.header("ETag", `"${bundle.sha256}"`)
				.header("Cache-Control", "public, max-age=300, must-revalidate");

			if (bundle.filePath) {
				return reply.send(fs.createReadStream(bundle.filePath));
			}
			if (bundle.buffer) {
				return reply.send(bundle.buffer);
			}
			return reply.send(
				createZipStream(buildDynamicBundleEntries(state, bundle.version)),
			);
		},
	);

	/**
	 * POST /api/mobile/publish — Публикация новой версии (для CI/CD и стендов).
	 */
	app.post(
		"/api/mobile/publish",
		async (request: FastifyRequest, reply: FastifyReply) => {
			const accessGranted = await requireSuperadmin(
				request,
				reply,
				"ota_publish",
			);
			if (!accessGranted) return;

			const requesterOrgId = await resolveOrganizationId(request);
			const parsedBody = mobileOtaPublishBodySchema.safeParse(
				request.body ?? {},
			);
			if (!parsedBody.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Поле version обязательно для публикации",
				});
			}

			const body = parsedBody.data;
			const state = getTenantOtaState(requesterOrgId);
			state.config.version = body.version;
			if (body.minSupportedVersion) {
				state.config.minSupportedVersion = body.minSupportedVersion;
			}
			if (body.releaseNotes) {
				state.config.releaseNotes = body.releaseNotes;
			}
			state.config.publishedAt = new Date().toISOString();

			// Сбрасываем кэш и генерируем новый бандл строго для текущего тенанта/платформы
			state.cachedBundle = null;
			const newBundle = await getOrCreateOtaBundleAsync(
				state.config.version,
				body.customContent,
				requesterOrgId,
			);

			otaLogger.info(
				{
					organizationId: requesterOrgId ?? "platform",
					version: state.config.version,
					bundleSha256: newBundle.sha256,
				},
				"Published mobile OTA bundle",
			);

			return reply.status(200).send({
				success: true,
				version: state.config.version,
				minSupportedVersion: state.config.minSupportedVersion,
				bundleSha256: newBundle.sha256,
				bundleSizeBytes: newBundle.sizeBytes,
				publishedAt: state.config.publishedAt,
			});
		},
	);

	/**
	 * GET /api/mobile/health — Проверка статуса OTA подсистемы.
	 */
	app.get("/api/mobile/health", async (request: FastifyRequest) => {
		const requesterOrgId = await resolveOrganizationId(request);
		const state = getTenantOtaState(requesterOrgId);
		const bundle = await getOrCreateOtaBundleAsync(
			state.config.version,
			undefined,
			requesterOrgId,
		);
		return {
			status: "healthy",
			otaVersion: state.config.version,
			bundleSha256: bundle.sha256,
			bundleSize: bundle.sizeBytes,
			time: new Date().toISOString(),
		};
	});
}
