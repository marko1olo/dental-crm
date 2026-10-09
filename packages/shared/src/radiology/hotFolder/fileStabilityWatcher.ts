/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL HOT-FOLDER SYNC & RADIOLOGY INTAKE ENGINE
 * Layer 2: File Stability Watcher (Write Completion & Partial Write Guard)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type {
	FileStabilityCheckResult,
	FileStabilityOptions,
} from "./types.js";

export interface TrackedFileRecord {
	readonly fileKey: string;
	lastSizeBytes: number;
	lastMtimeMs: number;
	consecutiveStableChecks: number;
	firstObservedAt: number;
	lastObservedAt: number;
	isStable: boolean;
}

/**
 * Проверяет, стабилизировался ли размер файла между последовательными опросами.
 * Защищает от захвата незавершенных снимков визиографа/томографа при записи по сети (SMB/NFS)
 * или локальному диску Windows.
 */
export function checkBufferStability(
	currentSize: number,
	previousSize?: number | undefined,
): boolean {
	if (currentSize <= 0) return false;
	if (previousSize === undefined) return false;
	return currentSize === previousSize;
}

/**
 * Трекер стабильности файлов в памяти для Hot Folder Watcher.
 */
export class FileStabilityTracker {
	private readonly records = new Map<string, TrackedFileRecord>();
	private readonly requiredConsecutiveChecks: number;
	private readonly minCheckIntervalMs: number;
	private readonly timeoutMs: number;

	constructor(options?: FileStabilityOptions | undefined) {
		this.requiredConsecutiveChecks = Math.max(1, options?.stabilityConsecutiveChecks ?? 3);
		this.minCheckIntervalMs = Math.max(50, options?.stabilityCheckIntervalMs ?? 300);
		this.timeoutMs = Math.max(1000, options?.timeoutMs ?? 30000);
	}

	/**
	 * Фиксирует текущий снимок файла (размер и mtime) и проверяет готовность к безопасному чтению.
	 */
	public registerFileCheck(
		fileKey: string,
		sizeBytes: number,
		mtimeMs?: number | undefined,
	): FileStabilityCheckResult {
		const now = Date.now();
		const effectiveMtime = mtimeMs ?? now;

		let record = this.records.get(fileKey);

		if (!record) {
			record = {
				fileKey,
				lastSizeBytes: sizeBytes,
				lastMtimeMs: effectiveMtime,
				consecutiveStableChecks: 1,
				firstObservedAt: now,
				lastObservedAt: now,
				isStable: false,
			};
			this.records.set(fileKey, record);

			// Файл размера 0 никогда не стабилен для чтения
			if (sizeBytes === 0) {
				return {
					isStable: false,
					fileSizeBytes: 0,
					checksCount: 1,
					elapsedMs: 0,
					error: "Файл имеет нулевой размер (0 байт)",
				};
			}

			// Если требуется ровно 1 проверка (например, при явном флаге)
			if (this.requiredConsecutiveChecks <= 1 && sizeBytes > 0) {
				record.isStable = true;
				return {
					isStable: true,
					fileSizeBytes: sizeBytes,
					checksCount: 1,
					elapsedMs: 0,
				};
			}

			return {
				isStable: false,
				fileSizeBytes: sizeBytes,
				checksCount: 1,
				elapsedMs: 0,
			};
		}

		const elapsedMs = now - record.firstObservedAt;
		if (elapsedMs > this.timeoutMs) {
			this.records.delete(fileKey);
			return {
				isStable: false,
				fileSizeBytes: sizeBytes,
				checksCount: record.consecutiveStableChecks,
				elapsedMs,
				error: `Таймаут ожидания стабилизации файла (> ${this.timeoutMs} мс)`,
			};
		}

		// Проверка: изменился ли размер или время модификации
		const sizeUnchanged = sizeBytes > 0 && sizeBytes === record.lastSizeBytes;
		const mtimeUnchanged = effectiveMtime === record.lastMtimeMs;

		if (sizeUnchanged && mtimeUnchanged) {
			record.consecutiveStableChecks += 1;
		} else {
			// Размер ещё растет (аппарат пишет срез томограммы / DICOM)
			record.consecutiveStableChecks = 1;
			record.lastSizeBytes = sizeBytes;
			record.lastMtimeMs = effectiveMtime;
			record.isStable = false;
		}

		record.lastObservedAt = now;

		if (record.consecutiveStableChecks >= this.requiredConsecutiveChecks) {
			record.isStable = true;
			return {
				isStable: true,
				fileSizeBytes: sizeBytes,
				checksCount: record.consecutiveStableChecks,
				elapsedMs,
			};
		}

		return {
			isStable: false,
			fileSizeBytes: sizeBytes,
			checksCount: record.consecutiveStableChecks,
			elapsedMs,
		};
	}

	/**
	 * Проверяет, готов ли файл к обработке без изменения счетчиков.
	 */
	public isReadyForProcessing(fileKey: string): boolean {
		const record = this.records.get(fileKey);
		return Boolean(record?.isStable);
	}

	/**
	 * Сбрасывает трекинг завершенного или перемещенного файла.
	 */
	public resetFile(fileKey: string): void {
		this.records.delete(fileKey);
	}

	/**
	 * Очищает все зарегистрированные файлы.
	 */
	public clear(): void {
		this.records.clear();
	}

	/**
	 * Количество файлов, находящихся в процессе проверки стабилизации.
	 */
	public getActiveTrackingCount(): number {
		return this.records.size;
	}
}
