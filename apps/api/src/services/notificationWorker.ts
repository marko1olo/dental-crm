/**
 * Адаптер совместимости для устаревшего воркера уведомлений.
 *
 * ИСТОРИЯ:
 * notificationWorker.ts ранее напрямую разбирал legacy-таблицу outgoing_notifications
 * через setInterval без распределённых блокировок (SKIP LOCKED), без экспоненциального
 * backoff, без учёта согласий пациентов, тихих часов и RLS-контекстов арендаторов.
 *
 * РЕШЕНИЕ:
 * Вся логика отправки сообщений переведена на отказоустойчивый распределённый диспетчер
 * (services/communications/dispatchWorker.ts и services/communications/dispatcher.ts).
 * Данный модуль сохранён как безопасный фасад/прокси, делегирующий запуск
 * к startCommunicationDispatchWorker.
 */

import {
	type DispatchWorkerHandle,
	type DispatchWorkerLogger,
	startCommunicationDispatchWorker,
	startDispatchWorker,
} from "./communications/dispatchWorker.js";

export type { DispatchWorkerHandle, DispatchWorkerLogger };

let activeHandle: DispatchWorkerHandle | null = null;

export type StartNotificationWorkerOptions = {
	logger?: DispatchWorkerLogger;
	env?: NodeJS.ProcessEnv;
};

/**
 * Запускает разбор очереди сообщений, безопасно делегируя вызов
 * современному воркеру коммуникаций.
 */
export function startNotificationWorker(
	options: StartNotificationWorkerOptions = {},
): DispatchWorkerHandle {
	if (activeHandle && activeHandle.enabled) {
		return activeHandle;
	}

	const handle = startCommunicationDispatchWorker(options);
	activeHandle = handle;
	return handle;
}

/**
 * Останавливает активный экземпляр воркера, если он был запущен.
 */
export function stopNotificationWorker(): void {
	if (activeHandle) {
		activeHandle.stop();
		activeHandle = null;
	}
}

export { startDispatchWorker };
