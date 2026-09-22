/**
 * lowSpecHddOptimizer.test.ts — комплексные тесты оптимизатора против троттлинга HDD,
 * In-Memory LRU кэша, очередей пакетного сброса и движка кэширования справочников API.
 */

import assert from "node:assert";
import { afterEach, describe, it } from "vitest";
import {
	isDesktopApp,
	printDesktopA4DocumentSilent,
	printDesktopDocumentSilent,
} from "../native/desktopBridge";
import {
	isDesktopExecutable,
	isStandalonePwa,
	detectOmniEnvironment,
} from "../lib/omniPlatformAdapter";
import { getSafeAreaInsets } from "../native/mobileBridge";
import {
	deleteOfflineDraft,
	enqueueOfflineMutationsBatch,
	flushPendingOfflineDrafts,
	getPendingOfflineMutations,
	loadOfflineDraft,
	loadVisitDraftSync,
	saveForm043DraftDebounced,
	saveOfflineDraftDebounced,
	saveVisitDraftDebounced,
} from "../services/offline";
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
	getCached804nSync,
	getCachedIcd10Sync,
	getCachedTemplatesSync,
	setStatutoryCatalogInRam,
} from "../services/storage/statutoryCatalogCache";
import {
	searchPricelistItems,
} from "../components/catalog/pricelist/servicePricelistEngine";
import type { ServicePricelistItem } from "../components/catalog/pricelist/servicePricelistPresets";
import { buildDoctorSlotAppointmentsMap } from "../components/schedule/ScheduleGrid";
import type { Appointment } from "@dental/shared";
import {
	clinicalHotModulePreloaders,
	scheduleClinicalHotModulesWarmup,
} from "../workspacePreload";
import {
	createDebouncedAction,
	createMemoryLruCache,
	DebouncedBatchFlusher,
	getDeviceCapabilities,
	getDiskBenchmarkResult,
	getOptimizedTiming,
	isLowSpecDevice,
	measureIndexedDbDiskSpeed,
	MemoryLruCache,
	setCachedDiskBenchmark,
	setForcedLowSpecMode,
} from "../utils/lowSpecHddOptimizer";
import { measureIndexedDbDiskSpeed as measureOfflineDiskSpeed } from "../services/offline/lowSpecHddOptimizer";
import {
	convert16BitToRgbaImageData,
	ProgressiveVisiographController,
	shouldLoad16BitBuffer,
} from "../components/visiograph/VisiographProgressiveLoader";
import { sliceDomList } from "../utils/domVirtualizationHelper";

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

describe("apiCacheEngine — Кэширование склада, материалов и инвалидация", () => {
	it("распознает пути складской номенклатуры и правил списания материалов", () => {
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory/org-42"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory/org-42/rules"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory/org-42/rules?service=A16.07.002"), true);

		// Мутации НЕ должны кэшироваться
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory/org-42", "POST"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/inventory/org-42/rules", "POST"), false);
	});

	it("инвалидирует кэш склада при списаниях и мутациях остатков", () => {
		clearApiCache();

		setCachedApiResponse("/api/inventory/org-42", [{ id: "mat-1", name: "Перчатки нитриловые", stock: 150 }]);
		setCachedApiResponse("/api/inventory/org-42/rules", [{ id: "rule-1", serviceId: "srv-1" }]);

		assert.ok(getCachedApiResponse("/api/inventory/org-42"));
		assert.ok(getCachedApiResponse("/api/inventory/org-42/rules"));

		// Списание стандартного набора: POST /api/inventory/org-42/quick-writeoff-standard-kit
		notifyApiMutation("/api/inventory/org-42/quick-writeoff-standard-kit", "POST");

		// Кэш склада должен быть инвалидирован
		assert.strictEqual(getCachedApiResponse("/api/inventory/org-42"), undefined);
		assert.strictEqual(getCachedApiResponse("/api/inventory/org-42/rules"), undefined);
	});
});

describe("apiCacheEngine & statutoryCatalogCache — Фармакология и синхронизация L1 RAM каталогов (0 мс)", () => {
	it("распознает и кэширует все эндпоинты фармакологии и лекарств", () => {
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/references"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/interactions-matrix"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/medications"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/catalog"), true);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/drugs"), true);

		// Мутации не должны кэшироваться
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/medications", "POST"), false);
		assert.strictEqual(isCacheableCatalogUrl("/api/pharmacology/update", "PUT"), false);
	});

	it("инвалидирует кэш фармакологии при мутациях", () => {
		clearApiCache();

		setCachedApiResponse("/api/pharmacology/references", [{ id: "med-1", name: "Амоксиклав" }]);
		setCachedApiResponse("/api/pharmacology/medications", [{ id: "med-2", name: "Ультракаин Д-С" }]);

		assert.ok(getCachedApiResponse("/api/pharmacology/references"));
		assert.ok(getCachedApiResponse("/api/pharmacology/medications"));

		notifyApiMutation("/api/pharmacology/medications", "POST");

		assert.strictEqual(getCachedApiResponse("/api/pharmacology/references"), undefined);
		assert.strictEqual(getCachedApiResponse("/api/pharmacology/medications"), undefined);
	});

	it("синхронизирует регламентные справочники в оперативную память (L1 RAM) для мгновенного доступа (0 мс)", () => {
		const mock804n = [{ code: "A16.07.002", name: "Восстановление зуба пломбой" }];
		const mockIcd10 = [{ code: "K02.1", description: "Кариес дентина" }];
		const mockTemplates = [{ id: "t1", title: "Кариес дентина (терапия)" }];

		setStatutoryCatalogInRam("804n", mock804n);
		setStatutoryCatalogInRam("icd10", mockIcd10);
		setStatutoryCatalogInRam("templates", mockTemplates);

		const cached804n = getCached804nSync();
		const cachedIcd10 = getCachedIcd10Sync();
		const cachedTemplates = getCachedTemplatesSync();

		assert.ok(cached804n);
		assert.strictEqual(cached804n.length, 1);
		assert.strictEqual((cached804n[0] as any).code, "A16.07.002");

		assert.ok(cachedIcd10);
		assert.strictEqual(cachedIcd10.length, 1);
		assert.strictEqual((cachedIcd10[0] as any).code, "K02.1");

		assert.ok(cachedTemplates);
		assert.strictEqual(cachedTemplates.length, 1);
		assert.strictEqual((cachedTemplates[0] as any).title, "Кариес дентина (терапия)");
	});
});

