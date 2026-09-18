/**
 * hddPerformanceConfig.test.ts — комплексные тесты архитектурного модуля оптимизации
 * производительности бэкенда для слабых ПК и ноутбуков с HDD 5400 RPM и 4GB RAM.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	applyHddPerformanceDefaults,
	executeBatchInChunks,
	getHddDbPoolConfig,
	HDD_DEFAULT_POOL_MAX,
	HDD_LOW_SPEC_POOL_MAX,
	isHddOptimizationActive,
	queryInChunks,
	streamQueryChunks,
} from "../lib/hddPerformanceConfig.js";
import {
	buildCacheControlHeader,
	DEFAULT_STATIC_CATALOG_PATTERNS,
	generateEtag,
	isRouteCacheable,
	matchesEtag,
} from "../plugins/cacheHeaders.js";

describe("hddPerformanceConfig — Калибровка пула БД и окружения для HDD 5400 RPM", () => {
	it("активен по умолчанию", () => {
		assert.strictEqual(isHddOptimizationActive(), true);
	});

	it("возвращает калиброванный лимит пула соединений", () => {
		const config = getHddDbPoolConfig();
		assert.ok(config.max <= 30);
		assert.ok(config.idleTimeoutMillis <= 30000);
		assert.ok(config.connectionTimeoutMillis <= 15000);
	});

	it("применяет безопасные дефолты при вызове applyHddPerformanceDefaults", () => {
		const oldPool = process.env.PG_POOL_MAX;
		delete process.env.PG_POOL_MAX;

		try {
			applyHddPerformanceDefaults();
			assert.strictEqual(process.env.PG_POOL_MAX, String(HDD_DEFAULT_POOL_MAX));
		} finally {
			if (oldPool !== undefined) {
				process.env.PG_POOL_MAX = oldPool;
			} else {
				delete process.env.PG_POOL_MAX;
			}
		}
	});

	it("учитывает флаг DENTE_LOW_SPEC=1 для экстремальной экономии ресурсов", () => {
		const oldPool = process.env.PG_POOL_MAX;
		const oldLow = process.env.DENTE_LOW_SPEC;
		delete process.env.PG_POOL_MAX;
		process.env.DENTE_LOW_SPEC = "1";

		try {
			applyHddPerformanceDefaults();
			assert.strictEqual(process.env.PG_POOL_MAX, String(HDD_LOW_SPEC_POOL_MAX));
		} finally {
			if (oldPool !== undefined) {
				process.env.PG_POOL_MAX = oldPool;
			} else {
				delete process.env.PG_POOL_MAX;
			}
			if (oldLow !== undefined) {
				process.env.DENTE_LOW_SPEC = oldLow;
			} else {
				delete process.env.DENTE_LOW_SPEC;
			}
		}
	});
});

describe("hddPerformanceConfig — Порционное выполнение запросов (Query Chunking & Streaming)", () => {
	it("queryInChunks выполняет постраничную загрузку данных без переполнения памяти", async () => {
		const mockDatabaseRows = Array.from({ length: 650 }, (_, i) => ({
			id: `item-${i + 1}`,
			code: `804n-${i + 1}`,
		}));

		const chunkRequests: Array<{ limit: number; offset: number }> = [];

		const result = await queryInChunks(
			async (limit, offset) => {
				chunkRequests.push({ limit, offset });
				return mockDatabaseRows.slice(offset, offset + limit);
			},
			200,
		);

		assert.strictEqual(result.length, 650);
		assert.strictEqual(result[0]?.id, "item-1");
		assert.strictEqual(result[649]?.id, "item-650");
		// 650 строк пачками по 200: запросы с offset 0, 200, 400, 600
		assert.strictEqual(chunkRequests.length, 4);
		assert.deepStrictEqual(chunkRequests[0], { limit: 200, offset: 0 });
		assert.deepStrictEqual(chunkRequests[3], { limit: 200, offset: 600 });
	});

	it("streamQueryChunks отдает генератор для потоковой обработки", async () => {
		const mockRows = Array.from({ length: 15 }, (_, i) => i + 1);
		const receivedChunks: number[][] = [];

		for await (const chunk of streamQueryChunks(
			async (limit, offset) => mockRows.slice(offset, offset + limit),
			5,
		)) {
			receivedChunks.push(chunk);
		}

		assert.strictEqual(receivedChunks.length, 3);
		assert.deepStrictEqual(receivedChunks[0], [1, 2, 3, 4, 5]);
		assert.deepStrictEqual(receivedChunks[1], [6, 7, 8, 9, 10]);
		assert.deepStrictEqual(receivedChunks[2], [11, 12, 13, 14, 15]);
	});

	it("executeBatchInChunks выполняет операции пакетами", async () => {
		const inputItems = [1, 2, 3, 4, 5, 6, 7];
		const processedBatches: number[][] = [];

		const output = await executeBatchInChunks(inputItems, 3, async (batch) => {
			processedBatches.push(batch);
			return batch.map((n) => n * 10);
		});

		assert.strictEqual(processedBatches.length, 3);
		assert.deepStrictEqual(output, [10, 20, 30, 40, 50, 60, 70]);
	});
});

describe("cacheHeadersPlugin — Генерация ETag, сверка If-None-Match и заголовки", () => {
	it("генерирует детерминированный ETag с префиксом слабого валидатора W/", () => {
		const etag1 = generateEtag('{"services":[{"code":"A16.07.002"}]}');
		const etag2 = generateEtag('{"services":[{"code":"A16.07.002"}]}');
		const etagDifferent = generateEtag('{"services":[{"code":"A16.07.003"}]}');

		assert.ok(etag1.startsWith('W/"'));
		assert.strictEqual(etag1, etag2);
		assert.notStrictEqual(etag1, etagDifferent);
	});

	it("matchesEtag корректно сопоставляет строгие и слабые теги, а также звездочку *", () => {
		const targetEtag = 'W/"abc-123"';

		assert.strictEqual(matchesEtag('W/"abc-123"', targetEtag), true);
		assert.strictEqual(matchesEtag('"abc-123"', targetEtag), true);
		assert.strictEqual(matchesEtag("abc-123", targetEtag), true);
		assert.strictEqual(matchesEtag("*", targetEtag), true);
		assert.strictEqual(matchesEtag('W/"other", W/"abc-123"', targetEtag), true);
		assert.strictEqual(matchesEtag('W/"different"', targetEtag), false);
		assert.strictEqual(matchesEtag(undefined, targetEtag), false);
	});

	it("buildCacheControlHeader формирует регламентный заголовок", () => {
		const header = buildCacheControlHeader({
			maxAge: 1800,
			scope: "private",
			mustRevalidate: true,
		});

		assert.strictEqual(header, "private, max-age=1800, must-revalidate");
	});

	it("распознает регламентные справочники в DEFAULT_STATIC_CATALOG_PATTERNS", () => {
		const mockRequest = (url: string, method = "GET") =>
			({
				method,
				url,
				routeOptions: { config: {} },
			}) as any;

		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/clinical/804n"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/nomenclature"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/clinical/icd10"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/templates"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/outpatient/templates"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/somatic-status"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/settings/price"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/catalogs/mkb/categories/tree"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/catalogs/teeth"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/catalogs/tooth-defects"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/settings/catalog"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			true,
		);

		// Небезопасные методы
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/templates", "POST"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			false,
		);
		assert.strictEqual(
			isRouteCacheable(mockRequest("/api/visits/pay", "GET"), DEFAULT_STATIC_CATALOG_PATTERNS).cacheable,
			false,
		);
	});
});

describe("hddPerformanceConfig — Защита от Seq Scan в запросах пациентов", () => {
	it("getPatientsFromDb уважает limit и search параметры для предотвращения дискового троттлинга", async () => {
		const { getPatientsFromDb } = await import("../db/patientsQuery.js");
		const prev = process.env.DENTAL_STATE_PERSISTENCE;
		process.env.DENTAL_STATE_PERSISTENCE = "off";

		try {
			const all = await getPatientsFromDb("test-org");
			assert.ok(all.length > 0);

			const limited = await getPatientsFromDb("test-org", { limit: 1 });
			assert.strictEqual(limited.length, 1);

			const offset = await getPatientsFromDb("test-org", { offset: 1, limit: 1 });
			assert.strictEqual(offset.length, 1);
			if (all.length > 1) {
				assert.notStrictEqual(limited[0]?.id, offset[0]?.id);
			}
		} finally {
			if (prev !== undefined) process.env.DENTAL_STATE_PERSISTENCE = prev;
			else delete process.env.DENTAL_STATE_PERSISTENCE;
		}
	});
});

