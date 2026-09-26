import crypto from "node:crypto";

/**
 * labScanDirectUpload.ts — Гибридная передача тяжелых 3D сканов челюстей (STL / PLY / OBJ).
 *
 * ПРОБЛЕМА СЕТИ КЛИНИКИ:
 * У большинства клиник нет статического белого IP (серый CGNAT провайдера), а исходящий
 * канал составляет 10–30 Мбит/с (или 4G резерв). Тяжелые 3D STL/PLY сканы челюстей
 * (100–300 МБ) при передаче напрямую через туннель клиники намертво парализуют канал,
 * вызывая таймауты в работе касс 54-ФЗ, телефонии и расписания.
 *
 * РЕШЕНИЕ (ГИБРИДНАЯ АРХИТЕКТУРА S3):
 * 1. Локальный сервер клиники передает через туннель релея только легковесные JSON-метаданные
 *    (номер наряда, формула зубов, цвета, комментарии — < 5 КБ).
 * 2. Тяжелые бинарные 3D сканы загружаются и скачиваются НАПРЯМУЮ в/из российского объектного
 *    хранилища S3 (Selectel / Yandex Cloud / VK Cloud) по предподписанным Presigned URLs.
 * 3. Зубной техник скачивает 3D скан челюсти из S3 CDN на скорости 100+ Мбит/с. Исходящий канал
 *    клиники имеет нулевую (0 байт) нагрузку при скачивании сканов техником!
 */

export interface S3StorageConfig {
	readonly endpoint: string; // e.g. "https://storage.yandexcloud.net" или "https://s3.ru-1.storage.selcloud.ru"
	readonly region: string; // e.g. "ru-central1" или "ru-1"
	readonly bucket: string; // e.g. "dente-lab-scans"
	readonly accessKeyId: string;
	readonly secretAccessKey: string;
	readonly forcePathStyle?: boolean | undefined; // default true для российских провайдеров
	readonly publicCdnUrl?: string | undefined; // опциональный публичный CDN домен
}

export interface ScanValidationResult {
	readonly isValid: boolean;
	readonly extension: string;
	readonly mimeType: string;
	readonly sanitizedFileName: string;
	readonly error?: string;
}

export interface PresignedUploadResult {
	readonly uploadUrl: string;
	readonly storageKey: string;
	readonly downloadUrl: string;
	readonly expiresAt: string;
	readonly expiresInSeconds: number;
	readonly provider: "s3_direct" | "mock_fallback";
	readonly headersToInclude: Record<string, string>;
}

export interface PresignedDownloadResult {
	readonly downloadUrl: string;
	readonly storageKey: string;
	readonly expiresAt: string;
	readonly expiresInSeconds: number;
	readonly provider: "s3_direct" | "mock_fallback";
}

/** Максимальный размер 3D скана (500 МБ) для предотвращения атак переполнения хранилища */
export const MAX_SCAN_FILE_SIZE_BYTES = 500 * 1024 * 1024;

/** Разрешенные расширения стоматологических 3D сканов */
export const ALLOWED_SCAN_EXTENSIONS = new Set(["stl", "ply", "obj", "dcm", "zip"]);

export const SCAN_MIME_TYPES: Record<string, string> = {
	stl: "model/stl",
	ply: "model/ply",
	obj: "model/obj",
	dcm: "application/dicom",
	zip: "application/zip",
};

/**
 * Чтение настроек S3 из переменных окружения.
 */
export function getS3ConfigFromEnv(): S3StorageConfig | null {
	const endpoint = process.env.S3_STORAGE_ENDPOINT || process.env.S3_ENDPOINT;
	const accessKeyId = process.env.S3_STORAGE_ACCESS_KEY || process.env.S3_ACCESS_KEY_ID;
	const secretAccessKey = process.env.S3_STORAGE_SECRET_KEY || process.env.S3_SECRET_ACCESS_KEY;
	const bucket = process.env.S3_STORAGE_BUCKET || process.env.S3_BUCKET_NAME;
	const region = process.env.S3_STORAGE_REGION || process.env.S3_REGION || "ru-central1";
	const publicCdnUrl = process.env.S3_STORAGE_PUBLIC_CDN_URL;

	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		return null;
	}

	return {
		endpoint: endpoint.replace(/\/+$/, ""),
		region,
		bucket,
		accessKeyId,
		secretAccessKey,
		forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
		publicCdnUrl: publicCdnUrl ? publicCdnUrl.replace(/\/+$/, "") : undefined,
	};
}

export function isS3DirectUploadConfigured(): boolean {
	return getS3ConfigFromEnv() !== null;
}

/**
 * Валидация файла скана: расширение, допустимый размер, санитизация имени.
 */