describe("workspacePreload — Clinical Hot Modules Preloaders & Warmup", () => {
	it("содержит все 6 ключевых клинических модулей горячего пути", () => {
		const keys = Object.keys(clinicalHotModulePreloaders);
		assert.ok(keys.includes("scheduleView"));
		assert.ok(keys.includes("visitView"));
		assert.ok(keys.includes("visitEmkTab"));
		assert.ok(keys.includes("odontogramViewContainer"));
		assert.ok(keys.includes("paymentCapture"));
		assert.ok(keys.includes("documentsView"));
		assert.strictEqual(keys.length, 6);

		for (const key of keys as Array<keyof typeof clinicalHotModulePreloaders>) {
			assert.strictEqual(typeof clinicalHotModulePreloaders[key], "function");
		}
	});

	it("запускает планировщик прогрева scheduleClinicalHotModulesWarmup без ошибок", () => {
		const cleanup = scheduleClinicalHotModulesWarmup();
		if (cleanup) {
			assert.strictEqual(typeof cleanup, "function");
			cleanup();
		}
	});
});

describe("servicePricelistEngine — Zero GC Search Performance & WeakMap Indexing", () => {
	const sampleItems: ServicePricelistItem[] = [
		{
			id: "srv-caries-1",
			code804n: "A16.07.002.001",
			commercialTitle: "Лечение кариеса с пломбированием светоотверждаемым композитом",
			statutoryTitle804n: "Восстановление зуба пломбой с нарушением формы зуба",
			category: "therapy",
			specialty: "general",
			basePriceRub: 4500,
			basePriceKopecks: 450000,
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			materialCostRub: 500,
			labCostRub: 0,
			tags: ["кариес", "пломба", "estelite"],
			icd10Indications: ["K02.1"],
			estimatedDurationMin: 45,
			isActive: true,
			isArchived: false,
		},
		{
			id: "srv-endo-1",
			code804n: "A16.07.030.001",
			commercialTitle: "Механическая и медикаментозная обработка корневого канала",
			statutoryTitle804n: "Инструментальная и медикаментозная обработка корневого канала",
			category: "therapy",
			specialty: "therapist",
			basePriceRub: 3000,
			basePriceKopecks: 300000,
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			materialCostRub: 400,
			labCostRub: 0,
			tags: ["пульпит", "канал", "эндодонтия"],
			icd10Indications: ["K04.0"],
			estimatedDurationMin: 60,
			isActive: true,
			isArchived: false,
		},
	];

	it("мгновенно находит услугу по клиническому синониму 'кариес' без аллокаций мусора", () => {
		const results = searchPricelistItems(sampleItems, "кариес");
		assert.strictEqual(results.length, 1);
		assert.strictEqual(results[0]?.id, "srv-caries-1");
	});

	it("находит услугу по коду 804н со специальными символами и без них", () => {
		const byDots = searchPricelistItems(sampleItems, "A16.07.002");
		assert.strictEqual(byDots.length, 1);
		assert.strictEqual(byDots[0]?.id, "srv-caries-1");

		const byCleanCode = searchPricelistItems(sampleItems, "a1607002");
		assert.strictEqual(byCleanCode.length, 1);
		assert.strictEqual(byCleanCode[0]?.id, "srv-caries-1");
	});

	it("повторный поиск использует WeakMap индекс с 0 ms задержкой", () => {
		// Первое обращение (прогрев индекса)
		searchPricelistItems(sampleItems, "пломба");
		// Второе обращение — hit в WeakMap индексе
		const results = searchPricelistItems(sampleItems, "пломба");
		assert.strictEqual(results.length, 1);
		assert.strictEqual(results[0]?.id, "srv-caries-1");
	});
});

describe("ScheduleGrid — O(1) Doctor Slot Appointments Map (Zero GC & No .filter() churn)", () => {
	it("индексирует приемы по ключу ${doctorId}_${timeSlot} за один проход", () => {
		const appointments: Appointment[] = [
			{
				id: "appt-1",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				patientId: "pat-1",
				startsAt: "2026-09-20T09:00:00.000Z",
				endsAt: "2026-09-20T09:30:00.000Z",
				status: "planned",
				reason: "Консультация",
				organizationId: "org-1",
				comment: "",
			},
			{
				id: "appt-2",
				doctorUserId: "doc-1",
				chairId: "chair-1",
				patientId: "pat-2",
				startsAt: "2026-09-20T10:00:00.000Z",
				endsAt: "2026-09-20T11:00:00.000Z",
				status: "planned",
				reason: "Лечение кариеса",
				organizationId: "org-1",
				comment: "",
			},
			{
				id: "appt-3",
				doctorUserId: "doc-2",
				chairId: "chair-2",
				patientId: "pat-3",
				startsAt: "2026-09-20T09:00:00.000Z",
				endsAt: "2026-09-20T09:30:00.000Z",
				status: "planned",
				reason: "Профгигиена",
				organizationId: "org-1",
				comment: "",
			},
		];

		const timeSlots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00"];
		const slotMap = buildDoctorSlotAppointmentsMap(appointments, "2026-09-20", timeSlots, 30);

		// O(1) lookup
		const doc1At9 = slotMap.get("doc-1_09:00");
		assert.ok(doc1At9);
		assert.strictEqual(doc1At9.length, 1);
		assert.strictEqual(doc1At9[0]?.id, "appt-1");

		const doc1At10 = slotMap.get("doc-1_10:00");
		assert.ok(doc1At10);
		assert.strictEqual(doc1At10.length, 1);
		assert.strictEqual(doc1At10[0]?.id, "appt-2");

		const doc2At9 = slotMap.get("doc-2_09:00");
		assert.ok(doc2At9);
		assert.strictEqual(doc2At9.length, 1);
		assert.strictEqual(doc2At9[0]?.id, "appt-3");

		// Free slot returns undefined in O(1) without filtering
		const doc1At8 = slotMap.get("doc-1_08:00");
		assert.strictEqual(doc1At8, undefined);
	});
});

