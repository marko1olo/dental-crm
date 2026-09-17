/**
 * DENTE CRM — Backend & Database HDD & Low-Spec PC Performance Configuration
 *
 * Архитектурный модуль оптимизации бэкенда для слабых ПК и ноутбуков с медленным HDD (5400 RPM):
 * 1. Ограничение пула соединений PostgreSQL (max 5..10 вместо 30), предотвращающее
 *    истощение RAM (4-8 ГБ) и дисковый троттлинг от десятков параллельных воркеров postgres.
 * 2. Калибровка таймаутов подключения (10с) и простоя (15с), освобождающая память idle-соединений.
 * 3. Асинхронное логирование Pino через буферизованный поток SonicBoom (4 КБ буфер, периодический flush),
 *    устраняющее синхронные блокировки event loop операциями записи на диск.
 */

import pino from "pino";
import type { FastifyLoggerOptions, FastifyServerOptions } from "fastify";
import { isAutomatedRun } from "../env/requiredEnv.js";

/** Константы оптимизации для медленных HDD и ПК начального уровня */
export const HDD_DEFAULT_POOL_MAX = 10;
export const HDD_LOW_SPEC_POOL_MAX = 5;
export const HDD_IDLE_TIMEOUT_MS = 15000;
export const HDD_CONNECTION_TIMEOUT_MS = 10000;
export const HDD_STATEMENT_TIMEOUT_MS = 20000;
export const HDD_LOG_BUFFER_SIZE_BYTES = 4096;
export const HDD_LOG_FLUSH_INTERVAL_MS = 5000;
export const HDD_DEFAULT_QUERY_CHUNK_SIZE = 250;

export interface HddDbPoolConfig {
	max: number;
	idleTimeoutMillis: number;
	connectionTimeoutMillis: number;
	statementTimeoutMs: number;
	allowExitOnIdle: boolean;
}

export interface HddPerformanceSettings {
	poolMax: number;
	idleTimeoutMillis: number;
	connectionTimeoutMillis: number;
	statementTimeoutMs: number;
	asyncLoggingEnabled: boolean;
	asyncLogBufferSize: number;
	flushIntervalMs: number;
}

let asyncLoggerDestination: ReturnType<typeof pino.destination> | null = null;
let flushTimer: NodeJS.Timeout | null = null;

/**
 * Проверка активности режима оптимизации под HDD / слабые ПК.
 * Включен по умолчанию на локальных/клинических инсталляциях, если явно не отключен флагом DENTE_HDD_MODE=0.
 */
export function isHddOptimizationActive(): boolean {
	if (process.env.DENTE_HDD_MODE === "0") {
		return false;
	}
	return true;
}

/**
 * Проверка возможности использования асинхронного логирования.
 * Автоматические прогоны тестов (node --test) используют синхронный вывод,
 * чтобы логи тестов не терялись при быстром завершении процессов.
 */
export function isAsyncLoggingAllowed(): boolean {
	if (isAutomatedRun()) {
		return false;
	}
	if (process.env.PINO_ASYNC_LOGGING === "0") {
		return false;
	}
	return isHddOptimizationActive();
}

/**
 * Применение значений окружения по умолчанию для медленных HDD.
 * Вызывается на самом раннем этапе загрузки server.ts, до инициализации пула pg.Pool.
 * Если PG_POOL_MAX не задан в .env, выставляет безопасный лимит 10 (или 5 при DENTE_LOW_SPEC=1),
 * предотвращая запуск 30 тяжелых процессов postgresql на 4-8 ГБ ноутбуке.
 */
export function applyHddPerformanceDefaults(): void {
	if (!isHddOptimizationActive()) {
		return;
	}

	const isLowSpec = process.env.DENTE_LOW_SPEC === "1";
	const targetPoolMax = isLowSpec ? HDD_LOW_SPEC_POOL_MAX : HDD_DEFAULT_POOL_MAX;

	if (!process.env.PG_POOL_MAX || process.env.PG_POOL_MAX.trim() === "") {
		process.env.PG_POOL_MAX = String(targetPoolMax);
	}

	if (!process.env.PG_IDLE_TIMEOUT_MS) {
		process.env.PG_IDLE_TIMEOUT_MS = String(HDD_IDLE_TIMEOUT_MS);
	}

	if (!process.env.PG_CONNECTION_TIMEOUT_MS) {
		process.env.PG_CONNECTION_TIMEOUT_MS = String(HDD_CONNECTION_TIMEOUT_MS);
	}

	process.stderr.write(
		`[perf/hdd] Активен профиль оптимизации HDD (5400 RPM): PG_POOL_MAX=${process.env.PG_POOL_MAX}, ` +
			`connTimeout=${process.env.PG_CONNECTION_TIMEOUT_MS}ms, idleTimeout=${process.env.PG_IDLE_TIMEOUT_MS}ms, ` +
			`asyncLogging=${isAsyncLoggingAllowed() ? "on (4KB buffer)" : "off"}\n`,
	);
}

/**
 * Получение калиброванной конфигурации для пула pg.Pool.
 */
