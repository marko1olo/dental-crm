/**
 * mobileOta.test.ts — Автоматизированные тесты для Over-The-Air (OTA) обновлений и динамической оболочки.
 *
 * ТЕСТОВЫЕ СЦЕНАРИИ:
 * 1. GET /api/mobile/version.json:
 *    - Проверка схемы ответа манифеста версии.
 *    - Проверка блокировки устаревших клиентов (minSupportedVersion).
 *    - Проверка статуса актуального клиента (updateAvailable: false).
 * 2. GET /api/mobile/bundle.zip:
 *    - Проверка раздачи бинарного ZIP бандла.
 *    - Проверка соответствия SHA-256 хеша содержимого бандла значению в манифесте.
 *    - Проверка HTTP 304 Not Modified при совпадении If-None-Match / ETag.
 * 3. POST /api/mobile/publish:
 *    - Динамическое обновление версии и пересчет хешей на лету.
 * 4. Модульные тесты Semver и политик обновлений.
 */

import { strict as assert } from "node:assert";
import crypto from "node:crypto";
import { beforeEach, describe, it } from "node:test";
import {
	compareSemver,
	evaluateOtaUpdatePolicy,
	isSemverSatisfied,
	isSemverValid,
	isUpdateAvailable,
	mobileOtaVersionResponseSchema,
	parseSemver,
} from "@dental/shared";
import Fastify from "fastify";
import {
	calculateCrc32,
	createZipArchive,
	getOrCreateOtaBundle,
	registerMobileOtaRoutes,
	resetOtaRuntimeState,
} from "./mobileOta.js";

async function buildTestApp() {
	process.env.NODE_ENV = "test";
	const app = Fastify();
	await app.register(registerMobileOtaRoutes);
	await app.ready();
	return app;
}