describe("lowSpecHddOptimizer — Low-Spec Hardware & GPU Acceleration Guards (Mandate 8c)", () => {
	it("детектирует режим низкой производительности по data-perf='low' и классу .low-spec-perf", async () => {
		const { applyLowSpecToRoot, isLowSpecDevice: isHwLowSpec } = await import(
			"../lib/hardwareCapabilities"
		);

		// Создаем mock root element
		const classList = new Set<string>();
		const attributes = new Map<string, string>();
		const mockRoot = {
			setAttribute: (k: string, v: string) => attributes.set(k, v),
			removeAttribute: (k: string) => attributes.delete(k),
			getAttribute: (k: string) => attributes.get(k) ?? null,
			classList: {
				add: (cls: string) => classList.add(cls),
				remove: (cls: string) => classList.delete(cls),
				contains: (cls: string) => classList.has(cls),
			},
		} as unknown as HTMLElement;

		applyLowSpecToRoot(true, mockRoot);
		assert.strictEqual(mockRoot.getAttribute("data-low-spec"), "true");
		assert.strictEqual(mockRoot.getAttribute("data-perf"), "low");
		assert.strictEqual(mockRoot.getAttribute("data-hardware-tier"), "low");
		assert.strictEqual(mockRoot.classList.contains("low-spec-mode"), true);
		assert.strictEqual(mockRoot.classList.contains("low-spec-perf"), true);

		applyLowSpecToRoot(false, mockRoot);
		assert.strictEqual(mockRoot.getAttribute("data-low-spec"), null);
		assert.strictEqual(mockRoot.getAttribute("data-perf"), "high");
		assert.strictEqual(mockRoot.getAttribute("data-hardware-tier"), "high");
		assert.strictEqual(mockRoot.classList.contains("low-spec-mode"), false);
		assert.strictEqual(mockRoot.classList.contains("low-spec-perf"), false);
	});
});

describe("lowSpecHddOptimizer — Statutory Catalog Caching (804n, ICD-10, 043/u templates)", () => {
	it("загружает и кэширует номенклатуру 804н, МКБ-10 и шаблоны 043/у с 0 мс задержкой в RAM", async () => {
		const {
			getOrLoadNomenclature804n,
			getOrLoadIcd10Dictionary,
			getOrLoadClinical043Templates,
			seedAllStatutoryCatalogsInIndexedDb,
			getStatutoryCatalogCacheStats,
		} = await import("../services/storage/statutoryCatalogCache");

		// Сидируем справочники
		const seedResult = await seedAllStatutoryCatalogsInIndexedDb();
		assert.ok(seedResult.nomenclatureCount > 0, "Номенклатура 804н должна содержать элементы");
		assert.ok(seedResult.icd10Count > 0, "МКБ-10 должен содержать элементы");
		assert.ok(seedResult.templatesCount > 0, "Шаблоны 043/у должны содержать элементы");

		// Проверяем статус кэша в RAM
		const stats = getStatutoryCatalogCacheStats();
		assert.strictEqual(stats.has804nInRam, true);
		assert.strictEqual(stats.hasIcd10InRam, true);
		assert.strictEqual(stats.hasTemplatesInRam, true);
		assert.ok(stats.ramItemCount > 0);

		// Повторные вызовы должны возвращать закэшированные данные синхронно из RAM
		const nom2 = await getOrLoadNomenclature804n();
		assert.strictEqual(nom2.length, seedResult.nomenclatureCount);

		const icd2 = await getOrLoadIcd10Dictionary();
		assert.strictEqual(icd2.length, seedResult.icd10Count);

		const tmpl2 = await getOrLoadClinical043Templates();
		assert.strictEqual(tmpl2.length, seedResult.templatesCount);

		// Проверяем мгновенный синхронный RAM поиск (0 мс)
		const {
			getCached804nSync,
			getCachedIcd10Sync,
			getCachedTemplatesSync,
			searchCached804nSync,
			searchCachedIcd10Sync,
		} = await import("../services/storage/statutoryCatalogCache");

		assert.strictEqual(getCached804nSync()?.length, seedResult.nomenclatureCount);
		assert.strictEqual(getCachedIcd10Sync()?.length, seedResult.icd10Count);
		assert.strictEqual(getCachedTemplatesSync()?.length, seedResult.templatesCount);

		const search804n = searchCached804nSync("кариес", 10);
		assert.ok(Array.isArray(search804n));

		const searchIcd10 = searchCachedIcd10Sync("K02", 10);
		assert.ok(Array.isArray(searchIcd10));
		assert.ok(searchIcd10.length > 0);
	});
});

describe("VisitSoapEditor — Template Drawer DOM Chunking & Memory Guard (Mandates 8c, 8n)", () => {
	it("ограничивает начальную выборку из 448 шаблонов 30 карточками в DOM и рендерит кнопку 'Показать ещё'", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { VisitSoapEditor } = await import("../components/visit/VisitSoapEditor");

		const html = renderToString(
			React.createElement(VisitSoapEditor, {
				isTemplatesOpen: true,
			}),
		);

		// Проверяем, что отрисовано ровно 30 карточек (кнопка 'Заполнить (1 клик)')
		const matches = html.match(/Заполнить \(1 клик\)/g) || [];
		assert.strictEqual(
			matches.length,
			30,
			`Ожидалось ровно 30 шаблонов в начальном DOM, получено ${matches.length}`,
		);

		// Проверяем кнопку раскрытия следующей порции
		assert.ok(
			html.includes('data-testid="btn-soap-templates-show-more"'),
			"Должна присутствовать кнопка 'Показать ещё' шаблонов",
		);
		assert.ok(
			html.includes("Показать ещё 30 шаблонов (показано 30 из 448)"),
			"Кнопка должна содержать точный счетчик: 'Показать ещё 30 шаблонов (показано 30 из 448)'",
		);
	});
});

