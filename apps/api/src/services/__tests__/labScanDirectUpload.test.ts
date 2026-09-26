import assert from "node:assert";
import { describe, test } from "node:test";
import {
	ALLOWED_SCAN_EXTENSIONS,
	createAwsSigV4PresignedUrl,
	generateScanStorageKey,
	getLabScanDownloadPresignedUrl,
	getLabScanUploadPresignedUrl,
	MAX_SCAN_FILE_SIZE_BYTES,
	type S3StorageConfig,
	validateScanFileMeta,
} from "../labScanDirectUpload.js";

describe("labScanDirectUpload (3D STL/PLY Scans & S3 Presigned URLs)", () => {
	const sampleSelectelConfig: S3StorageConfig = {
		endpoint: "https://s3.ru-1.storage.selcloud.ru",
		region: "ru-1",
		bucket: "clinic-3d-scans",
		accessKeyId: "selectel_key_12345",
		secretAccessKey: "selectel_secret_67890abcdef",
		forcePathStyle: true,
	};

	const sampleYandexConfig: S3StorageConfig = {
		endpoint: "https://storage.yandexcloud.net",
		region: "ru-central1",
		bucket: "dente-scans-yc",
		accessKeyId: "yc_key_id_abc",
		secretAccessKey: "yc_secret_xyz_987654",
		forcePathStyle: true,
	};

	describe("validateScanFileMeta", () => {
		test("успешно валидирует корректные стоматологические форматы (STL, PLY, OBJ, DCM, ZIP)", () => {
			for (const ext of ALLOWED_SCAN_EXTENSIONS) {
				const result = validateScanFileMeta(`jaw_upper_scan.${ext}`, 50 * 1024 * 1024);
				assert.strictEqual(result.isValid, true);
				assert.strictEqual(result.extension, ext);
				assert.strictEqual(typeof result.mimeType, "string");
			}
		});

		test("отклоняет неподдерживаемые и потенциально опасные расширения", () => {
			const invalid = ["malware.exe", "script.sh", "page.php", "document.pdf", "image.png"];
			for (const name of invalid) {
				const result = validateScanFileMeta(name, 1024);
				assert.strictEqual(result.isValid, false);
				assert.ok(result.error?.includes("Недопустимый формат файла"));
			}
		});

		test("отклоняет файлы, превышающие лимит 500 МБ", () => {
			const oversizedBytes = MAX_SCAN_FILE_SIZE_BYTES + 1024;
			const result = validateScanFileMeta("giant_jaw_scan.stl", oversizedBytes);
			assert.strictEqual(result.isValid, false);
			assert.ok(result.error?.includes("превышает допустимый лимит 500 МБ"));
		});

		test("санитизирует опасные символы и попытки Path Traversal", () => {
			const result = validateScanFileMeta("../../../etc/passwd/jaw_scan.stl");
			assert.strictEqual(result.isValid, true);
			assert.strictEqual(result.sanitizedFileName.includes(".."), false);
			assert.strictEqual(result.sanitizedFileName.includes("/"), false);
		});
	});

	describe("generateScanStorageKey", () => {
		test("генерирует безопасный изолированный ключ с префиксами организации и наряда", () => {
			const orgId = "org-uuid-111";
			const orderId = "order-uuid-222";
			const fileName = "upper_jaw_medit_i700.stl";

			const key = generateScanStorageKey(orgId, orderId, fileName);

			assert.ok(key.startsWith("org_org-uuid-111/lab_orders/order-uuid-222/"));
			assert.ok(key.endsWith("_upper_jaw_medit_i700.stl"));
		});
	});

	describe("createAwsSigV4PresignedUrl", () => {
		test("генерирует канонический предподписанный URL с подписью AWS4-HMAC-SHA256", () => {
			const fixedDate = new Date("2026-09-26T12:00:00.000Z");

			const urlStr = createAwsSigV4PresignedUrl({
				method: "PUT",
				config: sampleSelectelConfig,
				storageKey: "org_1/lab_orders/2/scan.stl",
				expiresInSeconds: 3600,
				dateOverride: fixedDate,
			});

			const parsed = new URL(urlStr);
			assert.strictEqual(parsed.origin, "https://s3.ru-1.storage.selcloud.ru");
			assert.strictEqual(parsed.pathname, "/clinic-3d-scans/org_1/lab_orders/2/scan.stl");

			// Проверяем обязательные параметры AWS SigV4
			assert.strictEqual(parsed.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
			assert.strictEqual(
				parsed.searchParams.get("X-Amz-Credential"),
				"selectel_key_12345/20260926/ru-1/s3/aws4_request",
			);
			assert.strictEqual(parsed.searchParams.get("X-Amz-Date"), "20260926T120000Z");
			assert.strictEqual(parsed.searchParams.get("X-Amz-Expires"), "3600");
			assert.strictEqual(parsed.searchParams.get("X-Amz-SignedHeaders"), "host");

			const signature = parsed.searchParams.get("X-Amz-Signature");
			assert.ok(signature && signature.length === 64, "Подпись должна быть 64 hex-символа");
		});

		test("обеспечивает детерминированность подписи для одинаковых входных данных", () => {
			const fixedDate = new Date("2026-09-26T14:30:00.000Z");

			const url1 = createAwsSigV4PresignedUrl({
				method: "GET",
				config: sampleYandexConfig,
				storageKey: "test/order/scan.ply",
				expiresInSeconds: 1800,
				dateOverride: fixedDate,
			});

			const url2 = createAwsSigV4PresignedUrl({
				method: "GET",
				config: sampleYandexConfig,
				storageKey: "test/order/scan.ply",
				expiresInSeconds: 1800,
				dateOverride: fixedDate,
			});

			assert.strictEqual(url1, url2);
		});

		test("подписывает Content-Type в заголовках (X-Amz-SignedHeaders = content-type;host) для защиты от подмены .exe", () => {
			const fixedDate = new Date("2026-09-26T12:00:00.000Z");

			const urlStr = createAwsSigV4PresignedUrl({
				method: "PUT",
				config: sampleSelectelConfig,
				storageKey: "org_1/lab_orders/2/scan.stl",
				expiresInSeconds: 3600,
				contentType: "model/stl",
				dateOverride: fixedDate,
			});

			const parsed = new URL(urlStr);
			assert.strictEqual(parsed.searchParams.get("X-Amz-SignedHeaders"), "content-type;host");

			const signature = parsed.searchParams.get("X-Amz-Signature");
			assert.ok(signature && signature.length === 64);

			// Подпись для PUT с contentType ДОЛЖНА отличаться от подписи без contentType
			const urlStrNoType = createAwsSigV4PresignedUrl({
				method: "PUT",
				config: sampleSelectelConfig,
				storageKey: "org_1/lab_orders/2/scan.stl",
				expiresInSeconds: 3600,
				dateOverride: fixedDate,
			});
			const parsedNoType = new URL(urlStrNoType);
			assert.notStrictEqual(signature, parsedNoType.searchParams.get("X-Amz-Signature"));
		});

		test("калибрует время X-Amz-Date при смещении часов (CR2032 BIOS Clock Skew) через clockSkewOffsetMs", () => {
			const oneDayMs = 86400000;
			const baseDate = new Date("2026-09-26T12:00:00.000Z");

			const urlWithSkew = createAwsSigV4PresignedUrl({
				method: "PUT",
				config: sampleSelectelConfig,
				storageKey: "test/skew/scan.stl",
				expiresInSeconds: 3600,
				dateOverride: new Date(baseDate.getTime() + oneDayMs),
			});

			const parsed = new URL(urlWithSkew);
			assert.strictEqual(parsed.searchParams.get("X-Amz-Date"), "20260927T120000Z");
			assert.ok(parsed.searchParams.get("X-Amz-Credential")?.includes("/20260927/"));
		});
	});

	describe("getLabScanUploadPresignedUrl & getLabScanDownloadPresignedUrl", () => {
		test("генерирует пару URL (upload PUT и download GET) с S3 config override", () => {
			const result = getLabScanUploadPresignedUrl({
				organizationId: "org-spb",
				labOrderId: "order-999",
				fileName: "crown_prep_fdi_16.stl",
				fileSizeBytes: 45 * 1024 * 1024,
				configOverride: sampleSelectelConfig,
			});

			assert.strictEqual(result.provider, "s3_direct");
			assert.ok(result.uploadUrl.startsWith("https://s3.ru-1.storage.selcloud.ru/clinic-3d-scans/"));
			assert.ok(result.uploadUrl.includes("X-Amz-Signature="));
			// Content-Type подписан в uploadUrl:
			const uploadParsed = new URL(result.uploadUrl);
			assert.strictEqual(uploadParsed.searchParams.get("X-Amz-SignedHeaders"), "content-type;host");

			assert.ok(result.downloadUrl.startsWith("https://s3.ru-1.storage.selcloud.ru/clinic-3d-scans/"));
			assert.strictEqual(result.headersToInclude["content-type"], "model/stl");
		});

		test("учитывает clockSkewOffsetMs при расчете времени жизни ссылки и даты подписи", () => {
			const skewMs = 7200000; // 2 часа вперед
			const uploadRes = getLabScanUploadPresignedUrl({
				organizationId: "org-spb",
				labOrderId: "order-skew",
				fileName: "scan_jaw.ply",
				configOverride: sampleSelectelConfig,
				clockSkewOffsetMs: skewMs,
			});

			const nowMs = Date.now();
			const expiresAtMs = new Date(uploadRes.expiresAt).getTime();
			// expiresAt = now + skewMs + 3600*1000
			const expectedDiff = skewMs + 3600 * 1000;
			assert.ok(Math.abs(expiresAtMs - nowMs - expectedDiff) < 5000);
		});

		test("работает в mock-fallback режиме при отсутствии переменных S3 в окружении", () => {
			const uploadRes = getLabScanUploadPresignedUrl({
				organizationId: "org-dev",
				labOrderId: "order-local",
				fileName: "scan_fallback.stl",
				// configOverride не передан -> fallback
			});

			assert.strictEqual(uploadRes.provider, "mock_fallback");
			assert.ok(uploadRes.uploadUrl.includes("/api/portal/mock-storage/upload"));
			assert.ok(uploadRes.downloadUrl.includes("/api/portal/mock-storage/download"));

			const downloadRes = getLabScanDownloadPresignedUrl({
				storageKey: uploadRes.storageKey,
			});
			assert.strictEqual(downloadRes.provider, "mock_fallback");
			assert.ok(downloadRes.downloadUrl.includes("/api/portal/mock-storage/download"));
		});
	});
});
