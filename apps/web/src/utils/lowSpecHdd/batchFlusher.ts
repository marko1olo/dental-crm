/**
 * lowSpecHdd/batchFlusher.ts — очередь пакетной отложенной записи (Anti-HDD thrashing write queue).
 * Layer 1: Debounced batch flushing & scheduling.
 */

import type { DebouncedBatchFlusherOptions, DebouncedFunction } from "./types.js";
import { getOptimizedTiming } from "./timingConfig.js";

/**
 * Очередь пакетной отложенной записи (Debounced Batch Flusher).
 *
 * Вместо того чтобы вызывать синхронный или асинхронный I/O на каждый клик мыши или символ
 * клавиатуры, элементы накапливаются в оперативной памяти и сбрасываются единым блоком:
 * - либо по истечении дебаунса (1200-2000 мс спокойствия),
 * - либо по достижении максимального времени ожидания (maxWaitMs),
 * - либо при переполнении буфера (maxBatchSize),
 * - либо при закрытии вкладки (события beforeunload/pagehide).
 */
export class DebouncedBatchFlusher<T> {
	private buffer: T[] = [];
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;
	private maxWaitTimer: ReturnType<typeof setTimeout> | null = null;
	private readonly debounceMs: number;
	private readonly maxWaitMs: number;
	private readonly maxBatchSize: number;
	private readonly onFlush: (items: T[]) => void | Promise<void>;
	private isFlushing = false;
	private unloadListener: (() => void) | null = null;
	private visibilityListener: (() => void) | null = null;
	private telephonyListener: (() => void) | null = null;

	constructor(options: DebouncedBatchFlusherOptions<T>) {
		const timing = getOptimizedTiming();
		this.debounceMs = options.debounceMs ?? timing.batchFlushDelayMs;
		this.maxWaitMs = options.maxWaitMs ?? Math.max(this.debounceMs * 3, 4000);
		this.maxBatchSize = options.maxBatchSize ?? 50;
		this.onFlush = options.onFlush;

		// Гарантия сохранности данных при закрытии вкладки, перезагрузке,
		// смене вкладки или входящем звонке телефонии (Мандат 8e / 8n)
		if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
			this.unloadListener = () => {
				void this.flushNow();
			};
			this.visibilityListener = () => {
				if (typeof document !== "undefined" && document.visibilityState === "hidden") {
					void this.flushNow();
				}
			};
			this.telephonyListener = () => {
				void this.flushNow();
			};

			window.addEventListener("beforeunload", this.unloadListener);
			window.addEventListener("pagehide", this.unloadListener);
			if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
				document.addEventListener("visibilitychange", this.visibilityListener);
			}
			window.addEventListener("dente-telephony-incoming-call", this.telephonyListener);
		}
	}

	/**
	 * Добавляет элемент в буфер оперативной памяти.
	 */
	add(item: T): void {
		this.buffer.push(item);

		// Если буфер переполнен — сбрасываем немедленно
		if (this.buffer.length >= this.maxBatchSize) {
			void this.flushNow();
			return;
		}

		// Перезапускаем дебаунс-таймер
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			void this.flushNow();
		}, this.debounceMs);

		// Запускаем гарантированный таймер ожидания, если он еще не запущен
		if (!this.maxWaitTimer) {
			this.maxWaitTimer = setTimeout(() => {
				void this.flushNow();
			}, this.maxWaitMs);
		}
	}

	/**
	 * Добавляет сразу несколько элементов в буфер.
	 */
	addBatch(items: readonly T[]): void {
		for (const item of items) {
			this.buffer.push(item);
		}

		if (this.buffer.length >= this.maxBatchSize) {
			void this.flushNow();
			return;
		}

		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
		}
		this.debounceTimer = setTimeout(() => {
			void this.flushNow();
		}, this.debounceMs);

		if (!this.maxWaitTimer) {
			this.maxWaitTimer = setTimeout(() => {
				void this.flushNow();
			}, this.maxWaitMs);
		}
	}

	/**
	 * Принудительно выполняет сброс всех накопленных в буфере элементов.
	 */
	async flushNow(): Promise<void> {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
		if (this.maxWaitTimer) {
			clearTimeout(this.maxWaitTimer);
			this.maxWaitTimer = null;
		}

		if (this.buffer.length === 0 || this.isFlushing) {
			return;
		}

		const itemsToFlush = [...this.buffer];
		this.buffer = [];
		this.isFlushing = true;

		try {
			await this.onFlush(itemsToFlush);
		} catch (error) {
			// При сбое восстанавливаем элементы в начало буфера, чтобы не потерять данные
			this.buffer = [...itemsToFlush, ...this.buffer];
			throw error;
		} finally {
			this.isFlushing = false;
		}
	}

	/**
	 * Текущее количество элементов в буфере, ожидающих записи.
	 */
	get pendingCount(): number {
		return this.buffer.length;
	}

	/**
	 * Очищает буфер и снимает слушатели событий (при демонтировании компонента).
	 */
	destroy(): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		if (this.maxWaitTimer) clearTimeout(this.maxWaitTimer);
		this.debounceTimer = null;
		this.maxWaitTimer = null;

		if (typeof window !== "undefined" && typeof window.removeEventListener === "function") {
			if (this.unloadListener) {
				window.removeEventListener("beforeunload", this.unloadListener);
				window.removeEventListener("pagehide", this.unloadListener);
				this.unloadListener = null;
			}
			if (this.visibilityListener && typeof document !== "undefined" && typeof document.removeEventListener === "function") {
				document.removeEventListener("visibilitychange", this.visibilityListener);
				this.visibilityListener = null;
			}
			if (this.telephonyListener) {
				window.removeEventListener("dente-telephony-incoming-call", this.telephonyListener);
				this.telephonyListener = null;
			}
		}
		this.buffer = [];
	}
}

/**
 * Создает функцию с отложенным вызовом (debounce).
 * Если интервал не передан — берет адаптивный autosaveDebounceMs из getOptimizedTiming().
 */
export function createDebouncedAction<Args extends unknown[]>(
	action: (...args: Args) => void,
	delayMs?: number,
): DebouncedFunction<Args> {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Args | null = null;

	const effectiveDelay = delayMs ?? getOptimizedTiming().autosaveDebounceMs;

	const debounced = (...args: Args) => {
		lastArgs = args;
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(() => {
			timer = null;
			if (lastArgs) {
				action(...lastArgs);
				lastArgs = null;
			}
		}, effectiveDelay);
	};

	debounced.cancel = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		lastArgs = null;
	};

	debounced.flush = () => {
		if (timer && lastArgs) {
			clearTimeout(timer);
			timer = null;
			action(...lastArgs);
			lastArgs = null;
		}
	};

	return debounced;
}
