/**
 * catalogWarmup.ts — Layer 3.5: Гидратация и прогрев регламентных справочников клиники.
 *
 * Наполняет L1 RAM кэш данными из IndexedDB при старте приложения (0 мс seek time)
 * и осуществляет фоновый прогрев нормативной базы Минздрава 804н, МКБ-10 и шаблонов 043/у.
 */

import type {
	CachedApiResponse,
	WarmupCatalogResult,
} from "./types";
import {
	CATALOG_STORE_NAME,
	openCatalogDb,
} from "./persistentStorage";
import {
	getApiCache,
	getCachedApiResponse,
	setCachedApiResponse,
} from "./cacheEngineCore";

/**
 * Гидратирует сохраненные справочники из IndexedDB в оперативную память (L1 RAM кэш).
 * Обеспечивает 0 мс seek time при старте приложения даже при медленном HDD 5400 RPM.
 */
export async function hydrateCatalogsFromPersistentStorage(): Promise<number> {
	let hydratedCount = 0;
	const db = await openCatalogDb();
	if (db) {
		try {
			const entries = await new Promise<CachedApiResponse<unknown>[]>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readonly");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as CachedApiResponse<unknown>[]) : []);
				req.onerror = () => resolve([]);
			});

			const now = Date.now();
			let count = 0;
			for (const entry of entries) {
				if (entry && entry.url) {
					if (entry.ttlMs === null || now <= entry.timestamp + entry.ttlMs) {
						if (!getApiCache().has(entry.url)) {
							getApiCache().set(entry.url, entry, entry.ttlMs);
							hydratedCount++;
						}
						// Synchronize L1 RAM statutory catalog cache for instant 0 ms access
						if (Array.isArray(entry.data) && entry.data.length > 0) {
							if (entry.url === "/api/clinical/804n" || entry.url === "/api/clinical/nomenclature") {
								try {
									const { setStatutoryCatalogInRam } = await import("../../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("804n", entry.data as unknown[]);
								} catch {
									// ignore
								}
							} else if (entry.url === "/api/clinical/icd10" || entry.url === "/api/icd10") {
								try {
									const { setStatutoryCatalogInRam } = await import("../../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("icd10", entry.data as unknown[]);
								} catch {
									// ignore
								}
							} else if (entry.url === "/api/templates" || entry.url === "/api/emr/templates") {
								try {
									const { setStatutoryCatalogInRam } = await import("../../services/storage/statutoryCatalogCache");
									setStatutoryCatalogInRam("templates", entry.data as unknown[]);
								} catch {
									// ignore
								}
							}
						}
					}
				}
				if (++count % 25 === 0) {
					// Yield to main thread on Celeron CPU to prevent UI micro-stutters
					await new Promise((resolve) => {
						if (typeof window !== "undefined" && "requestIdleCallback" in window) {
							window.requestIdleCallback(() => resolve(undefined), { timeout: 16 });
						} else {
							setTimeout(resolve, 0);
						}
					});
				}
			}
		} catch {
			// ignore
		}
	}

	return hydratedCount;
}

/**
 * Прогрев и наполнение регламентных справочников (Номенклатура 804н, МКБ-10, шаблоны 043/у)
 * в фоновом режиме (requestIdleCallback) с обязательным кэшированием в IndexedDB.
 * Гарантирует, что переключение вкладок на бюджетных ПК с медленным 5400 RPM HDD
 * не вызывает дискового троттлинга (HDD Thrashing) и блокирующих ожиданий.
 */
