import type { ChestnyZnakScannedItem } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage.js";
import type { MdlpScanMode } from "./mdlpModal/types.js";

/** Пакет офлайн-буфера списания лекарственных препаратов Честный Знак */
export interface MdlpOfflinePackage {
	readonly id: string;
	readonly createdAt: string;
	readonly docNum: string;
	readonly docDate: string;
	readonly mode: MdlpScanMode;
	readonly itemsCount: number;
	readonly totalCostRub: number;
	readonly items: readonly ChestnyZnakScannedItem[];
	readonly status: "queued" | "syncing" | "synced";
	readonly reason: string;
	readonly patientId?: string | null | undefined;
	readonly visitId?: string | null | undefined;
	readonly protocolNumber?: string | undefined; // Медицинская карта приёма
}

const OFFLINE_QUEUE_STORAGE_KEY = "dente_mdlp_offline_disposal_queue_v1";

/** Загрузка сохраненной очереди отложенных списаний из локального хранилища */
export function loadMdlpOfflineQueue(): MdlpOfflinePackage[] {
	try {
		const raw = safeLocalStorageGetItem(OFFLINE_QUEUE_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}

/** Сохранение очереди отложенных списаний в локальное хранилище */
export function saveMdlpOfflineQueue(queue: readonly MdlpOfflinePackage[]): void {
	try {
		safeLocalStorageSetItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
	} catch {
		// Игнорируем ошибки квоты хранилища
	}
}