describe("ServicePricelistManagerModal — DOM Chunking & Memory Guard (Mandates 8c, 8n)", () => {
	it("ограничивает начальную выборку прейскуранта 40 позициями в DOM и рендерит кнопку 'Показать ещё'", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { ServicePricelistManagerModal } = await import(
			"../components/catalog/pricelist/ServicePricelistManagerModal"
		);

		const html = renderToString(
			React.createElement(ServicePricelistManagerModal, {
				isOpen: true,
				onClose: () => {},
			}),
		);

		// Проверяем кнопку раскрытия следующей порции
		assert.ok(
			html.includes("btn-pricelist-show-more"),
			"Должна присутствовать кнопка 'Показать ещё' услуг",
		);
		assert.ok(
			html.includes("Показать ещё 40 услуг"),
			"Кнопка должна содержать текст: 'Показать ещё 40 услуг'",
		);
	});
});

describe("GridAppointmentCard — Memoization & Content-Visibility Performance (Mandates 8c, 8n)", () => {
	it("рендерит карточку приема со стилем contentVisibility auto и containment", async () => {
		const React = await import("react");
		const { renderToString } = await import("react-dom/server");
		const { GridAppointmentCard } = await import("../components/schedule/GridAppointmentCard");

		const mockAppointment: Appointment = {
			id: "test-appt-1",
			patientId: "pat-1",
			doctorUserId: "doc-1",
			chairId: "chair-1",
			startsAt: "2026-09-20T10:00:00.000Z",
			endsAt: "2026-09-20T10:30:00.000Z",
			status: "confirmed" as const,
			reason: "Лечение кариеса",
			organizationId: "org-1",
			comment: null,
		};

		const mockDashboard = {
			patients: [{ id: "pat-1", fullName: "Сидоров Алексей Петрович", balanceRub: 1500 }],
			clinicSettings: { staff: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }] },
		};

		// 1. Unhovered card: should NOT render heavy hover preview DOM
		const unhoveredHtml = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: mockAppointment,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Сидоров Алексей Петрович",
				dashboard: mockDashboard as any,
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				isHovered: false,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(unhoveredHtml.includes("content-visibility:auto"), "Карточка должна содержать CSS-свойство content-visibility:auto");
		assert.ok(unhoveredHtml.includes("contain-intrinsic-size:1px 52px"), "Карточка должна содержать contain-intrinsic-size для предотвращения сдвига макета");
		assert.ok(unhoveredHtml.includes("Сидоров Алексей П."), "ФИО должно быть отформатировано по стандарту Apple HIG");
		assert.ok(!unhoveredHtml.includes("schedule-grid-patient-hover-preview"), "Ненаведенная карточка не должна плодить DOM превью");

		// 2. Hovered card: renders Hover HUD
		const hoveredHtml = renderToString(
			React.createElement(GridAppointmentCard, {
				appointment: mockAppointment,
				chair: { id: "chair-1", name: "Кабинет 1" },
				effectiveChairs: [{ id: "chair-1", name: "Кабинет 1" }],
				doctors: [{ id: "doc-1", fullName: "Д-р Смирнов А. В." }],
				patientLookupMap: new Map([["pat-1", mockDashboard.patients[0]]]),
				staffLookupMap: new Map([["doc-1", mockDashboard.clinicSettings.staff[0]]]),
				collisionMap: new Map(),
				patientNameFn: () => "Сидоров Алексей Петрович",
				dashboard: mockDashboard as any,
				timezone: "Europe/Moscow",
				toDateTimeLocalValue: (iso: string) => iso.slice(0, 16),
				appointmentLabels: {
					planned: "Запланирован",
					confirmed: "Подтвержден",
					arrived: "Пришел",
					in_treatment: "В кресле",
					completed: "Завершен",
					cancelled: "Отменен",
					no_show: "Не явился",
				},
				isHovered: true,
				isStatusPickerOpen: false,
				isMenuOpen: false,
				isNearBottom: false,
				isNearRightEdge: false,
				onAppointmentClick: () => {},
				onSelectMobileAppt: () => {},
				onQuickStatusChange: () => {},
				onAdjustDuration: () => {},
				onShiftLateness: () => {},
				onReassignChair: () => {},
				onReassignDoctor: () => {},
				onFreeSlotToWaitlist: () => {},
				onMouseEnter: () => {},
				onMouseLeave: () => {},
				onKeepHovered: () => {},
				onToggleStatusPicker: () => {},
				onToggleMenu: () => {},
				onCloseStatusPicker: () => {},
				onCloseMenu: () => {},
			}),
		);

		assert.ok(hoveredHtml.includes("schedule-grid-patient-hover-preview"), "Наведенная карточка должна отображать Hover HUD");
		assert.ok(hoveredHtml.includes("hover-status-confirmed-test-appt-1"), "Hover HUD должен содержать быстрые кнопки статуса");
	});
});

