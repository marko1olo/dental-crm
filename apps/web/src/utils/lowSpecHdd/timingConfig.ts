/**
 * lowSpecHdd/timingConfig.ts — адаптивные интервалы времени и лимиты кэша под текущее железо.
 * Layer 2: Domain timing logic.
 */

import type { OptimizedTimingConfig } from "./types.js";
import { isLowSpecDevice } from "./hardwareDetector.js";

/**
 * Возвращает адаптированные интервалы времени и лимиты кэша под текущее железо.
 */
export function getOptimizedTiming(): OptimizedTimingConfig {
	const isLow = isLowSpecDevice();

	if (isLow) {
		return {
			// На медленных HDD интервал 1800 мс предотвращает троттлинг диска при наборе текста врачом
			autosaveDebounceMs: 1800,
			// Снижает нагрузку на слабый CPU при фильтрации номенклатуры (250–350ms по Мандатам 8s, 8e)
			searchDebounceMs: 350,
			// Группировка мутаций снижает число случайных операций ввода-вывода (I/O)
			batchFlushDelayMs: 1500,
			// Редкая фоновая синхронизация, чтобы не забивать диск
			backgroundSyncIntervalMs: 120_000,
			// Компактный размер кэша для сохранения RAM при 2-4 ГБ
			maxLruCacheEntries: 300,
			// Максимальный размер кэша в RAM (35 МБ — строго < 40 МБ для low-spec ПК с 4GB RAM)
			maxLruCacheBytes: 35 * 1024 * 1024,
			// 5 минут TTL по умолчанию
			defaultCacheTtlMs: 300_000,
			// Отключение агрессивной предзагрузки
			disableAggressivePrefetch: true,
			// Фоновая очистка устаревших по TTL записей каждую минуту
			cachePruneIntervalMs: 60_000,
		};
	}

	return {
		autosaveDebounceMs: 800,
		// Дебаунс поиска 280 мс предотвращает спам диска и сети при вводе символов (Мандаты 8s, 8e)
		searchDebounceMs: 280,
		batchFlushDelayMs: 500,
		backgroundSyncIntervalMs: 30_000,
		maxLruCacheEntries: 1200,
		maxLruCacheBytes: 100 * 1024 * 1024,
		defaultCacheTtlMs: 300_000,
		disableAggressivePrefetch: false,
		cachePruneIntervalMs: 60_000,
	};
}

/**
 * Хелпер для быстрого получения конкретного интервала дебаунса по типу действия.
 */
export function getDebounceInterval(
	type: "autosave" | "search" | "batchFlush" | "backgroundSync" = "autosave",
): number {
	const timing = getOptimizedTiming();
	switch (type) {
		case "autosave":
			return timing.autosaveDebounceMs;
		case "search":
			return timing.searchDebounceMs;
		case "batchFlush":
			return timing.batchFlushDelayMs;
		case "backgroundSync":
			return timing.backgroundSyncIntervalMs;
		default:
			return timing.autosaveDebounceMs;
	}
}