export function validateScanFileMeta(
	fileName: string,
	fileSizeBytes?: number,
): ScanValidationResult {
	if (!fileName || typeof fileName !== "string" || !fileName.trim()) {
		return {
			isValid: false,
			extension: "",
			mimeType: "application/octet-stream",
			sanitizedFileName: "",
			error: "Имя файла скана не может быть пустым.",
		};
	}

	const trimmed = fileName.trim();
	const sanitized = trimmed
		.replace(/[/\\?%*:|"<>]/g, "_")
		.replace(/\.\.+/g, ".")
		.slice(-200);

	const dotIndex = sanitized.lastIndexOf(".");
	if (dotIndex === -1 || dotIndex === sanitized.length - 1) {
		return {
			isValid: false,
			extension: "",
			mimeType: "application/octet-stream",
			sanitizedFileName: sanitized,
			error: "Файл должен иметь расширение 3D формата (.stl, .ply, .obj, .dcm, .zip).",
		};
	}

	const ext = sanitized.slice(dotIndex + 1).toLowerCase();
	if (!ALLOWED_SCAN_EXTENSIONS.has(ext)) {
		return {
			isValid: false,
			extension: ext,
			mimeType: "application/octet-stream",
			sanitizedFileName: sanitized,
			error: `Недопустимый формат файла «.${ext}». Разрешены только стоматологические 3D сканы: STL, PLY, OBJ, DCM, ZIP.`,
		};
	}

	if (fileSizeBytes !== undefined && fileSizeBytes !== null) {
		if (fileSizeBytes <= 0) {
			return {
				isValid: false,
				extension: ext,
				mimeType: SCAN_MIME_TYPES[ext] || "application/octet-stream",
				sanitizedFileName: sanitized,
				error: "Размер файла не может быть нулевым или отрицательным.",
			};
		}
		if (fileSizeBytes > MAX_SCAN_FILE_SIZE_BYTES) {
			const sizeMb = Math.round(fileSizeBytes / (1024 * 1024));
			return {
				isValid: false,
				extension: ext,
				mimeType: SCAN_MIME_TYPES[ext] || "application/octet-stream",
				sanitizedFileName: sanitized,
				error: `Размер файла (${sizeMb} МБ) превышает допустимый лимит 500 МБ.`,
			};
		}
	}

	return {
		isValid: true,
		extension: ext,
		mimeType: SCAN_MIME_TYPES[ext] || "application/octet-stream",
		sanitizedFileName: sanitized,
	};
}

/**
 * Генерация безопасного пути в бакете S3.
 */
export function generateScanStorageKey(
	organizationId: string,
	labOrderId: string,
	fileName: string,
): string {
	const validation = validateScanFileMeta(fileName);
	const safeName = validation.sanitizedFileName || "scan.stl";
	const timestamp = Date.now();
	const randomSuffix = crypto.randomBytes(4).toString("hex");
	const orgClean = organizationId.replace(/[^a-zA-Z0-9_-]/g, "");
	const orderClean = labOrderId.replace(/[^a-zA-Z0-9_-]/g, "");

	return `org_${orgClean}/lab_orders/${orderClean}/${timestamp}_${randomSuffix}_${safeName}`;
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
	return crypto.createHmac("sha256", key).update(data, "utf8").digest();
}

function sha256Hex(data: string): string {
	return crypto.createHash("sha256").update(data, "utf8").digest("hex");
}

/**
 * Каноническая генерация AWS SigV4 Presigned URL без тяжелых зависимостей.
 * Совместимо на 100% с Selectel S3, Yandex Cloud Object Storage, VK Cloud, MinIO и AWS S3.
 */
export function createAwsSigV4PresignedUrl(params: {
	readonly method: "GET" | "PUT";
	readonly config: S3StorageConfig;
	readonly storageKey: string;
	readonly expiresInSeconds?: number;
	readonly contentType?: string;
	readonly dateOverride?: Date;
}): string {
	const { method, config, storageKey } = params;
	const expiresIn = Math.min(Math.max(params.expiresInSeconds ?? 3600, 60), 604800); // 1 мин — 7 дней
	const now = params.dateOverride ?? new Date();

	const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, ""); // e.g. "20260926T163000Z"
	const dateStamp = amzDate.slice(0, 8); // e.g. "20260926"

	const endpointUrl = new URL(config.endpoint);
	const host = config.forcePathStyle
		? endpointUrl.host
		: `${config.bucket}.${endpointUrl.host}`;

	const canonicalUri = config.forcePathStyle
		? `/${config.bucket}/${storageKey.split("/").map(encodeURIComponent).join("/")}`
		: `/${storageKey.split("/").map(encodeURIComponent).join("/")}`;

	const credential = `${config.accessKeyId}/${dateStamp}/${config.region}/s3/aws4_request`;

	const queryParams: Record<string, string> = {
		"X-Amz-Algorithm": "AWS4-HMAC-SHA256",
		"X-Amz-Credential": credential,
		"X-Amz-Date": amzDate,
		"X-Amz-Expires": String(expiresIn),
		"X-Amz-SignedHeaders": "host",
	};

	// Сортировка параметров в алфавитном порядке
	const sortedKeys = Object.keys(queryParams).sort();
	const canonicalQueryString = sortedKeys
		.map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k] ?? "")}`)
		.join("&");

	// Канонические заголовки
	const canonicalHeaders = `host:${host}\n`;
	const signedHeaders = "host";
	const payloadHash = "UNSIGNED-PAYLOAD";

	const canonicalRequest = [
		method,
		canonicalUri,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		payloadHash,
	].join("\n");

	const canonicalRequestHash = sha256Hex(canonicalRequest);

	const stringToSign = [
		"AWS4-HMAC-SHA256",
		amzDate,
		`${dateStamp}/${config.region}/s3/aws4_request`,
		canonicalRequestHash,
	].join("\n");

	// Расчет подписи SigV4
	const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
	const kRegion = hmacSha256(kDate, config.region);
	const kService = hmacSha256(kRegion, "s3");
	const kSigning = hmacSha256(kService, "aws4_request");
	const signature = hmacSha256(kSigning, stringToSign).toString("hex");

	const finalQuery = `${canonicalQueryString}&X-Amz-Signature=${signature}`;
	const protocol = endpointUrl.protocol;

	return `${protocol}//${host}${canonicalUri}?${finalQuery}`;
}