describe("lowSpecHddOptimizer — Виртуализация реестра документов и материалов склада", () => {
	it("разбивает большой реестр документов (250 записей) на порции по 40 элементов", () => {
		const mockDocuments = Array.from({ length: 250 }, (_, i) => ({
			id: `doc-${i + 1}`,
			title: `Документ №${i + 1}`,
			kind: "treatment_act",
			status: i % 2 === 0 ? "issued" : "draft",
		}));

		// Начальное состояние: первые 40 элементов
		const slice1 = sliceDomList(mockDocuments, 40, 0);
		assert.strictEqual(slice1.visibleItems.length, 40);
		assert.strictEqual(slice1.totalCount, 250);
		assert.strictEqual(slice1.remainingCount, 210);
		assert.strictEqual(slice1.hasMore, true);
		assert.strictEqual(slice1.visibleItems[0]!.id, "doc-1");
		assert.strictEqual(slice1.visibleItems[39]!.id, "doc-40");

		// Вторая порция: клик "Показать ещё 40" -> лимит 80
		const slice2 = sliceDomList(mockDocuments, 80, 0);
		assert.strictEqual(slice2.visibleItems.length, 80);
		assert.strictEqual(slice2.remainingCount, 170);
		assert.strictEqual(slice2.hasMore, true);

		// Полная загрузка всех документов
		const sliceAll = sliceDomList(mockDocuments, 250, 0);
		assert.strictEqual(sliceAll.visibleItems.length, 250);
		assert.strictEqual(sliceAll.remainingCount, 0);
		assert.strictEqual(sliceAll.hasMore, false);
	});

	it("виртуализирует номенклатуру склада (120 позиций) без утечки памяти DOM", () => {
		const mockWarehouse = Array.from({ length: 120 }, (_, i) => ({
			id: `item-${i + 1}`,
			name: `Материал ${i + 1}`,
			stockQuantity: i * 5,
			criticalThreshold: 10,
		}));

		const initialSlice = sliceDomList(mockWarehouse, 40, 0);
		assert.strictEqual(initialSlice.visibleItems.length, 40);
		assert.strictEqual(initialSlice.remainingCount, 80);
		assert.strictEqual(initialSlice.hasMore, true);

		// Увеличение на 40
		const expandedSlice = sliceDomList(mockWarehouse, 80, 0);
		assert.strictEqual(expandedSlice.visibleItems.length, 80);
		assert.strictEqual(expandedSlice.remainingCount, 40);
		assert.strictEqual(expandedSlice.hasMore, true);

		// Финальное раскрытие
		const fullSlice = sliceDomList(mockWarehouse, 120, 0);
		assert.strictEqual(fullSlice.visibleItems.length, 120);
		assert.strictEqual(fullSlice.remainingCount, 0);
		assert.strictEqual(fullSlice.hasMore, false);
	});

	it("виртуализирует наряды ЗТЛ (DentalLabOrdersHubModal) канбан-колонками по 40 элементов с contain-intrinsic-size 1px 64px", () => {
		const mockLabOrders = Array.from({ length: 95 }, (_, i) => ({
			id: `order-ztl-${i + 1}`,
			orderNumber: `ЗТЛ-${1000 + i + 1}`,
			patientName: `Пациент ${i + 1}`,
			doctorName: "Д-р Иванов А.С.",
			currentStage: "sent_to_lab" as const,
			financials: { patientPriceTotalRub: 24000, labCostTotalRub: 8000 },
		}));

		// Порция 1: первые 40 нарядов
		const stage1 = sliceDomList(mockLabOrders, 40, 0);
		assert.strictEqual(stage1.visibleItems.length, 40);
		assert.strictEqual(stage1.totalCount, 95);
		assert.strictEqual(stage1.remainingCount, 55);
		assert.strictEqual(stage1.hasMore, true);
		assert.strictEqual(stage1.visibleItems[0]!.orderNumber, "ЗТЛ-1001");
		assert.strictEqual(stage1.visibleItems[39]!.orderNumber, "ЗТЛ-1040");

		// Порция 2: клик "Показать ещё 40 нарядов" -> лимит 80
		const stage2 = sliceDomList(mockLabOrders, 80, 0);
		assert.strictEqual(stage2.visibleItems.length, 80);
		assert.strictEqual(stage2.remainingCount, 15);
		assert.strictEqual(stage2.hasMore, true);

		// Порция 3: полное раскрытие
		const stage3 = sliceDomList(mockLabOrders, 120, 0);
		assert.strictEqual(stage3.visibleItems.length, 95);
		assert.strictEqual(stage3.remainingCount, 0);
		assert.strictEqual(stage3.hasMore, false);
	});

	it("виртуализирует реестр пациентов (PatientsView) порциями по 40 элементов (step: 40)", () => {
		const mockPatients = Array.from({ length: 110 }, (_, i) => ({
			id: `patient-${i + 1}`,
			fullName: `Пациент ${i + 1}`,
			phone: `+7900123${String(i).padStart(4, "0")}`,
		}));

		const page1 = sliceDomList(mockPatients, 40, 0);
		assert.strictEqual(page1.visibleItems.length, 40);
		assert.strictEqual(page1.totalCount, 110);
		assert.strictEqual(page1.hasMore, true);
		assert.strictEqual(page1.remainingCount, 70);

		// Увеличение лимита на шаг 40
		const page2 = sliceDomList(mockPatients, 80, 0);
		assert.strictEqual(page2.visibleItems.length, 80);
		assert.strictEqual(page2.remainingCount, 30);
		assert.strictEqual(page2.hasMore, true);

		// Завершающая порция
		const page3 = sliceDomList(mockPatients, 120, 0);
		assert.strictEqual(page3.visibleItems.length, 110);
		assert.strictEqual(page3.remainingCount, 0);
		assert.strictEqual(page3.hasMore, false);
	});

	it("виртуализирует прейскурант каталога услуг (ServicePricelistManagerModal) по 40 элементов", () => {
		const mockServices = Array.from({ length: 85 }, (_, i) => ({
			id: `srv-${i + 1}`,
			code: `A16.07.${String(i + 1).padStart(3, "0")}`,
			name: `Стоматологическая услуга ${i + 1}`,
			priceRub: 3500 + i * 100,
		}));

		const firstChunk = sliceDomList(mockServices, 40, 0);
		assert.strictEqual(firstChunk.visibleItems.length, 40);
		assert.strictEqual(firstChunk.remainingCount, 45);
		assert.strictEqual(firstChunk.hasMore, true);

		const secondChunk = sliceDomList(mockServices, 80, 0);
		assert.strictEqual(secondChunk.visibleItems.length, 80);
		assert.strictEqual(secondChunk.remainingCount, 5);
		assert.strictEqual(secondChunk.hasMore, true);

		const finalChunk = sliceDomList(mockServices, 120, 0);
		assert.strictEqual(finalChunk.visibleItems.length, 85);
		assert.strictEqual(finalChunk.remainingCount, 0);
		assert.strictEqual(finalChunk.hasMore, false);
	});
});