export async function warmupStatutoryCatalogs(): Promise<WarmupCatalogResult> {
	// 1. Сначала поднимаем всё, что уже сохранено в IndexedDB, в L1 RAM кэш (0 мс доступ)
	const hydratedFromStorage = await hydrateCatalogsFromPersistentStorage();
	let newlySeeded = 0;

	// 2. Список ключевых регламентных справочников, необходимых врачу и регистратору
	const statutoryUrls = [
		"/api/clinical/804n",
		"/api/clinical/nomenclature",
		"/api/clinical/icd10",
		"/api/icd10",
		"/api/templates",
		"/api/emr/templates",
		"/api/catalog",
		"/api/price-lists",
		"/api/pharmacology/references",
		"/api/pharmacology/medications",
	];

	// Проверяем, есть ли отсутствующие справочники в L1 кэше
	const missingUrls = statutoryUrls.filter((url) => {
		const cached = getCachedApiResponse(url);
		return !cached;
	});

	if (missingUrls.length > 0) {
		// Ленивый импорт канонических данных во время idle (не раздувает стартовый бандл)
		try {
			// 2.1 Номенклатура 804н и каталог услуг
			if (
				missingUrls.includes("/api/clinical/804n") ||
				missingUrls.includes("/api/clinical/nomenclature") ||
				missingUrls.includes("/api/catalog") ||
				missingUrls.includes("/api/price-lists")
			) {
				const { STATUTORY_804N_NOMENCLATURE } = await import(
					"../../components/insurance/dmsInsurancePresets"
				);
				if (STATUTORY_804N_NOMENCLATURE && STATUTORY_804N_NOMENCLATURE.length > 0) {
					if (!getCachedApiResponse("/api/clinical/804n")) {
						setCachedApiResponse("/api/clinical/804n", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/clinical/nomenclature")) {
						setCachedApiResponse("/api/clinical/nomenclature", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/catalog")) {
						setCachedApiResponse("/api/catalog", STATUTORY_804N_NOMENCLATURE, {
							ttlMs: 15 * 60 * 1000,
						});
						newlySeeded++;
					}
				}
			}

			// 2.2 Справочник диагнозов МКБ-10
			if (
				missingUrls.includes("/api/clinical/icd10") ||
				missingUrls.includes("/api/icd10")
			) {
				const { ICD10_DICTIONARY } = await import("../icd10");
				if (ICD10_DICTIONARY && ICD10_DICTIONARY.length > 0) {
					if (!getCachedApiResponse("/api/clinical/icd10")) {
						setCachedApiResponse("/api/clinical/icd10", ICD10_DICTIONARY, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/icd10")) {
						setCachedApiResponse("/api/icd10", ICD10_DICTIONARY, {
							ttlMs: 30 * 60 * 1000,
						});
						newlySeeded++;
					}
				}
			}

			// 2.3 Шаблоны дневников ЭМК (043/у)
			if (
				missingUrls.includes("/api/templates") ||
				missingUrls.includes("/api/emr/templates")
			) {
				const { CLINICAL_1CLICK_TEMPLATES_CATALOG } = await import(
					"../../components/emr/templates/clinicalDiaryTemplatesEngine"
				);
				if (
					CLINICAL_1CLICK_TEMPLATES_CATALOG &&
					CLINICAL_1CLICK_TEMPLATES_CATALOG.length > 0
				) {
					if (!getCachedApiResponse("/api/templates")) {
						setCachedApiResponse("/api/templates", CLINICAL_1CLICK_TEMPLATES_CATALOG, {
							ttlMs: 20 * 60 * 1000,
						});
						newlySeeded++;
					}
					if (!getCachedApiResponse("/api/emr/templates")) {
						setCachedApiResponse(
							"/api/emr/templates",
							CLINICAL_1CLICK_TEMPLATES_CATALOG,
							{ ttlMs: 20 * 60 * 1000 },
						);
						newlySeeded++;
					}
				}
			}
		} catch {
			// Игнорируем ошибку динамической загрузки fallback справочников
		}

		// 2.4 Гарантированное сохранение в хранилище IndexedDB для 0 мс запуска на 5400 RPM HDD
		try {
			const { seedAllStatutoryCatalogsInIndexedDb } = await import(
				"../../services/storage/statutoryCatalogCache"
			);
			void seedAllStatutoryCatalogsInIndexedDb().catch(() => {});
		} catch {
			// Игнорируем ошибку фонового сидирования
		}
	}

	// 3. Если устройство онлайн, планируем тихое фоновое обновление через requestIdleCallback без блокировки UI
	if (
		typeof window !== "undefined" &&
		typeof navigator !== "undefined" &&
		navigator.onLine
	) {
		const refreshOnline = async () => {
			const urlsToRefresh = [
				"/api/clinical/804n",
				"/api/clinical/icd10",
				"/api/templates",
				"/api/catalog",
			];
			for (const url of urlsToRefresh) {
				try {
					const res = await fetch(url, { cache: "no-cache" });
					if (res.ok) {
						const json = await res.json();
						setCachedApiResponse(url, json);
					}
				} catch {
					// Офлайн или серверная ошибка — не прерываем работу
				}
				// Дозируем I/O на HDD 5400 RPM: пауза между запросами для сохранения отзывчивости диска
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		};

		const idleWin = window as Window & {
			requestIdleCallback?: (
				cb: () => void,
				opts?: { timeout: number },
			) => number;
		};
		if (idleWin.requestIdleCallback) {
			idleWin.requestIdleCallback(() => void refreshOnline(), {
				timeout: 12000,
			});
		} else {
			window.setTimeout(() => void refreshOnline(), 6000);
		}
	}

	return {
		hydratedFromStorage,
		newlySeeded,
	};
}
