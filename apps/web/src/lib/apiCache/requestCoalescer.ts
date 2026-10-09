/**
 * requestCoalescer.ts — Layer 2: Очередь параллельных обещаний (Request Coalescing).
 *
 * Предотвращает шквал параллельных запросов (Cache Stampede) при открытии смены,
 * переключении вкладок или одновременном обращении нескольких компонентов к одному справочнику.
 */

const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Проверяет наличие параллельного запроса в полете для заданного ключа кэша.
 */
export function hasInFlightRequest(key: string): boolean {
	return inFlightRequests.has(key);
}

/**
 * Возвращает промис текущего запроса в полете.
 */
export function getInFlightRequest<T = unknown>(key: string): Promise<T> | undefined {
	return inFlightRequests.get(key) as Promise<T> | undefined;
}

/**
 * Регистрирует параллельный сетевой запрос в очереди ожидания.
 */
export function setInFlightRequest<T = unknown>(key: string, promise: Promise<T>): void {
	inFlightRequests.set(key, promise as Promise<unknown>);
}

/**
 * Удаляет завершенный запрос из очереди in-flight.
 */
export function deleteInFlightRequest(key: string): boolean {
	return inFlightRequests.delete(key);
}

/**
 * Возвращает текущее количество запросов в полете.
 */
export function getInFlightCount(): number {
	return inFlightRequests.size;
}

/**
 * Сбрасывает все параллельные запросы из очереди.
 */
export function clearInFlightRequests(): void {
	inFlightRequests.clear();
}