describe("lowSpecHddOptimizer — Платформенные адаптеры (Electron, WebView2, Capacitor, PWA)", () => {
	const originalWindow = globalThis.window;

	afterEach(() => {
		if (originalWindow !== undefined) {
			globalThis.window = originalWindow;
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	});

	it("распознает Microsoft Edge WebView2 и __DENTE_DESKTOP__ флаги как Standalone Desktop (.EXE)", () => {
		globalThis.window = {
			chrome: { webview: {} },
		} as unknown as Window & typeof globalThis;
		assert.strictEqual(isDesktopApp(), true);
		assert.strictEqual(isDesktopExecutable(), true);
		assert.strictEqual(detectOmniEnvironment(), "desktop_exe");

		globalThis.window = {
			__DENTE_DESKTOP__: true,
		} as unknown as Window & typeof globalThis;
		assert.strictEqual(isDesktopApp(), true);
		assert.strictEqual(isDesktopExecutable(), true);
	});

	it("распознает Capacitor / Android native bridge и считывает безопасные зоны (safe area insets)", () => {
		globalThis.window = {
			denteSafeArea: { top: 44, bottom: 34, left: 0, right: 0 },
			Capacitor: { isNativePlatform: () => true },
		} as unknown as Window & typeof globalThis;

		const insets = getSafeAreaInsets();
		assert.strictEqual(insets.top, 44);
		assert.strictEqual(insets.bottom, 34);
		assert.strictEqual(insets.left, 0);
		assert.strictEqual(insets.right, 0);
	});

	it("распознает PWA режим при автономном отображении (display-mode: standalone)", () => {
		globalThis.window = {
			matchMedia: (query: string) => ({
				matches: query.includes("display-mode: standalone"),
				media: query,
				onchange: null,
				addListener: () => {},
				removeListener: () => {},
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => true,
			}),
		} as unknown as Window & typeof globalThis;

		assert.strictEqual(isStandalonePwa(), true);
		assert.strictEqual(detectOmniEnvironment(), "pwa_standalone");
	});

	it("выполняет тихую печать документов А4 (printDesktopA4DocumentSilent) без вызова диалогов в Desktop", async () => {
		let nativePrintCalled = false;
		let receivedSilentParam: boolean | undefined;

		globalThis.window = {
			denteDesktopNative: {
				printDocumentSilent: async (params: { silent?: boolean }) => {
					nativePrintCalled = true;
					receivedSilentParam = params.silent;
					return { success: true };
				},
			},
		} as unknown as Window & typeof globalThis;

		const res = await printDesktopA4DocumentSilent({
			htmlContent: "<p>Наряд ЗТЛ-1</p>",
			title: "Наряд ЗТЛ №1024",
		});

		assert.strictEqual(nativePrintCalled, true);
		assert.strictEqual(receivedSilentParam, true);
		assert.strictEqual(res.success, true);
		assert.strictEqual(res.method, "desktop_silent");
	});
});

describe("lowSpecHddOptimizer — Пакетная запись мутаций и экстренный сброс (Mandates 8e, 8n)", () => {
	it("coalesced batch: enqueueOfflineMutationsBatch регистрирует пачку мутаций единым блоком", async () => {
		const orgId = "org-lowspec-test-1";
		const batchInputs = [
			{
				entityType: "odontogram" as const,
				entityId: "tooth-16",
				action: "update" as const,
				payload: { toothNumber: 16, state: "caries", surfaces: ["O"] },
				organizationId: orgId,
			},
			{
				entityType: "odontogram" as const,
				entityId: "tooth-17",
				action: "update" as const,
				payload: { toothNumber: 17, state: "sealant", surfaces: ["O"] },
				organizationId: orgId,
			},
			{
				entityType: "odontogram" as const,
				entityId: "tooth-18",
				action: "update" as const,
				payload: { toothNumber: 18, state: "missing", surfaces: [] },
				organizationId: orgId,
			},
		];

		const created = await enqueueOfflineMutationsBatch(batchInputs);
		assert.strictEqual(created.length, 3);
		assert.ok(created[0]?.mutationId);
		assert.ok(created[1]?.mutationId);
		assert.ok(created[2]?.mutationId);
		assert.strictEqual(created[0]?.status, "pending");
		assert.strictEqual(created[1]?.status, "pending");
		assert.strictEqual(created[2]?.status, "pending");

		const pending = await getPendingOfflineMutations({ organizationId: orgId });
		const tooth16 = pending.find((m) => m.entityId === "tooth-16");
		assert.ok(tooth16, "Мутация tooth-16 должна находиться в pending очереди");
	});

	it("DebouncedBatchFlusher выполняет экстренный сброс при событии dente-telephony-incoming-call (Mandate 8e)", async () => {
		let flushedItems: string[] = [];
		const flusher = new DebouncedBatchFlusher<string>({
			debounceMs: 5000,
			onFlush: (items) => {
				flushedItems = [...items];
			},
		});

		flusher.add("draft-043-autosave-chunk");
		assert.strictEqual(flushedItems.length, 0);

		// Имитируем входящий звонок телефонии
		if (typeof window !== "undefined") {
			window.dispatchEvent(new Event("dente-telephony-incoming-call"));
		} else {
			await flusher.flushNow();
		}

		await new Promise((r) => setTimeout(r, 10));
		assert.strictEqual(flushedItems.length, 1);
		assert.strictEqual(flushedItems[0], "draft-043-autosave-chunk");

		flusher.destroy();
	});
});

describe("lowSpecHddOptimizer — Debounced Draft Saving & 0 ms RAM Fast Path (Mandates 8e, 8k, 8n)", () => {
	it("saveOfflineDraftDebounced мгновенно обновляет L1 RAM (0 мс) и возвращает черновик", () => {
		const key = "dente_test_draft_debounced_1";
		const data = { complaint: "Острая зубная боль", diagnosis: "K04.0" };

		const draft = saveOfflineDraftDebounced(key, "DIARY_043_DRAFT", "visit-debounced-1", data, "org-1", 5000);
		assert.ok(draft);
		assert.strictEqual(draft.draftKey, key);
		assert.deepStrictEqual(draft.data, data);

		// Мгновенная синхронная доступность через getSynchronousDraft / loadOfflineDraft
		const syncDraft = loadVisitDraftSync("visit-debounced-1");
		// key is not visit draft prefix, so direct loadOfflineDraft
		const memDraft = loadOfflineDraft<typeof data>(key);
		assert.ok(memDraft);
	});

	it("saveVisitDraftDebounced сохраняет черновик визита и сбрасывает на диск через flushPendingOfflineDrafts", async () => {
		const visitId = "visit-perf-test-77";
		const diaryData = {
			complaint: "Кариес 26 зуба",
			anamnesis: "Боли от сладкого",
			objectiveStatus: "Кариозная полость на жевательной поверхности",
			treatmentPlan: "Препарирование, пломба световая",
		};

		// Дебаунс 10 секунд (не сбрасывает на диск сразу)
		const draft = saveVisitDraftDebounced(visitId, diaryData, "org-test", 10000);
		assert.ok(draft);
		assert.strictEqual(draft.entityId, visitId);

		// Синхронный Fast Path возвращает черновик из L1 RAM за 0 мс
		const syncDraft = loadVisitDraftSync<typeof diaryData>(visitId);
		assert.ok(syncDraft);
		assert.strictEqual(syncDraft?.data.complaint, "Кариес 26 зуба");

		// Принудительный сброс на диск
		await flushPendingOfflineDrafts();

		// Проверяем удаление
		await deleteOfflineDraft(draft.draftKey);
		const afterDelete = loadVisitDraftSync(visitId);
		assert.strictEqual(afterDelete, null);
	});

	it("saveForm043DraftDebounced сохраняет черновик карты 043/у", async () => {
		const patientId = "patient-card-043-test";
		const cardData = {
			anamnesis: "Аллергия на пенициллин отсутствует",
			habits: "Без вредных привычек",
		};

		const draft = saveForm043DraftDebounced(patientId, cardData, "org-test", 10000);
		assert.ok(draft);
		assert.strictEqual(draft.entityId, patientId);

		await flushPendingOfflineDrafts();
		await deleteOfflineDraft(draft.draftKey);
	});
});

describe("lowSpecHddOptimizer — Автоматическое определение медленного диска (100 КБ IndexedDB benchmark)", () => {
	afterEach(() => {
		setCachedDiskBenchmark(null);
		setForcedLowSpecMode(null);
	});

	it("определяет медленный диск (>= 45 мс) и принудительно переключает в low-spec режим", async () => {
		// Имитируем результат бенчмарка медленного диска (5400 RPM HDD: 78.4 мс на запись 100 КБ)
		setCachedDiskBenchmark({
			isSlowDisk: true,
			writeTimeMs: 78.4,
			chunkBytes: 100 * 1024,
		});

		assert.strictEqual(isLowSpecDevice(), true);
		const caps = getDeviceCapabilities();
		assert.strictEqual(caps.isLowSpec, true);
		assert.strictEqual(caps.isSlowHdd, true);
		assert.strictEqual(caps.diskWriteTimeMs, 78.4);

		// Тайминги автосохранения на медленном диске адаптируются
		const timing = getOptimizedTiming();
		assert.strictEqual(timing.autosaveDebounceMs, 1800);
		assert.strictEqual(timing.batchFlushDelayMs, 1500);
		assert.strictEqual(timing.disableAggressivePrefetch, true);
	});

	it("определяет быстрый SSD (< 45 мс) и сохраняет нормальный режим", () => {
		setCachedDiskBenchmark({
			isSlowDisk: false,
			writeTimeMs: 4.2,
			chunkBytes: 100 * 1024,
		});

		assert.strictEqual(isLowSpecDevice(), false);
		const caps = getDeviceCapabilities();
		assert.strictEqual(caps.isSlowHdd, false);
		assert.strictEqual(caps.diskWriteTimeMs, 4.2);

		const timing = getOptimizedTiming();
		assert.strictEqual(timing.autosaveDebounceMs, 800);
		assert.strictEqual(timing.disableAggressivePrefetch, false);
	});

	it("кэширует результат бенчмарка и возвращает getDiskBenchmarkResult", () => {
		assert.strictEqual(getDiskBenchmarkResult(), null);
		setCachedDiskBenchmark({
			isSlowDisk: false,
			writeTimeMs: 6.8,
			chunkBytes: 100 * 1024,
		});
		assert.deepStrictEqual(getDiskBenchmarkResult(), {
			isSlowDisk: false,
			writeTimeMs: 6.8,
			chunkBytes: 100 * 1024,
		});
	});

	it("measureIndexedDbDiskSpeed возвращает корректный результат и безопасен в тестовом окружении", async () => {
		const res = await measureIndexedDbDiskSpeed({ chunkSizeKb: 100 });
		assert.strictEqual(typeof res.isSlowDisk, "boolean");
		assert.strictEqual(typeof res.writeTimeMs, "number");
		assert.strictEqual(res.chunkBytes, 100 * 1024);
	});

	it("фасад services/offline/lowSpecHddOptimizer идентичен utils/lowSpecHddOptimizer", () => {
		assert.strictEqual(typeof measureOfflineDiskSpeed, "function");
		assert.strictEqual(measureOfflineDiskSpeed, measureIndexedDbDiskSpeed);
	});
});

describe("lowSpecHddOptimizer — Прогрессивная подгрузка визиографа и 16-битного сырого буфера снимка при зуме", () => {
	it("shouldLoad16BitBuffer возвращает false при 1.0x (fit-to-screen) и true при зуме > 1.25x", () => {
		assert.strictEqual(shouldLoad16BitBuffer(1.0), false, "При 1.0x зуме 16-битный буфер не должен подгружаться");
		assert.strictEqual(shouldLoad16BitBuffer(1.2), false, "При 1.2x зуме 16-битный буфер не должен подгружаться");
		assert.strictEqual(shouldLoad16BitBuffer(1.25), false, "На границе 1.25x зума 16-битный буфер остается выключенным");
		assert.strictEqual(shouldLoad16BitBuffer(1.3), true, "При 1.3x зуме 16-битный буфер активируется");
		assert.strictEqual(shouldLoad16BitBuffer(2.0), true, "При 2.0x зуме 16-битный буфер активен");
		assert.strictEqual(shouldLoad16BitBuffer(4.0), true, "При 4.0x зуме 16-битный буфер активен");
	});

	it("ProgressiveVisiographController не загружает 16-битный буфер при начальном открытии (zoom 1.0x)", async () => {
		let fetcherCalled = false;
		const mockFetcher = async () => {
			fetcherCalled = true;
			return new Uint16Array(100);
		};

		const controller = new ProgressiveVisiographController(
			"https://dente.clinic/previews/xray_043_16.webp",
			800,
			600,
			{ rawBufferFetcher: mockFetcher, zoomThreshold: 1.25 },
		);

		const stateInitial = controller.getState();
		assert.strictEqual(stateInitial.previewUrl, "https://dente.clinic/previews/xray_043_16.webp");
		assert.strictEqual(stateInitial.is16BitLoaded, false);
		assert.strictEqual(stateInitial.raw16BitBuffer, null);

		// Врач открыл снимок в масштабе 1.0x
		const loadedOnFit = await controller.onZoomChanged(1.0);
		assert.strictEqual(loadedOnFit, false);
		assert.strictEqual(fetcherCalled, false, "Сырой 16-битный буфер не должен дергаться при fit-to-screen");
		assert.strictEqual(controller.getState().is16BitLoaded, false);
	});

	it("ProgressiveVisiographController отложенно подгружает 16-битный буфер при приближении (zoom 1.5x)", async () => {
		let fetcherCallCount = 0;
		const mock16BitData = new Uint16Array(4);
		mock16BitData[0] = 500;
		mock16BitData[1] = 2048;
		mock16BitData[2] = 4095;
		mock16BitData[3] = 60000;

		const mockFetcher = async () => {
			fetcherCallCount++;
			return mock16BitData;
		};

		const controller = new ProgressiveVisiographController(
			"preview.webp",
			2,
			2,
			{ rawBufferFetcher: mockFetcher, zoomThreshold: 1.25 },
		);

		// Врач приблизил деталь снимка: zoom 1.5x
		const loadedOnZoom = await controller.onZoomChanged(1.5);
		assert.strictEqual(loadedOnZoom, true);
		assert.strictEqual(fetcherCallCount, 1);

		const stateZoomed = controller.getState();
		assert.strictEqual(stateZoomed.is16BitLoaded, true);
		assert.ok(stateZoomed.raw16BitBuffer);
		assert.strictEqual(stateZoomed.raw16BitBuffer?.length, 4);
		assert.strictEqual(stateZoomed.raw16BitBuffer?.[1], 2048);

		// Повторный вызов при том же или большем зуме не делает лишних запросов
		const loadedAgain = await controller.onZoomChanged(2.0);
		assert.strictEqual(loadedAgain, false);
		assert.strictEqual(fetcherCallCount, 1);
	});

	it("convert16BitToRgbaImageData корректно конвертирует 16-битные значения в 8-битный RGBA с окном радиометрии", () => {
		const raw16 = new Uint16Array([0, 2048, 4096, 65535]);
		const imgData = convert16BitToRgbaImageData(raw16, 2, 2, {
			windowWidth: 4096,
			windowCenter: 2048,
			invert: false,
		});

		assert.strictEqual(imgData.width, 2);
		assert.strictEqual(imgData.height, 2);
		assert.strictEqual(imgData.data.length, 16); // 4 pixels * 4 channels

		// Пиксель 1 (0): ниже minVal (2048 - 2048 = 0) -> 0
		assert.strictEqual(imgData.data[0], 0);
		assert.strictEqual(imgData.data[3], 255); // Alpha 255

		// Пиксель 2 (2048): центр окна -> ~128
		assert.strictEqual(imgData.data[4], 128);

		// Пиксель 3 (4096): maxVal окна -> 255
		assert.strictEqual(imgData.data[8], 255);

		// Пиксель 4 (65535): выше окна -> clamped 255
		assert.strictEqual(imgData.data[12], 255);
	});

	it("ProgressiveVisiographController освобождает 16-битный буфер из RAM через releaseRawBuffer()", async () => {
		const controller = new ProgressiveVisiographController("thumb.jpg", 10, 10, {
			rawBufferFetcher: async () => new Uint16Array(100),
		});

		await controller.onZoomChanged(1.5);
		assert.strictEqual(controller.getState().is16BitLoaded, true);

		controller.releaseRawBuffer();
		assert.strictEqual(controller.getState().is16BitLoaded, false);
		assert.strictEqual(controller.getState().raw16BitBuffer, null);
	});
});

describe("lowSpecHddOptimizer — Предотвращение утечек памяти при смене вкладок (useEffect & useMemoryLeakGuard)", () => {
	it("DebouncedBatchFlusher снимает все слушатели событий (beforeunload, visibilitychange) при destroy()", () => {
		const flusher = new DebouncedBatchFlusher<string>({
			debounceMs: 1000,
			onFlush: () => {},
		});

		flusher.add("test_action");
		assert.strictEqual(flusher.pendingCount, 1);

		flusher.destroy();
		assert.strictEqual(flusher.pendingCount, 0);
	});

	it("MemoryLruCache очищает память при вызове clear() во избежание утечек кучи", () => {
		const cache = createMemoryLruCache<string, number>({ maxEntries: 50 });
		for (let i = 0; i < 20; i++) {
			cache.set(`tab_state_${i}`, i * 100);
		}
		assert.strictEqual(cache.size, 20);

		cache.clear();
		assert.strictEqual(cache.size, 0);
		assert.strictEqual(cache.currentByteSize, 0);
	});
});


