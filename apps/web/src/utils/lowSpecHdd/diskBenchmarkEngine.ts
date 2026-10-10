/**
 * lowSpecHdd/diskBenchmarkEngine.ts — бенчмарк скорости случайной записи в IndexedDB.
 * Layer 3: I/O profiling & hardware qualification.
 */

import type { DiskBenchmarkOptions, DiskBenchmarkResult } from "./types.js";
import {
	getDiskBenchmarkResult,
	setCachedDiskBenchmark,
} from "./benchmarkStore.js";
import { isLowSpecDevice } from "./hardwareDetector.js";

/**
 * Автоматическое определение медленного диска (HDD 5400 RPM vs SSD) по времени
 * записи 100 КБ чанка в IndexedDB.
 *
 * Обоснование:
 * На механическом HDD (5400 RPM) время позиционирования головки (seek time)
 * и запись случайного 100 КБ блока в IndexedDB занимает >= 45-50 мс.
 * На SSD или NVMe накопителях та же операция занимает 1-8 мс.
 *
 * Если запись длится более 45 мс, система автоматически включает флаг Low-Spec,
 * отключая тяжелый I/O, увеличивая задержки дебаунса до 1800 мс и активируя
 * аппаратный профиль без backdrop-filter и теней.
 */
export async function measureIndexedDbDiskSpeed(
	options?: DiskBenchmarkOptions,
): Promise<DiskBenchmarkResult> {
	const cached = getDiskBenchmarkResult();
	if (cached !== null && !options?.forceRetest) {
		return cached;
	}

	const chunkSizeKb = options?.chunkSizeKb ?? 100;
	const slowThresholdMs = options?.slowThresholdMs ?? 45;
	const chunkBytes = chunkSizeKb * 1024;

	if (
		typeof window === "undefined" ||
		typeof window.indexedDB === "undefined" ||
		typeof window.indexedDB.open !== "function"
	) {
		const fallback: DiskBenchmarkResult = {
			isSlowDisk: isLowSpecDevice(),
			writeTimeMs: 0,
			chunkBytes,
		};
		setCachedDiskBenchmark(fallback);
		return fallback;
	}

	return new Promise<DiskBenchmarkResult>((resolve) => {
		try {
			const dbName = "dente_hdd_perf_probe_db";
			const storeName = "perf_probe_store";
			const openReq = window.indexedDB.open(dbName, 1);

			openReq.onupgradeneeded = () => {
				const db = openReq.result;
				if (!db.objectStoreNames.contains(storeName)) {
					db.createObjectStore(storeName, { keyPath: "id" });
				}
			};

			openReq.onerror = () => {
				const res: DiskBenchmarkResult = {
					isSlowDisk: isLowSpecDevice(),
					writeTimeMs: 0,
					chunkBytes,
					error: openReq.error?.message ?? "IndexedDB open error",
				};
				setCachedDiskBenchmark(res);
				resolve(res);
			};

			openReq.onsuccess = () => {
				const db = openReq.result;
				try {
					const payload = new Uint8Array(chunkBytes);
					for (let i = 0; i < Math.min(chunkBytes, 1024); i++) {
						payload[i] = (i * 31) & 0xff;
					}

					const startMs = performance.now();
					const tx = db.transaction([storeName], "readwrite");
					const store = tx.objectStore(storeName);

					store.put({
						id: "probe_100kb",
						data: payload,
						timestamp: Date.now(),
					});

					tx.oncomplete = () => {
						const writeTimeMs = Math.max(0.1, Math.round((performance.now() - startMs) * 10) / 10);
						const isSlowDisk = writeTimeMs >= slowThresholdMs;
						db.close();

						try {
							window.indexedDB.deleteDatabase(dbName);
						} catch {
							// safe cleanup ignore
						}

						const result: DiskBenchmarkResult = {
							isSlowDisk,
							writeTimeMs,
							chunkBytes,
						};

						setCachedDiskBenchmark(result);
						resolve(result);
					};

					tx.onerror = () => {
						db.close();
						const res: DiskBenchmarkResult = {
							isSlowDisk: isLowSpecDevice(),
							writeTimeMs: 0,
							chunkBytes,
							error: tx.error?.message ?? "Transaction error",
						};
						setCachedDiskBenchmark(res);
						resolve(res);
					};
				} catch (err: unknown) {
					db.close();
					const res: DiskBenchmarkResult = {
						isSlowDisk: isLowSpecDevice(),
						writeTimeMs: 0,
						chunkBytes,
						error: err instanceof Error ? err.message : String(err),
					};
					setCachedDiskBenchmark(res);
					resolve(res);
				}
			};
		} catch (err: unknown) {
			const res: DiskBenchmarkResult = {
				isSlowDisk: isLowSpecDevice(),
				writeTimeMs: 0,
				chunkBytes,
				error: err instanceof Error ? err.message : String(err),
			};
			setCachedDiskBenchmark(res);
			resolve(res);
		}
	});
}