export function getHddDbPoolConfig(
	overrides?: Partial<HddDbPoolConfig>,
): HddDbPoolConfig {
	const parsedPoolMax = Number.parseInt(process.env.PG_POOL_MAX ?? "10", 10);
	const poolMax =
		Number.isFinite(parsedPoolMax) && parsedPoolMax > 0
			? parsedPoolMax
			: HDD_DEFAULT_POOL_MAX;

	const parsedIdle = Number.parseInt(
		process.env.PG_IDLE_TIMEOUT_MS ?? String(HDD_IDLE_TIMEOUT_MS),
		10,
	);
	const parsedConn = Number.parseInt(
		process.env.PG_CONNECTION_TIMEOUT_MS ?? String(HDD_CONNECTION_TIMEOUT_MS),
		10,
	);

	return {
		max: overrides?.max ?? poolMax,
		idleTimeoutMillis:
			overrides?.idleTimeoutMillis ??
			(Number.isFinite(parsedIdle) ? parsedIdle : HDD_IDLE_TIMEOUT_MS),
		connectionTimeoutMillis:
			overrides?.connectionTimeoutMillis ??
			(Number.isFinite(parsedConn) ? parsedConn : HDD_CONNECTION_TIMEOUT_MS),
		statementTimeoutMs: overrides?.statementTimeoutMs ?? HDD_STATEMENT_TIMEOUT_MS,
		allowExitOnIdle: overrides?.allowExitOnIdle ?? isAutomatedRun(),
	};
}

/**
 * Создание или возврат синглтона асинхронного потока логирования Pino (SonicBoom).
 * Буферизует записи логов в памяти (4 КБ) и сбрасывает их на диск пачками,
 * исключая синхронные задержки ввода-вывода (I/O) в цикле событий Node.js.
 */
export function getHddAsyncLoggerStream(): ReturnType<typeof pino.destination> {
	if (asyncLoggerDestination) {
		return asyncLoggerDestination;
	}

	asyncLoggerDestination = pino.destination({
		sync: false,
		minLength: HDD_LOG_BUFFER_SIZE_BYTES,
	});

	// Периодический сброс буфера логов, чтобы редкие сообщения не зависали в буфере
	flushTimer = setInterval(() => {
		try {
			if (asyncLoggerDestination) {
				asyncLoggerDestination.flush();
			}
		} catch {
			// Игнорируем ошибки сброса при закрытии потока
		}
	}, HDD_LOG_FLUSH_INTERVAL_MS);

	if (flushTimer.unref) {
		flushTimer.unref();
	}

	// Гарантированный сброс буфера перед выходом из процесса
	process.once("beforeExit", () => {
		flushHddLogger();
	});

	return asyncLoggerDestination;
}

/**
 * Синхронный принудительный сброс буфера логов на диск.
 * Должен вызываться при graceful shutdown и при падении сервера (uncaughtException).
 */
export function flushHddLogger(): void {
	if (asyncLoggerDestination) {
		try {
			asyncLoggerDestination.flushSync();
		} catch {
			// Игнорируем ошибки при уже закрытом дескрипторе
		}
	}
}

/**
 * Сводная конфигурация Fastify Logger с поддержкой асинхронного вывода SonicBoom.
 */
export type HddFastifyLoggerConfig = FastifyLoggerOptions & {
	redact?: {
		paths: string[];
		censor?: string;
	};
	transport?: unknown;
};

export function getHddFastifyLoggerConfig(): HddFastifyLoggerConfig {
	const isProd = process.env.NODE_ENV === "production";
	const config: HddFastifyLoggerConfig = {
		level: isProd ? "info" : "debug",
		redact: {
			paths: [
				"req.headers.authorization",
				'req.headers["x-dente-clinic-token"]',
				'req.headers["x-dente-staff-token"]',
				'req.headers["x-dente-admin-secret"]',
				"req.headers.cookie",
				'res.headers["set-cookie"]',
			],
			censor: "[скрыто]",
		},
	};

	if (isAsyncLoggingAllowed()) {
		config.stream = getHddAsyncLoggerStream();
	}

	return config;
}

/**
 * Утилита порционного (chunked) выполнения запросов к базе данных.
 * Предотвращает раздувание кучи Node.js (V8 Heap) и падение в OOM на слабых ПК (2-4 ГБ RAM).
 * Позволяет обрабатывать тысячи строк фиксированными пачками по 250 записей.
 */
export async function queryInChunks<T>(
	queryFactory: (limit: number, offset: number) => Promise<T[]>,
	chunkSize = HDD_DEFAULT_QUERY_CHUNK_SIZE,
	onChunk?: (chunk: T[]) => Promise<void> | void,
): Promise<T[]> {
	const allResults: T[] = [];
	let offset = 0;
	while (true) {
		const chunk = await queryFactory(chunkSize, offset);
		if (!chunk || chunk.length === 0) {
			break;
		}
		if (onChunk) {
			await onChunk(chunk);
		} else {
			allResults.push(...chunk);
		}
		if (chunk.length < chunkSize) {
			break;
		}
		offset += chunkSize;
	}
	return allResults;
}

/**
 * Асинхронный генератор для потокового чтения данных из БД частями.
 * Освобождает память предыдущих пачек для сборщика мусора (GC).
 */
export async function* streamQueryChunks<T>(
	queryFactory: (limit: number, offset: number) => Promise<T[]>,
	chunkSize = HDD_DEFAULT_QUERY_CHUNK_SIZE,
): AsyncIterableIterator<T[]> {
	let offset = 0;
	while (true) {
		const chunk = await queryFactory(chunkSize, offset);
		if (!chunk || chunk.length === 0) {
			break;
		}
		yield chunk;
		if (chunk.length < chunkSize) {
			break;
		}
		offset += chunkSize;
	}
}

/**
 * Пакетное выполнение тяжелых операций (например, массовые обновления или вставки)
 * небольшими порциями, исключающими дисковый троттлинг HDD.
 */
export async function executeBatchInChunks<T, R>(
	items: readonly T[],
	chunkSize: number,
	processor: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> {
	if (items.length === 0) return [];
	const results: R[] = [];
	for (let i = 0; i < items.length; i += chunkSize) {
		const chunk = items.slice(i, i + chunkSize);
		const chunkResults = await processor(chunk);
		results.push(...chunkResults);
	}
	return results;
}