describe("Over-The-Air (OTA) Updates & Dynamic Shell API", () => {
	beforeEach(() => {
		resetOtaRuntimeState({
			version: "2.4.0",
			minSupportedVersion: "2.0.0",
			releaseNotes: "Плановое обновление DENTE CRM",
			downloadUrl: "/api/mobile/bundle.zip",
		});
	});

	describe("GET /api/mobile/version.json", () => {
		it("возвращает валидный манифест версии со строгим соответствием Zod-схеме", async () => {
			const app = await buildTestApp();

			const res = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json",
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();

			// Проверка Zod-схемы
			const parsed = mobileOtaVersionResponseSchema.safeParse(json);
			assert.equal(
				parsed.success,
				true,
				`Ответ не соответствует Zod-схеме: ${JSON.stringify(parsed)}`,
			);

			assert.equal(json.version, "2.4.0");
			assert.equal(json.minSupportedVersion, "2.0.0");
			assert.equal(json.downloadUrl, "/api/mobile/bundle.zip");
			assert.equal(typeof json.bundleSha256, "string");
			assert.equal(json.bundleSha256.length, 64);
			assert.equal(typeof json.bundleSizeBytes, "number");
			assert.ok(json.bundleSizeBytes > 0);

			// Проверка заголовков кэширования и целостности
			assert.equal(
				res.headers["content-type"],
				"application/json; charset=utf-8",
			);
			assert.equal(res.headers["x-bundle-sha256"], json.bundleSha256);
			assert.equal(res.headers.etag, `"${json.bundleSha256}"`);
		});

		it("блокирует устаревшие клиенты ниже minSupportedVersion (mandatory: true)", async () => {
			const app = await buildTestApp();

			// Клиент с версией 1.8.0 при minSupportedVersion 2.0.0
			const res = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json?clientVersion=1.8.0&platform=android",
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();

			assert.equal(json.mandatory, true);
			assert.equal(json.isDeprecated, true);
			assert.equal(json.updateAvailable, true);
		});

		it("определяет актуального клиента без предложения обновления (updateAvailable: false)", async () => {
			const app = await buildTestApp();

			// Клиент с актуальной версией 2.4.0
			const res = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json?clientVersion=2.4.0&platform=web",
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();

			assert.equal(json.mandatory, false);
			assert.equal(json.isDeprecated, false);
			assert.equal(json.updateAvailable, false);
		});

		it("предлагает опциональное обновление для промежуточной поддерживаемой версии", async () => {
			const app = await buildTestApp();

			// Клиент с версией 2.1.0 (выше minSupported 2.0.0, но ниже latest 2.4.0)
			const res = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json?clientVersion=2.1.0&platform=ios",
			});

			assert.equal(res.statusCode, 200);
			const json = res.json();

			assert.equal(json.mandatory, false);
			assert.equal(json.isDeprecated, false);
			assert.equal(json.updateAvailable, true);
		});
	});

	describe("GET /api/mobile/bundle.zip & SHA-256 Integrity Protection", () => {
		it("отдает корректный бинарный ZIP архив с проверенным SHA-256 хешем", async () => {
			const app = await buildTestApp();

			// 1. Получаем манифест
			const versionRes = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json",
			});
			const versionJson = versionRes.json();

			// 2. Скачиваем бандл
			const bundleRes = await app.inject({
				method: "GET",
				url: "/api/mobile/bundle.zip",
			});

			assert.equal(bundleRes.statusCode, 200);
			assert.equal(bundleRes.headers["content-type"], "application/zip");
			assert.equal(
				bundleRes.headers["content-disposition"],
				'attachment; filename="dente-bundle-v2.4.0.zip"',
			);
			assert.equal(
				bundleRes.headers["x-bundle-sha256"],
				versionJson.bundleSha256,
			);

			const rawBuffer = bundleRes.rawPayload;
			assert.ok(rawBuffer.length > 0);

			// Проверка сигнатуры ZIP (PK\x03\x04 = 0x04034b50)
			assert.equal(rawBuffer[0], 0x50); // 'P'
			assert.equal(rawBuffer[1], 0x4b); // 'K'
			assert.equal(rawBuffer[2], 0x03);
			assert.equal(rawBuffer[3], 0x04);

			// 3. Вычисляем фактический SHA-256 хеш скачанного буфера
			const actualSha256 = crypto
				.createHash("sha256")
				.update(rawBuffer)
				.digest("hex");

			assert.equal(
				actualSha256,
				versionJson.bundleSha256,
				"SHA-256 хеш содержимого бандла обязан в точности совпадать с манифестом version.json",
			);
		});

		it("возвращает 304 Not Modified при передаче актуального ETag в If-None-Match", async () => {
			const app = await buildTestApp();
			const bundle = getOrCreateOtaBundle("2.4.0");

			const res = await app.inject({
				method: "GET",
				url: "/api/mobile/bundle.zip",
				headers: {
					"if-none-match": `"${bundle.sha256}"`,
				},
			});

			assert.equal(res.statusCode, 304);
			assert.equal(res.body, "");
		});
	});

	describe("POST /api/mobile/publish", () => {
		it("публикует новую версию и пересчитывает манифест и хеши на лету", async () => {
			const app = await buildTestApp();

			const publishRes = await app.inject({
				method: "POST",
				url: "/api/mobile/publish",
				payload: {
					version: "3.0.0",
					minSupportedVersion: "2.5.0",
					releaseNotes: "Релиз 3.0.0 с полной поддержкой 3D PACS",
					customContent: "bundle-v3-payload",
				},
			});

			assert.equal(publishRes.statusCode, 200);
			const publishJson = publishRes.json();
			assert.equal(publishJson.success, true);
			assert.equal(publishJson.version, "3.0.0");
			assert.equal(publishJson.minSupportedVersion, "2.5.0");
			assert.equal(typeof publishJson.bundleSha256, "string");

			// Проверяем, что version.json теперь отдает новую версию
			const checkRes = await app.inject({
				method: "GET",
				url: "/api/mobile/version.json?clientVersion=2.4.0",
			});
			const checkJson = checkRes.json();

			assert.equal(checkJson.version, "3.0.0");
			assert.equal(checkJson.minSupportedVersion, "2.5.0");
			assert.equal(checkJson.bundleSha256, publishJson.bundleSha256);
			// Так как клиент 2.4.0 < minSupported 2.5.0 — обновление обязательно
			assert.equal(checkJson.mandatory, true);
			assert.equal(checkJson.isDeprecated, true);
		});

		it("отклоняет запрос без указания версии", async () => {
			const app = await buildTestApp();

			const res = await app.inject({
				method: "POST",
				url: "/api/mobile/publish",
				payload: {},
			});

			assert.equal(res.statusCode, 400);
			const json = res.json();
			assert.equal(json.error, "ValidationError");
		});
	});

	describe("Semver & Policy Unit Verification", () => {
		it("корректно парсит semver строки", () => {
			const p1 = parseSemver("1.2.3");
			assert.deepEqual(p1, {
				major: 1,
				minor: 2,
				patch: 3,
				prerelease: undefined,
			});

			const p2 = parseSemver("v2.10.4-rc.1");
			assert.deepEqual(p2, {
				major: 2,
				minor: 10,
				patch: 4,
				prerelease: "rc.1",
			});

			assert.equal(parseSemver("invalid"), null);
			assert.equal(parseSemver(""), null);
			assert.equal(parseSemver(null), null);
			assert.equal(isSemverValid("2.4.0"), true);
			assert.equal(isSemverValid("invalid"), false);
		});

		it("корректно сравнивает semver версии", () => {
			assert.equal(compareSemver("1.0.0", "2.0.0"), -1);
			assert.equal(compareSemver("2.0.0", "1.0.0"), 1);
			assert.equal(compareSemver("2.0.0", "2.0.0"), 0);
			assert.equal(compareSemver("2.1.0", "2.0.9"), 1);
			assert.equal(compareSemver("2.0.1", "2.0.2"), -1);
			assert.equal(compareSemver("1.0.0-beta", "1.0.0"), -1);
			assert.equal(compareSemver("1.0.0", "1.0.0-beta"), 1);
		});

		it("корректно вычисляет удовлетворение минимальной версии", () => {
			assert.equal(isSemverSatisfied("2.0.0", "2.0.0"), true);
			assert.equal(isSemverSatisfied("2.1.0", "2.0.0"), true);
			assert.equal(isSemverSatisfied("1.9.9", "2.0.0"), false);
		});

		it("корректно вычисляет доступность обновления", () => {
			assert.equal(isUpdateAvailable("2.3.9", "2.4.0"), true);
			assert.equal(isUpdateAvailable("2.4.0", "2.4.0"), false);
			assert.equal(isUpdateAvailable("2.4.1", "2.4.0"), false);
		});

		it("корректно оценивает политику OTA обновлений", () => {
			const policy1 = evaluateOtaUpdatePolicy("1.0.0", "2.4.0", "2.0.0");
			assert.equal(policy1.isBlocked, true);
			assert.equal(policy1.mandatory, true);
			assert.equal(policy1.updateAvailable, true);

			const policy2 = evaluateOtaUpdatePolicy("2.2.0", "2.4.0", "2.0.0");
			assert.equal(policy2.isBlocked, false);
			assert.equal(policy2.mandatory, false);
			assert.equal(policy2.updateAvailable, true);

			const policy3 = evaluateOtaUpdatePolicy("2.4.0", "2.4.0", "2.0.0");
			assert.equal(policy3.isBlocked, false);
			assert.equal(policy3.mandatory, false);
			assert.equal(policy3.updateAvailable, false);
		});

		it("вычисляет детерминированный CRC-32 и генерирует валидный PKZIP", () => {
			const testData = Buffer.from("Hello DENTE OTA", "utf-8");
			const crc = calculateCrc32(testData);
			assert.equal(typeof crc, "number");
			assert.ok(crc > 0);

			const zip = createZipArchive([
				{ name: "test.txt", data: testData },
			]);
			assert.ok(zip.length > 30);
			assert.equal(zip.readUInt32LE(0), 0x04034b50);
		});
	});
});
