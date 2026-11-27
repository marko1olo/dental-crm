/**
 * dbConnection.ts — Инициализация и миграция схемы IndexedDB (Мандат 8b <= 120 строк).
 */

import {
	openOfflineOutboxDb,
	resetOfflineDbConnection,
} from "../../../services/offline/storage/idbDatabase";

export function resetDicomOfflineDbForTesting(): void {
	resetOfflineDbConnection(false);
}

export function openDicomOfflineDb(): Promise<IDBDatabase> {
	return openOfflineOutboxDb();
}
