/**
 * lowSpecHddOptimizer.test.ts — комплексные тесты оптимизатора против троттлинга HDD,
 * In-Memory LRU кэша, очередей пакетного сброса и движка кэширования справочников API.
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	clearCachedAuthTokens,
	getCachedAuthTokens,
	setCachedAuthTokens,
	shouldAttachApiAuth,
} from "../lib/apiAuthFetch";
import {
	clearApiCache,
	createResponseFromCachedEntry,
	getApiCache,
	getApiCacheStats,
	getCachedApiResponse,
	isCacheableCatalogUrl,
	notifyApiMutation,
	setCachedApiResponse,
} from "../lib/apiCacheEngine";
import {
	createDebouncedAction,
	createMemoryLruCache,
	DebouncedBatchFlusher,
	getDeviceCapabilities,
	getOptimizedTiming,
	isLowSpecDevice,
	MemoryLruCache,
	setForcedLowSpecMode,
} from "../utils/lowSpecHddOptimizer";

describe("lowSpecHddOptimizer — Детекция слабых устройств и адаптивные тайминги", () => {
	it("управляет принудительным переключением Low-Spec режима", () => {
		setForcedLowSpecMode(true);
		assert.strictEqual(isLowSpecDevice(), true);
		const timingLow = getOptimizedTiming();
		assert.strictEqual(timingLow.autosaveDebounceMs, 1800);
		assert.strictEqual(timingLow.batchFlushDelayMs, 1500);
		assert.strictEqual(timingLow.disableAggressivePrefetch, true);
		assert.strictEqual(timingLow.maxLruCacheEntries, 300);

		setForcedLowSpecMode(false);
		assert.strictEqual(isLowSpecDevice(), false);
		const timingNormal = getOptimizedTiming();
		assert.strictEqual(timingNormal.autosaveDebounceMs, 800);
		assert.strictEqual(timingNormal.batchFlushDelayMs, 500);
		assert.strictEqual(timingNormal.disableAggressivePrefetch, false);
		assert.strictEqual(timingNormal.maxLruCacheEntries, 1200);

		setForcedLowSpecMode(null);
	});

	it("возвращает корректную структуру getDeviceCapabilities", () => {
		const caps = getDeviceCapabilities();
		assert.strictEqual(typeof caps.isLowSpec, "boolean");
		assert.strictEqual(typeof caps.hardwareConcurrency, "number");
		assert.strictEqual(typeof caps.isSaveData, "boolean");
	});
});

describe("lowSpecHddOptimizer — In-Memory LRU Cache (RAM, 0 ms)", () => {
	it("сохраняет и извлекает значения за 0 мс без дискового I/O", () => {
		const cache = createMemoryLruCache<string, { code: string; name: string }>({
			maxEntries: 3,
			defaultTtlMs: 60000,
		});

		cache.set("A16.07.002", { code: "A16.07.002", name: "Восстановление зуба пломбой" });
		assert.strictEqual(cache.has("A16.07.002"), true);

		const item = cache.get("A16.07.002");
		assert.ok(item);
		assert.strictEqual(item?.name, "Восстановление зуба пломбой");
	});

	it("вытесняет наименее используемые элементы (LRU) при переполнении", () => {
		const cache = new MemoryLruCache<string, number>({ maxEntries: 3 });

		cache.set("a", 1);
		cache.set("b", 2);
		cache.set("c", 3);
		assert.strictEqual(cache.size, 3);

		// Обращаемся к 'a', чтобы сделать его самым свежим
		cache.get("a");

		// Добавляем 'd': должен быть вытеснен 'b' (так как 'a' был прочитан, а 'c' добавлен позже)
		cache.set("d", 4);

		assert.strictEqual(cache.has("b"), false, "'b' должен быть вытеснен как самый старый");
		assert.strictEqual(cache.has("a"), true, "'a' должен сохраниться благодаря недавнему get");
		assert.strictEqual(cache.has("c"), true);
		assert.strictEqual(cache.has("d"), true);
		assert.strictEqual(cache.size, 3);
	});

	it("удаляет просроченные записи по TTL", async () => {
		const cache = new MemoryLruCache<string, string>({
			maxEntries: 10,
			defaultTtlMs: 25, // 25 мс
		});

		cache.set("temp", "value");
		assert.strictEqual(cache.get("temp"), "value");

		await new Promise((resolve) => setTimeout(resolve, 35));

		assert.strictEqual(cache.get("temp"), undefined);
		assert.strictEqual(cache.has("temp"), false);
	});

	it("очищает кэш полностью через clear()", () => {
		const cache = new MemoryLruCache<string, number>({ maxEntries: 10 });
		cache.set("k1", 100);
		cache.set("k2", 200);
		assert.strictEqual(cache.size, 2);

		cache.clear();
		assert.strictEqual(cache.size, 0);
		assert.strictEqual(cache.get("k1"), undefined);
	});

	it("вытесняет элементы по превышению лимита байтов (RAM byte budget)", () => {
		const cache = new MemoryLruCache<string, string>({
			maxEntries: 100,
			maxBytes: 100, // 100 байт лимит
			sizeCalculator: (str) => str.length,
		});

		cache.set("item1", "1234567890123456789012345678901234567890"); // 40 bytes
		cache.set("item2", "1234567890123456789012345678901234567890"); // 40 bytes
		assert.strictEqual(cache.size, 2);
		assert.strictEqual(cache.currentByteSize, 80);

		// Добавляем item3 (40 bytes): 80 + 40 = 120 > 100 -> item1 должен быть вытеснен
		cache.set("item3", "1234567890123456789012345678901234567890");
		assert.strictEqual(cache.has("item1"), false, "item1 должен быть вытеснен по превышению maxBytes");
		assert.strictEqual(cache.has("item2"), true);
		assert.strictEqual(cache.has("item3"), true);
		assert.ok(cache.currentByteSize <= 100);
	});
});

describe("lowSpecHddOptimizer — DebouncedBatchFlusher (пакетная отложенная запись)", () => {
	it("группирует элементы и вызывает сброс единой пачкой", async () => {
		const flushedBatches: string[][] = [];

		const flusher = new DebouncedBatchFlusher<string>({
			debounceMs: 30,
			maxBatchSize: 10,
			onFlush: (items) => {
				flushedBatches.push(items);
			},
		});

		flusher.add("action_1");
		flusher.add("action_2");
		flusher.add("action_3");

		assert.strictEqual(flusher.pendingCount, 3);
		assert.strictEqual(flushedBatches.length, 0);

		// Ждем истечения дебаунса
		await new Promise((resolve) => setTimeout(resolve, 50));

		assert.strictEqual(flushedBatches.length, 1);
		assert.deepStrictEqual(flushedBatches[0], ["action_1", "action_2", "action_3"]);
		assert.strictEqual(flusher.pendingCount, 0);

		flusher.destroy();
	});

	it("сбрасывает пачку немедленно при достижении maxBatchSize", async () => {
		const flushedBatches: number[][] = [];

		const flusher = new DebouncedBatchFlusher<number>({
			debounceMs: 500,
			maxBatchSize: 3,
			onFlush: (items) => {
				flushedBatches.push(items);
			},
		});

		flusher.add(1);
		flusher.add(2);
		assert.strictEqual(flushedBatches.length, 0);

		// 3-й элемент достигает maxBatchSize = 3
		flusher.add(3);

		// Даем микротаске завершиться
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.strictEqual(flushedBatches.length, 1);
		assert.deepStrictEqual(flushedBatches[0], [1, 2, 3]);

		flusher.destroy();
	});

	it("поддерживает принудительный синхронный сброс flushNow()", async () => {
		const flushedBatches: string[][] = [];

		const flusher = new DebouncedBatchFlusher<string>({
			debounceMs: 5000, // большой таймер
			onFlush: (items) => {
				flushedBatches.push(items);
			},
		});

		flusher.add("urgent_save");
		assert.strictEqual(flushedBatches.length, 0);

		await flusher.flushNow();
		assert.strictEqual(flushedBatches.length, 1);
		assert.deepStrictEqual(flushedBatches[0], ["urgent_save"]);

		flusher.destroy();
	});
});

describe("lowSpecHddOptimizer — createDebouncedAction", () => {
	it("дебаунсит частые вызовы функции и позволяет сбросить через flush()", async () => {
		let callCount = 0;
		let lastParam = "";

		const debounced = createDebouncedAction((param: string) => {
			callCount++;
			lastParam = param;
		}, 30);

		debounced("call_1");
		debounced("call_2");
		debounced("call_3");

		assert.strictEqual(callCount, 0);

		debounced.flush();
		assert.strictEqual(callCount, 1);
		assert.strictEqual(lastParam, "call_3");

		debounced.cancel();
	});
});

describe("apiCacheEngine — Кэширование справочников в RAM и инвалидация", () => {
	it("распознает канонические пути стоматологических справочников", () => {
		assert.strictEqual(isCacheableCatalogUrl("/api/nomenclature"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/804n"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/nomenclature?query=caries"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/icd10"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/icd10"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/templates"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/document-templates"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/somatic-status"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/settings/price"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/catalog/services"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/settings/staff"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/settings/clinic"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/clinical/rules"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/references"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/sanpin/references"), true);

		// Небезопасные методы или транзакционные маршруты НЕ должны кэшироваться
		assert.strictEqual(isCacheableCatalogUrl("/api/nomenclature", "POST"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/templates", "POST"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/visits/quick"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/auth/login"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/invoices/pay"), false);
	});

	it("сохраняет и извлекает ответы из оперативной памяти", () => {
		clearApiCache();

		const testData = {
			catalog: [{ code: "A16.07.002.001", name: "Наложение временной пломбы" }],
		};

		setCachedApiResponse("/api/nomenclature", testData);

		const cached = getCachedApiResponse<typeof testData>("/api/nomenclature");
		assert.ok(cached);
		assert.deepStrictEqual(cached?.data, testData);

		// Формирование Response из кэша
		const response = createResponseFromCachedEntry(cached!);
		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.headers.get("x-dente-cache"), "HIT");
	});

	it("автоматически инвалидирует затронутый кэш при мутациях (notifyApiMutation)", () => {
		clearApiCache();

		setCachedApiResponse("/api/settings/staff", [{ id: "doc-1", name: "Иванов И.И." }]);
		setCachedApiResponse("/api/settings/price", [{ id: "srv-1", price: 3500 }]);

		assert.ok(getCachedApiResponse("/api/settings/staff"));
		assert.ok(getCachedApiResponse("/api/settings/price"));

		// Мутация сотрудников: POST /api/settings/staff/add
		const invalidated = notifyApiMutation("/api/settings/staff/add", "POST");
		assert.ok(invalidated >= 1);

		// Кэш сотрудников должен быть сброшен, а прайс-лист остаться нетронутым
		assert.strictEqual(getCachedApiResponse("/api/settings/staff"), undefined);
		assert.ok(getCachedApiResponse("/api/settings/price"));

		// Мутация прайс-листа: PUT /api/settings/price
		notifyApiMutation("/api/settings/price", "PUT");
		assert.strictEqual(getCachedApiResponse("/api/settings/price"), undefined);

		// Кэширование и инвалидация шаблонов 043/у и соматических статусов
		setCachedApiResponse("/api/templates", [{ id: "tmpl-1", title: "Лечение кариеса" }]);
		setCachedApiResponse("/api/somatic-status", [{ id: "som-1", label: "Аллергоанамнез" }]);
		assert.ok(getCachedApiResponse("/api/templates"));
		assert.ok(getCachedApiResponse("/api/somatic-status"));

		notifyApiMutation("/api/templates/update", "POST");
		assert.strictEqual(getCachedApiResponse("/api/templates"), undefined);
		assert.strictEqual(getCachedApiResponse("/api/somatic-status"), undefined);
	});

	it("поддерживает строгое типизирование ttlMs и бессрочное хранение (null)", () => {
		clearApiCache();
		setCachedApiResponse("/api/clinical/804n", { count: 3500 }, { ttlMs: null });
		const entry = getCachedApiResponse<{ count: number }>("/api/clinical/804n");
		assert.ok(entry);
		assert.strictEqual(entry?.data.count, 3500);
		assert.strictEqual(entry?.ttlMs, null);
	});
});

describe("apiAuthFetch — In-Memory Token Caching (Zero-Disk Hot Path)", () => {
	it("управляет закэшированными токенами в оперативной памяти без повторного чтения с диска", () => {
		setCachedAuthTokens({
			clinicToken: "test-clinic-token-uuid",
			staffToken: "test-staff-token-uuid",
		});

		const tokens = getCachedAuthTokens();
		assert.strictEqual(tokens.clinicToken, "test-clinic-token-uuid");
		assert.strictEqual(tokens.staffToken, "test-staff-token-uuid");

		clearCachedAuthTokens();
		const cleared = getCachedAuthTokens();
		assert.strictEqual(cleared.clinicToken, null);
		assert.strictEqual(cleared.staffToken, null);
	});

	it("сохраняет корректность фильтрации shouldAttachApiAuth", () => {
		assert.strictEqual(shouldAttachApiAuth("/api/patients"), true);
		assert.strictEqual(shouldAttachApiAuth("/api/portal/auth/send-otp"), false);
	});
});
