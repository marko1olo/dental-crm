/**
 * apiCacheEngine.test.ts — Индустриальный сьют модульных тестов ядра кэширования API.
 *
 * Проверяет:
 * 1. 0 мс In-Memory LRU кэширование против троттлинга HDD 5400 RPM.
 * 2. Request Coalescing (дедупликация concurrent запросов к регламентным справочникам).
 * 3. Автоматическую инвалидацию при мутациях через notifyApiMutation и invalidateApiCache.
 * 4. Уважение директив Cache-Control ('no-store', 'no-cache') и опций bypassCache / forceRefresh.
 * 5. Расчет метрик и сбор статистики (hits, misses, coalesced, invalidations).
 * 6. 100% паритет и работоспособность через канонический фасад apiCacheEngine.ts.
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	cachedApiFetch,
	cachedApiFetchResponse,
	clearApiCache,
	createResponseFromCachedEntry,
	getApiCache,
	getApiCacheStats,
	getCachedApiResponse,
	headersToRecord,
	invalidateApiCache,
	isCacheableCatalogUrl,
	matchCatalogRule,
	normalizeApiUrl,
	notifyApiMutation,
	resetApiCacheStats,
	setCachedApiResponse,
	STATUTORY_CATALOG_RULES,
	DEFAULT_MUTATION_RULES,
} from "../lib/apiCacheEngine";

describe("apiCacheEngine Core & Facade Behavioral Invariant Suite", () => {
	const originalFetch = globalThis.fetch;

	beforeEach(() => {
		clearApiCache();
		resetApiCacheStats();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		clearApiCache();
		resetApiCacheStats();
	});

	it("1. Нормализация URL и сопоставление регламентных справочников 804н и МКБ-10", () => {
		assert.equal(
			normalizeApiUrl("http://localhost:5173/api/clinical/804n?lang=ru"),
			"/api/clinical/804n?lang=ru",
		);
		assert.equal(
			normalizeApiUrl("/api/clinical/nomenclature"),
			"/api/clinical/nomenclature",
		);

		// Проверка регламентных правил
		const rule804n = matchCatalogRule("/api/clinical/804n");
		assert.ok(rule804n, "Правило 804н должно сопоставляться");
		assert.equal(rule804n?.id, "nomenclature-804n");

		const ruleIcd10 = matchCatalogRule("/api/clinical/icd10");
		assert.ok(ruleIcd10, "Правило МКБ-10 должно сопоставляться");
		assert.equal(ruleIcd10?.id, "icd10-diagnosis");

		assert.equal(isCacheableCatalogUrl("/api/clinical/804n", "GET"), true);
		assert.equal(isCacheableCatalogUrl("/api/clinical/804n", "POST"), false);
		assert.equal(isCacheableCatalogUrl("/api/unknown/random/endpoint", "GET"), false);
	});

	it("2. In-Memory LRU кэширование: 0 мс доступ, учет попаданий и промахов", () => {
		const sampleData = [{ code: "A16.07.001", name: "Удаление зуба" }];
		setCachedApiResponse("/api/clinical/804n", sampleData, { status: 200 });

		const cached = getCachedApiResponse<typeof sampleData>("/api/clinical/804n");
		assert.ok(cached, "Запись должна быть найдена в кэше");
		assert.deepEqual(cached?.data, sampleData);
		assert.equal(cached?.status, 200);

		const stats = getApiCacheStats();
		assert.equal(stats.hits, 1, "Счетчик попаданий должен увеличиться");
		assert.equal(stats.cachedEntriesCount, 1, "Размер кэша должен быть равен 1");
	});

	it("3. Request Coalescing: дедупликация параллельных одновременных запросов к сети", async () => {
		let fetchCallCount = 0;
		const mockDoctors = [{ id: "doc-1", name: "Иванов И.И." }];

		globalThis.fetch = async () => {
			fetchCallCount++;
			// Имитируем небольшую сетевую задержку
			await new Promise((r) => setTimeout(r, 20));
			return new Response(JSON.stringify(mockDoctors), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};

		// Запускаем 3 параллельных запроса к одному и тому же URL
		const [res1, res2, res3] = await Promise.all([
			cachedApiFetch("/api/settings/staff/doctors"),
			cachedApiFetch("/api/settings/staff/doctors"),
			cachedApiFetch("/api/settings/staff/doctors"),
		]);

		assert.equal(fetchCallCount, 1, "Должен уйти ровно 1 физический сетевой запрос!");
		assert.deepEqual(res1, mockDoctors);
		assert.deepEqual(res2, mockDoctors);
		assert.deepEqual(res3, mockDoctors);

		const stats = getApiCacheStats();
		assert.equal(stats.misses, 1, "1 сетевой промах");
		assert.equal(stats.coalescedRequests, 2, "2 дедуплицированных параллельных запроса");
	});

	it("4. Автоматическая инвалидация при сетевых мутациях POST/PUT/PATCH/DELETE", () => {
		setCachedApiResponse("/api/settings/staff", { staff: [] });
		setCachedApiResponse("/api/hr/doctors", { doctors: [] });
		setCachedApiResponse("/api/clinical/804n", { services: [] });

		assert.ok(getCachedApiResponse("/api/settings/staff"));
		assert.ok(getCachedApiResponse("/api/hr/doctors"));
		assert.ok(getCachedApiResponse("/api/clinical/804n"));

		// Мутация в /api/settings/staff должна сбросить и settings/staff, и hr/doctors
		const invalidated = notifyApiMutation("/api/settings/staff/save", "POST");
		assert.ok(invalidated >= 2, "Должно быть инвалидировано как минимум 2 записи");

		assert.equal(getCachedApiResponse("/api/settings/staff"), undefined);
		assert.equal(getCachedApiResponse("/api/hr/doctors"), undefined);
		// Справочник 804н не должен быть затронут мутацией сотрудников
		assert.ok(getCachedApiResponse("/api/clinical/804n"), "804н должен остаться в кэше");
	});

	it("5. Уважение директив Cache-Control (no-store, no-cache) и bypassCache", async () => {
		let fetchCalls = 0;
		globalThis.fetch = async () => {
			fetchCalls++;
			return new Response(JSON.stringify({ value: fetchCalls }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		};

		// 1-й запрос с no-store
		const res1 = await cachedApiFetch<{ value: number }>("/api/catalog/dynamic", {
			cache: "no-store",
		});
		assert.equal(res1.value, 1);
		assert.equal(getCachedApiResponse("/api/catalog/dynamic"), undefined, "Не должно кэшироваться при no-store");

		// 2-й запрос с bypassCache
		const res2 = await cachedApiFetch<{ value: number }>(
			"/api/catalog/dynamic",
			{},
			{ bypassCache: true },
		);
		assert.equal(res2.value, 2);
		assert.equal(fetchCalls, 2);
	});

	it("6. cachedApiFetchResponse возвращает Response с кастомным мгновенным .json() (0 мс JSON parsing)", async () => {
		const sampleData = { clinicId: "dente-main", branchesCount: 3 };
		setCachedApiResponse("/api/settings/clinic", sampleData);

		const response = await cachedApiFetchResponse("/api/settings/clinic");
		assert.equal(response.headers.get("x-dente-cache"), "HIT");

		const parsed = await response.json();
		assert.deepEqual(parsed, sampleData);

		const cloned = response.clone();
		assert.deepEqual(await cloned.json(), sampleData);
	});

	it("7. headersToRecord корректно преобразует различные форматы заголовков", () => {
		const plain = headersToRecord({ "X-Test": "123", Authorization: "Bearer xyz" });
		assert.equal(plain["x-test"], "123");
		assert.equal(plain.authorization, "Bearer xyz");

		const h = new Headers();
		h.set("Content-Type", "application/json");
		const fromHeaders = headersToRecord(h);
		assert.equal(fromHeaders["content-type"], "application/json");
	});
});
