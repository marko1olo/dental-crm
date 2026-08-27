/**
 * DENTE CRM — Correlation ID Utilities
 *
 * Обеспечивает сквозное отслеживание цепочек запросов между фронтендом,
 * сетевыми шлюзами, воркерами и базой данных.
 */
import { generateUuidV7, isUuidV7 } from "../sync/hashing.js";
export const CORRELATION_ID_HEADER = "x-correlation-id";
export const REQUEST_ID_HEADER = "x-request-id";
/**
 * Генерирует уникальный Correlation ID с временной упорядоченностью UUIDv7.
 */
export function generateCorrelationId(prefix = "cor") {
    const uuid = generateUuidV7();
    return `${prefix}_${uuid}`;
}
/**
 * Проверяет валидность строки Correlation ID.
 */
export function isValidCorrelationId(value) {
    if (typeof value !== "string" || !value.trim()) {
        return false;
    }
    const trimmed = value.trim();
    if (trimmed.length < 8 || trimmed.length > 128) {
        return false;
    }
    // Direct UUIDv7 or prefixed format (e.g. cor_019532... or req_...)
    if (isUuidV7(trimmed)) {
        return true;
    }
    const parts = trimmed.split("_");
    if (parts.length >= 2 && isUuidV7(parts.slice(1).join("_"))) {
        return true;
    }
    // Alphanumeric / hyphenated ID check
    return /^[a-zA-Z0-9_-]{8,128}$/.test(trimmed);
}
/**
 * Извлекает correlation ID из объекта заголовков (Node.js incoming headers или Fetch Headers).
 */
export function extractCorrelationId(headers) {
    if (!headers || typeof headers !== "object") {
        return null;
    }
    // Standard Fetch Headers object
    if ("get" in headers && typeof headers.get === "function") {
        const fetchHeaders = headers;
        const candidate = fetchHeaders.get(CORRELATION_ID_HEADER) ||
            fetchHeaders.get(REQUEST_ID_HEADER);
        if (candidate && isValidCorrelationId(candidate)) {
            return candidate.trim();
        }
        return null;
    }
    // Plain Record<string, string | string[]>
    const record = headers;
    const raw = record[CORRELATION_ID_HEADER] ||
        record[CORRELATION_ID_HEADER.toUpperCase()] ||
        record[REQUEST_ID_HEADER] ||
        record[REQUEST_ID_HEADER.toUpperCase()] ||
        record["X-Correlation-Id"] ||
        record["X-Request-Id"];
    if (Array.isArray(raw) && raw.length > 0) {
        const first = raw[0];
        if (typeof first === "string" && isValidCorrelationId(first)) {
            return first.trim();
        }
    }
    else if (typeof raw === "string" && isValidCorrelationId(raw)) {
        return raw.trim();
    }
    return null;
}
