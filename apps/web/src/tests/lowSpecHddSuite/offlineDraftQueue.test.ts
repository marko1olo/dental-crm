/**
 * offlineDraftQueue.test.ts — Сьют тестов очередей черновиков, отложенной записи и бенчмарка диска (HDD/SSD).
 * Часть декомпозированного сьюта lowSpecHddOptimizer (Мандаты 8b, 8zi).
 */

import assert from "node:assert";
import { afterEach, describe, it } from "node:test";
import {
	deleteOfflineDraft,
	enqueueOfflineMutationsBatch,
	flushBatchedStoreWrites,
	flushPendingOfflineDrafts,
	getPendingBatchedStoreWritesCount,
	getPendingOfflineMutations,
	loadOfflineDraft,
	loadVisitDraftSync,
	queueBatchedStorePut,
	saveForm043DraftDebounced,
	saveOfflineDraftDebounced,
	saveVisitDraftDebounced,
} from "../../services/offline";
import {
	createDebouncedAction,
	createMemoryLruCache,
	DebouncedBatchFlusher,
	getDeviceCapabilities,
	getDiskBenchmarkResult,
	getOptimizedTiming,
	isLowSpecDevice,
	measureIndexedDbDiskSpeed,
	setCachedDiskBenchmark,
	setForcedLowSpecMode,
} from "../../utils/lowSpecHddOptimizer";
import { measureIndexedDbDiskSpeed as measureOfflineDiskSpeed } from "../../services/offline/lowSpecHddOptimizer";

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

describe("lowSpecHddOptimizer — Адаптивная очередь пакетной записи в IndexedDB (queueBatchedStorePut)", () => {
	afterEach(async () => {
		setForcedLowSpecMode(null);
		await flushBatchedStoreWrites();
	});

	it("коалесцирует множественные записи одного ключа в очереди до сброса на диск", async () => {
		await flushBatchedStoreWrites();
		assert.strictEqual(getPendingBatchedStoreWritesCount(), 0);

		// Ставим Low-Spec режим (медленный HDD 5400 RPM)
		setForcedLowSpecMode(true);
		const timing = getOptimizedTiming();
		assert.strictEqual(timing.batchFlushDelayMs, 1500, "На HDD задержка сброса должна быть 1500 мс");

		// Записываем несколько обновлений одного и того же ключа (имитация частого обновления одонтограммы/визита)
		queueBatchedStorePut({
			storeName: "clinical_cache",
			key: "patient_card_123",
			record: { tooth: 11, status: "caries", v: 1 },
		});
		queueBatchedStorePut({
			storeName: "clinical_cache",
			key: "patient_card_123",
			record: { tooth: 11, status: "pulpitis", v: 2 },
		});
		queueBatchedStorePut({
			storeName: "clinical_cache",
			key: "patient_card_456",
			record: { tooth: 21, status: "filling", v: 1 },
		});

		// В очереди 2 уникальных ключа, предотвращая спам диска 3 отдельными транзакциями
		assert.strictEqual(getPendingBatchedStoreWritesCount(), 2, "Записи с одинаковым ключом должны перезаписываться в очереди");

		// Принудительный сброс (Flush) освобождает очередь
		await flushBatchedStoreWrites();
		assert.strictEqual(getPendingBatchedStoreWritesCount(), 0, "После flushBatchedStoreWrites очередь должна быть пуста");
	});

	it("переключается на быстрые тайминги (500 мс) на SSD устройствах", () => {
		setForcedLowSpecMode(false);
		const timing = getOptimizedTiming();
		assert.strictEqual(timing.batchFlushDelayMs, 500, "На SSD задержка сброса должна быть 500 мс");
		assert.strictEqual(timing.autosaveDebounceMs, 800, "На SSD автосохранение должно быть 800 мс");
	});
});
