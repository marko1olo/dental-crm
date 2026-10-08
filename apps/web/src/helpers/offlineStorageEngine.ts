/**
 * @file apps/web/src/helpers/offlineStorageEngine.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	logger,
} from "../utils/logger";

export const speechChunkDbName = "dental-crm-offline";

export const speechChunkDbVersion = 4;

export const pendingVisitSaveStoreName = "pendingVisitSaves";

export const dicomWorkbenchDraftStoreName = "dicomWorkbenchDrafts";

export const mprWorkbenchDraftStoreName = "mprWorkbenchDrafts";

export const speechChunkStoreName = "pendingSpeechChunks";

export const requiredSpeechChunkDbStoreNames = [
	pendingVisitSaveStoreName,
	dicomWorkbenchDraftStoreName,
	mprWorkbenchDraftStoreName,
	speechChunkStoreName,
] as const;

export let speechChunkDbPromise: Promise<IDBDatabase> | null = null;

export function speechChunkIndexedDbAvailable(): boolean {
	return typeof window !== "undefined" && "indexedDB" in window;
}

export function pendingVisitSaveIndexedDbAvailable(): boolean {
	return speechChunkIndexedDbAvailable();
}

export function assertSpeechChunkDbStores(db: IDBDatabase): void {
	const missingStores = requiredSpeechChunkDbStoreNames.filter(
		(storeName) => !db.objectStoreNames.contains(storeName),
	);
	if (missingStores.length) {
		throw new Error(
			`Offline IndexedDB schema is missing stores: ${missingStores.join(", ")}`,
		);
	}
}

export function openSpeechChunkDb(): Promise<IDBDatabase> {
	if (!speechChunkIndexedDbAvailable())
		return Promise.reject(
			new Error("Браузер не дает сохранить аудио для отправки позже"),
		);
	if (speechChunkDbPromise) return speechChunkDbPromise;
	speechChunkDbPromise = new Promise((resolve, reject) => {
		const request = window.indexedDB.open(
			speechChunkDbName,
			speechChunkDbVersion,
		);
		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(pendingVisitSaveStoreName)) {
				const store = db.createObjectStore(pendingVisitSaveStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
				store.createIndex("organizationId", "organizationId");
				store.createIndex("visitId", "visitId");
			}
			if (!db.objectStoreNames.contains(dicomWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(dicomWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(mprWorkbenchDraftStoreName)) {
				const store = db.createObjectStore(mprWorkbenchDraftStoreName, {
					keyPath: "storageKey",
				});
				store.createIndex("organizationId", "organizationId");
				store.createIndex("seriesKey", "seriesKey");
				store.createIndex("clientSavedAt", "clientSavedAt");
			}
			if (!db.objectStoreNames.contains(speechChunkStoreName)) {
				const store = db.createObjectStore(speechChunkStoreName, {
					keyPath: "id",
				});
				store.createIndex("queuedAt", "queuedAt");
			}
		};
		request.onsuccess = () => {
			const db = request.result;
			// БЫЛО: при смене версии соединение закрывалось, но КЭШ промиса оставался
			// указывать на закрытый дескриптор. Сценарий: открыта вторая вкладка после
			// обновления версии хранилища — первая закрывала своё соединение, а все
			// последующие db.transaction(...) бросали InvalidStateError. Сохранение
			// приёма падало на запасной путь в localStorage, который к тому моменту
			// уже очищен, и очередь неотправленных записей приёма перезаписывалась
			// пустой — при том, что интерфейс сообщал «сохранено локально».
			// Сбрасываем кэш, чтобы следующий вызов открыл соединение заново.
			db.onversionchange = () => {
				speechChunkDbPromise = null;
				db.close();
			};
			db.onclose = () => {
				speechChunkDbPromise = null;
			};
			try {
				assertSpeechChunkDbStores(db);
				resolve(db);
			} catch (error) {
				logger.warn("Offline IndexedDB stores assert failed, closing db", error);
				db.close();
				speechChunkDbPromise = null;
				reject(
					error instanceof Error
						? error
						: new Error("Offline IndexedDB schema is incomplete"),
				);
			}
		};
		request.onerror = () => {
			speechChunkDbPromise = null;
			reject(request.error ?? new Error("Хранилище аудио не открылось"));
		};
		request.onblocked = () => {
			speechChunkDbPromise = null;
			reject(new Error("Хранилище аудио заблокировано другой вкладкой"));
		};
	});
	return speechChunkDbPromise;
}
