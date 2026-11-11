/**
 * apiCacheEngine.test.ts — Сьют In-Memory LRU кэша API, инвалидации при мутациях, токенов и прогрессивной подгрузки визиографа.
 * Часть декомпозированного сьюта lowSpecHddOptimizer (Мандаты 8b, 8zi).
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import {
	clearCachedAuthTokens,
	getCachedAuthTokens,
	setCachedAuthTokens,
	shouldAttachApiAuth,
} from "../../lib/apiAuthFetch";
import {
	clearApiCache,
	createResponseFromCachedEntry,
	getApiCache,
	getApiCacheStats,
	getCachedApiResponse,
	isCacheableCatalogUrl,
	notifyApiMutation,
	setCachedApiResponse,
} from "../../lib/apiCacheEngine";
import {
	getCached804nSync,
	getCachedIcd10Sync,
	getCachedTemplatesSync,
	setStatutoryCatalogInRam,
} from "../../services/storage/statutoryCatalogCache";
import {
	createMemoryLruCache,
	getDeviceCapabilities,
	getOptimizedTiming,
	isLowSpecDevice,
	MemoryLruCache,
	setForcedLowSpecMode,
} from "../../utils/lowSpecHddOptimizer";
import {
	convert16BitToRgbaImageData,
	ProgressiveVisiographController,
	shouldLoad16BitBuffer,
} from "../../components/radiology/radiologyProgressiveLoader.js";

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
		if (typeof (globalThis as any).ImageData === "undefined") {
			(globalThis as any).ImageData = class MockImageData {
				data: Uint8ClampedArray;
				width: number;
				height: number;
				constructor(data: Uint8ClampedArray, width: number, height: number) {
					this.data = data;
					this.width = width;
					this.height = height;
				}
			};
		}
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