/**
 * Получение Presigned URL на прямую загрузку 3D скана в S3 (PUT).
 */
export function getLabScanUploadPresignedUrl(params: {
	readonly organizationId: string;
	readonly labOrderId: string;
	readonly fileName: string;
	readonly fileSizeBytes?: number;
	readonly expiresInSeconds?: number;
	readonly configOverride?: S3StorageConfig;
}): PresignedUploadResult {
	const validation = validateScanFileMeta(params.fileName, params.fileSizeBytes);
	if (!validation.isValid) {
		throw new Error(validation.error || "Некорректный файл 3D скана");
	}

	const storageKey = generateScanStorageKey(
		params.organizationId,
		params.labOrderId,
		params.fileName,
	);
	const expiresInSeconds = params.expiresInSeconds ?? 3600;
	const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
	const config = params.configOverride || getS3ConfigFromEnv();

	if (!config) {
		// Mock-fallback режим для локальной разработки или при отсутствии ключей облака
		const mockUploadUrl = `/api/portal/mock-storage/upload?key=${encodeURIComponent(storageKey)}`;
		const mockDownloadUrl = `/api/portal/mock-storage/download?key=${encodeURIComponent(storageKey)}`;
		return {
			uploadUrl: mockUploadUrl,
			storageKey,
			downloadUrl: mockDownloadUrl,
			expiresAt,
			expiresInSeconds,
			provider: "mock_fallback",
			headersToInclude: {
				"content-type": validation.mimeType,
			},
		};
	}

	const uploadUrl = createAwsSigV4PresignedUrl({
		method: "PUT",
		config,
		storageKey,
		expiresInSeconds,
		contentType: validation.mimeType,
	});

	const downloadUrl = createAwsSigV4PresignedUrl({
		method: "GET",
		config,
		storageKey,
		expiresInSeconds: 86400 * 7, // 7 дней по умолчанию для ссылки скачивания технику
	});

	return {
		uploadUrl,
		storageKey,
		downloadUrl,
		expiresAt,
		expiresInSeconds,
		provider: "s3_direct",
		headersToInclude: {
			"content-type": validation.mimeType,
		},
	};
}

/**
 * Получение Presigned URL на прямое скачивание 3D скана из S3 техником (GET).
 */
export function getLabScanDownloadPresignedUrl(params: {
	readonly storageKey: string;
	readonly expiresInSeconds?: number;
	readonly configOverride?: S3StorageConfig;
}): PresignedDownloadResult {
	if (!params.storageKey || !params.storageKey.trim()) {
		throw new Error("storageKey обязателен для генерации ссылки скачивания");
	}

	const expiresInSeconds = params.expiresInSeconds ?? 86400 * 3; // 3 дня
	const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
	const config = params.configOverride || getS3ConfigFromEnv();

	if (!config) {
		return {
			downloadUrl: `/api/portal/mock-storage/download?key=${encodeURIComponent(params.storageKey)}`,
			storageKey: params.storageKey,
			expiresAt,
			expiresInSeconds,
			provider: "mock_fallback",
		};
	}

	const downloadUrl = createAwsSigV4PresignedUrl({
		method: "GET",
		config,
		storageKey: params.storageKey,
		expiresInSeconds,
	});

	return {
		downloadUrl,
		storageKey: params.storageKey,
		expiresAt,
		expiresInSeconds,
		provider: "s3_direct",
	};
}
