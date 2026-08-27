/**
 * DENTE CRM — Correlation ID Utilities
 *
 * Обеспечивает сквозное отслеживание цепочек запросов между фронтендом,
 * сетевыми шлюзами, воркерами и базой данных.
 */
export declare const CORRELATION_ID_HEADER = "x-correlation-id";
export declare const REQUEST_ID_HEADER = "x-request-id";
/**
 * Генерирует уникальный Correlation ID с временной упорядоченностью UUIDv7.
 */
export declare function generateCorrelationId(prefix?: string): string;
/**
 * Проверяет валидность строки Correlation ID.
 */
export declare function isValidCorrelationId(value: unknown): boolean;
/**
 * Извлекает correlation ID из объекта заголовков (Node.js incoming headers или Fetch Headers).
 */
export declare function extractCorrelationId(headers: Record<string, string | string[] | undefined> | {
    get(name: string): string | null;
} | unknown): string | null;
