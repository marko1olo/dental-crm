/**
 * ServerHealthWatchdog.ts — сервис мониторинга ресурсов, RAM watchdog и состояния сервера (Feature #44).
 *
 * ФУНКЦИОНАЛ:
 * 1. Сбор системных метрик памяти процесса V8 (heapUsed, heapTotal, rss, external, arrayBuffers).
 * 2. Расчет системных порогов RAM (warning >80%, critical >90% от max_old_space_size / heap_size_limit).
 * 3. Мониторинг состояния пула PostgreSQL (total, idle, active, waiting, utilization, response time).
 * 4. Мониторинг состояния очередей фоновых задач system_background_jobs (pending, processing, dead_letter).
 * 5. Форматирование метрик в Prometheus-совместимый текстовый формат (OpenMetrics / Prometheus exposition).
 * 6. Запись срезов RAM в таблицу system_ram_watchdogs для аудита и ретроспективного анализа.
 */

import os from "node:os";
import v8 from "node:v8";
import { sql } from "drizzle-orm";
import type pg from "pg";
import { db, pool } from "../../db/client.js";
import { systemBackgroundJobs, systemRamWatchdogs } from "../../db/schema.js";

export type HealthStatus = "healthy" | "warning" | "critical";

export interface MemoryMetrics {
	heapUsed: number;
	heapTotal: number;
	rss: number;
	external: number;
	arrayBuffers: number;
	heapSizeLimit: number;
	heapUsageRatio: number;
	heapUsagePercent: number;
	rssUsagePercentOfTotalMem: number;
	totalSystemMemory: number;
	freeSystemMemory: number;
	status: HealthStatus;
	warningThresholdPercent: number;
	criticalThresholdPercent: number;
	statusMessage: string;
}

export interface DatabasePoolMetrics {
	totalCount: number;
	idleCount: number;
	activeCount: number;
	waitingCount: number;
	maxConnections: number;
	utilizationRatio: number;
	status: HealthStatus;
	isResponsive: boolean;
	responseTimeMs: number | null;
	lastError: string | null;
}

export interface QueueBreakdown {
	pending: number;
	processing: number;
	deadLetter: number;
	failed: number;
	completed: number;
	cancelled: number;
}

export interface QueueMetrics {
	totalJobs: number;
	pending: number;
	processing: number;
	deadLetter: number;
	failed: number;
	completed: number;
	cancelled: number;
	queues: Record<string, QueueBreakdown>;
	status: HealthStatus;
	lastError: string | null;
}

export interface SystemMetrics {
	timestamp: string;
	uptimeSeconds: number;
	status: HealthStatus;
	statusReason: string;
	environment: string;
	nodeVersion: string;
	pid: number;
	memory: MemoryMetrics;
	database: DatabasePoolMetrics;
	queues: QueueMetrics;
}

export interface GetSystemMetricsOptions {
	customMemoryUsage?: NodeJS.MemoryUsage | undefined;
	customHeapLimit?: number | undefined;
	customPool?: pg.Pool | undefined;
	customDb?: typeof db | undefined;
	checkDbPing?: boolean | undefined;
	dbPingTimeoutMs?: number | undefined;
	warningThresholdRatio?: number | undefined;
	criticalThresholdRatio?: number | undefined;
}

export class ServerHealthWatchdog {
	public static readonly DEFAULT_WARNING_THRESHOLD_RATIO = 0.8;
	public static readonly DEFAULT_CRITICAL_THRESHOLD_RATIO = 0.9;
	public static readonly DEFAULT_DB_PING_TIMEOUT_MS = 2000;

	/**
	 * Определение предела кучи V8 в байтах (heap_size_limit / max-old-space-size).
	 */
	public static getHeapLimit(): number {
		try {
			const heapStats = v8.getHeapStatistics();
			if (heapStats.heap_size_limit && heapStats.heap_size_limit > 0) {
				return heapStats.heap_size_limit;
			}
		} catch {
			// Fallback if v8.getHeapStatistics() fails
		}

		// Fallback к расчету по системной памяти или 4 ГБ
		const totalMem = os.totalmem();
		return Math.min(totalMem, 4 * 1024 * 1024 * 1024);
	}

	/**
	 * Оценка статуса использования ОЗУ по заданным порогам (80% warning, 90% critical).
	 */
	public static evaluateMemoryStatus(
		heapUsed: number,
		heapSizeLimit: number,
		warningThresholdRatio = ServerHealthWatchdog.DEFAULT_WARNING_THRESHOLD_RATIO,
		criticalThresholdRatio = ServerHealthWatchdog.DEFAULT_CRITICAL_THRESHOLD_RATIO,
	): { status: HealthStatus; ratio: number; percent: number; message: string } {
		const ratio = heapSizeLimit > 0 ? heapUsed / heapSizeLimit : 0;
		const percent = Math.round(ratio * 10000) / 100;

		if (ratio >= criticalThresholdRatio) {
			return {
				status: "critical",
				ratio,
				percent,
				message: `Критическое использование памяти: ${percent}% (порог: ${criticalThresholdRatio * 100}%). Высокий риск OOM.`,
			};
		}

		if (ratio >= warningThresholdRatio) {
			return {
				status: "warning",
				ratio,
				percent,
				message: `Предупреждение по памяти: ${percent}% (порог: ${warningThresholdRatio * 100}%). Возможна утечка или пиковая нагрузка.`,
			};
		}

		return {
			status: "healthy",
			ratio,
			percent,
			message: `Использование памяти в норме: ${percent}% от допустимого лимита V8.`,
		};
	}

	/**
	 * Сбор детальных метрик оперативной памяти процесса.
	 */
	public static collectMemoryMetrics(options?: {
		customMemoryUsage?: NodeJS.MemoryUsage | undefined;
		customHeapLimit?: number | undefined;
		warningThresholdRatio?: number | undefined;
		criticalThresholdRatio?: number | undefined;
	}): MemoryMetrics {
		const mem = options?.customMemoryUsage ?? process.memoryUsage();
		const heapSizeLimit = options?.customHeapLimit ?? ServerHealthWatchdog.getHeapLimit();
		const warningThresholdRatio =
			options?.warningThresholdRatio ??
			ServerHealthWatchdog.DEFAULT_WARNING_THRESHOLD_RATIO;
		const criticalThresholdRatio =
			options?.criticalThresholdRatio ??
			ServerHealthWatchdog.DEFAULT_CRITICAL_THRESHOLD_RATIO;

		const evalResult = ServerHealthWatchdog.evaluateMemoryStatus(
			mem.heapUsed,
			heapSizeLimit,
			warningThresholdRatio,
			criticalThresholdRatio,
		);

		const totalSystemMem = os.totalmem();
		const freeSystemMem = os.freemem();
		const rssRatio = totalSystemMem > 0 ? mem.rss / totalSystemMem : 0;

		return {
			heapUsed: mem.heapUsed,
			heapTotal: mem.heapTotal,
			rss: mem.rss,
			external: mem.external,
			arrayBuffers: (mem as unknown as { arrayBuffers?: number }).arrayBuffers ?? 0,
			heapSizeLimit,
			heapUsageRatio: evalResult.ratio,
			heapUsagePercent: evalResult.percent,
			rssUsagePercentOfTotalMem: Math.round(rssRatio * 10000) / 100,
			totalSystemMemory: totalSystemMem,
			freeSystemMemory: freeSystemMem,
			status: evalResult.status,
			warningThresholdPercent: warningThresholdRatio * 100,
			criticalThresholdPercent: criticalThresholdRatio * 100,
			statusMessage: evalResult.message,
		};
	}

	/**
	 * Сбор метрик пула соединений PostgreSQL.
	 */
	public static async collectDatabaseMetrics(options?: {
		customPool?: pg.Pool | undefined;
		checkDbPing?: boolean | undefined;
		dbPingTimeoutMs?: number | undefined;
	}): Promise<DatabasePoolMetrics> {
		const targetPool = options?.customPool ?? pool;
		const totalCount = targetPool?.totalCount ?? 0;
		const idleCount = targetPool?.idleCount ?? 0;
		const waitingCount = targetPool?.waitingCount ?? 0;
		const activeCount = Math.max(0, totalCount - idleCount);

		const parsedMax = (targetPool as unknown as { options?: { max?: number } })?.options?.max;
		const maxConnections = typeof parsedMax === "number" && parsedMax > 0 ? parsedMax : 30;
		const utilizationRatio = maxConnections > 0 ? activeCount / maxConnections : 0;

		let status: HealthStatus = "healthy";
		if (waitingCount > 5 || utilizationRatio >= 0.95) {
			status = "critical";
		} else if (waitingCount > 0 || utilizationRatio >= 0.8) {
			status = "warning";
		}

		let isResponsive = true;
		let responseTimeMs: number | null = null;
		let lastError: string | null = null;

		const shouldPing = options?.checkDbPing !== false;
		if (shouldPing && targetPool) {
			const timeoutMs =
				options?.dbPingTimeoutMs ?? ServerHealthWatchdog.DEFAULT_DB_PING_TIMEOUT_MS;
			const startTime = Date.now();

			try {
				const queryPromise = targetPool.query("SELECT 1 AS health_check;");
				const timeoutPromise = new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error(`PostgreSQL ping timeout after ${timeoutMs}ms`)),
						timeoutMs,
					),
				);

				await Promise.race([queryPromise, timeoutPromise]);
				responseTimeMs = Date.now() - startTime;
			} catch (err) {
				isResponsive = false;
				status = "critical";
				lastError = err instanceof Error ? err.message : String(err);
			}
		}

		return {
			totalCount,
			idleCount,
			activeCount,
			waitingCount,
			maxConnections,
			utilizationRatio: Math.round(utilizationRatio * 10000) / 10000,
			status,
			isResponsive,
			responseTimeMs,
			lastError,
		};
	}

	/**
	 * Сбор метрик очередей фоновых задач (system_background_jobs).
	 */
	public static async collectQueueMetrics(options?: {
		customDb?: typeof db | undefined;
	}): Promise<QueueMetrics> {
		const targetDb = options?.customDb ?? db;

		try {
			const rawCounts = await targetDb
				.select({
					queueName: systemBackgroundJobs.queueName,
					status: systemBackgroundJobs.status,
					count: sql<number>`count(*)::int`,
				})
				.from(systemBackgroundJobs)
				.groupBy(systemBackgroundJobs.queueName, systemBackgroundJobs.status);

			const queues: Record<string, QueueBreakdown> = {};
			let totalJobs = 0;
			let pending = 0;
			let processing = 0;
			let deadLetter = 0;
			let failed = 0;
			let completed = 0;
			let cancelled = 0;

			for (const row of rawCounts) {
				const qName = row.queueName || "default";
				const count = Number(row.count) || 0;
				const st = row.status || "pending";

				if (!queues[qName]) {
					queues[qName] = {
						pending: 0,
						processing: 0,
						deadLetter: 0,
						failed: 0,
						completed: 0,
						cancelled: 0,
					};
				}

				totalJobs += count;

				switch (st) {
					case "pending":
						queues[qName].pending += count;
						pending += count;
						break;
					case "processing":
						queues[qName].processing += count;
						processing += count;
						break;
					case "dead_letter":
						queues[qName].deadLetter += count;
						deadLetter += count;
						break;
					case "failed":
						queues[qName].failed += count;
						failed += count;
						break;
					case "completed":
						queues[qName].completed += count;
						completed += count;
						break;
					case "cancelled":
						queues[qName].cancelled += count;
						cancelled += count;
						break;
					default:
						queues[qName].pending += count;
						pending += count;
						break;
				}
			}

			let status: HealthStatus = "healthy";
			if (deadLetter >= 10 || processing > 100) {
				status = "critical";
			} else if (deadLetter > 0 || pending > 500) {
				status = "warning";
			}

			return {
				totalJobs,
				pending,
				processing,
				deadLetter,
				failed,
				completed,
				cancelled,
				queues,
				status,
				lastError: null,
			};
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			return {
				totalJobs: 0,
				pending: 0,
				processing: 0,
				deadLetter: 0,
				failed: 0,
				completed: 0,
				cancelled: 0,
				queues: {},
				status: "warning",
				lastError: `Не удалось получить метрики очередей: ${errorMsg}`,
			};
		}
	}

	/**
	 * Получение комплексных системных метрик сервера (ОЗУ, БД, очереди).
	 */
	public static async getSystemMetrics(
		options: GetSystemMetricsOptions = {},
	): Promise<SystemMetrics> {
		const memory = ServerHealthWatchdog.collectMemoryMetrics({
			customMemoryUsage: options.customMemoryUsage,
			customHeapLimit: options.customHeapLimit,
			warningThresholdRatio: options.warningThresholdRatio,
			criticalThresholdRatio: options.criticalThresholdRatio,
		});

		const database = await ServerHealthWatchdog.collectDatabaseMetrics({
			customPool: options.customPool,
			checkDbPing: options.checkDbPing,
			dbPingTimeoutMs: options.dbPingTimeoutMs,
		});

		const queues = await ServerHealthWatchdog.collectQueueMetrics({
			customDb: options.customDb,
		});

		let status: HealthStatus = "healthy";
		const reasons: string[] = [];

		if (
			memory.status === "critical" ||
			database.status === "critical" ||
			queues.status === "critical"
		) {
			status = "critical";
		} else if (
			memory.status === "warning" ||
			database.status === "warning" ||
			queues.status === "warning"
		) {
			status = "warning";
		}

		if (memory.status !== "healthy") {
			reasons.push(memory.statusMessage);
		}
		if (database.status !== "healthy") {
			reasons.push(
				`PostgreSQL: status=${database.status}, waiting=${database.waitingCount}, active=${database.activeCount}/${database.maxConnections}${database.lastError ? ` (${database.lastError})` : ""}`,
			);
		}
		if (queues.status !== "healthy") {
			reasons.push(
				`Очереди: dead_letter=${queues.deadLetter}, pending=${queues.pending}${queues.lastError ? ` (${queues.lastError})` : ""}`,
			);
		}

		const statusReason =
			reasons.length > 0 ? reasons.join("; ") : "Все системы работают в штатном режиме.";

		return {
			timestamp: new Date().toISOString(),
			uptimeSeconds: Math.floor(process.uptime()),
			status,
			statusReason,
			environment: process.env.NODE_ENV ?? "development",
			nodeVersion: process.version,
			pid: process.pid,
			memory,
			database,
			queues,
		};
	}

	/**
	 * Преобразование метрик в формат Prometheus Exposition (OpenMetrics).
	 */
	public static toPrometheusMetrics(metrics: SystemMetrics): string {
		const statusNum = metrics.status === "healthy" ? 0 : metrics.status === "warning" ? 1 : 2;
		const memStatusNum =
			metrics.memory.status === "healthy" ? 0 : metrics.memory.status === "warning" ? 1 : 2;
		const dbStatusNum =
			metrics.database.status === "healthy" ? 0 : metrics.database.status === "warning" ? 1 : 2;
		const queueStatusNum =
			metrics.queues.status === "healthy" ? 0 : metrics.queues.status === "warning" ? 1 : 2;

		const lines: string[] = [
			"# HELP process_uptime_seconds Process uptime in seconds",
			"# TYPE process_uptime_seconds gauge",
			`process_uptime_seconds ${metrics.uptimeSeconds}`,
			"",
			"# HELP dente_health_status Overall server health status (0=healthy, 1=warning, 2=critical)",
			"# TYPE dente_health_status gauge",
			`dente_health_status ${statusNum}`,
			"",
			"# HELP nodejs_memory_heap_used_bytes Process heap memory used in bytes",
			"# TYPE nodejs_memory_heap_used_bytes gauge",
			`nodejs_memory_heap_used_bytes ${metrics.memory.heapUsed}`,
			"",
			"# HELP nodejs_memory_heap_total_bytes Process heap memory total in bytes",
			"# TYPE nodejs_memory_heap_total_bytes gauge",
			`nodejs_memory_heap_total_bytes ${metrics.memory.heapTotal}`,
			"",
			"# HELP nodejs_memory_rss_bytes Process resident set size in bytes",
			"# TYPE nodejs_memory_rss_bytes gauge",
			`nodejs_memory_rss_bytes ${metrics.memory.rss}`,
			"",
			"# HELP nodejs_memory_external_bytes Process external memory in bytes",
			"# TYPE nodejs_memory_external_bytes gauge",
			`nodejs_memory_external_bytes ${metrics.memory.external}`,
			"",
			"# HELP nodejs_memory_heap_size_limit_bytes V8 heap size limit in bytes",
			"# TYPE nodejs_memory_heap_size_limit_bytes gauge",
			`nodejs_memory_heap_size_limit_bytes ${metrics.memory.heapSizeLimit}`,
			"",
			"# HELP nodejs_memory_heap_usage_ratio Ratio of heap used to heap size limit",
			"# TYPE nodejs_memory_heap_usage_ratio gauge",
			`nodejs_memory_heap_usage_ratio ${metrics.memory.heapUsageRatio.toFixed(4)}`,
			"",
			"# HELP nodejs_memory_status Memory health status (0=healthy, 1=warning, 2=critical)",
			"# TYPE nodejs_memory_status gauge",
			`nodejs_memory_status ${memStatusNum}`,
			"",
			"# HELP pg_pool_connections_total Total connections in PostgreSQL pool",
			"# TYPE pg_pool_connections_total gauge",
			`pg_pool_connections_total ${metrics.database.totalCount}`,
			"",
			"# HELP pg_pool_connections_idle Idle connections in PostgreSQL pool",
			"# TYPE pg_pool_connections_idle gauge",
			`pg_pool_connections_idle ${metrics.database.idleCount}`,
			"",
			"# HELP pg_pool_connections_active Active connections currently checked out",
			"# TYPE pg_pool_connections_active gauge",
			`pg_pool_connections_active ${metrics.database.activeCount}`,
			"",
			"# HELP pg_pool_connections_max Maximum connections configured for pool",
			"# TYPE pg_pool_connections_max gauge",
			`pg_pool_connections_max ${metrics.database.maxConnections}`,
			"",
			"# HELP pg_pool_waiting_requests Total requests queued waiting for a client",
			"# TYPE pg_pool_waiting_requests gauge",
			`pg_pool_waiting_requests ${metrics.database.waitingCount}`,
			"",
			"# HELP pg_pool_is_responsive PostgreSQL responsive check (1=responsive, 0=unresponsive)",
			"# TYPE pg_pool_is_responsive gauge",
			`pg_pool_is_responsive ${metrics.database.isResponsive ? 1 : 0}`,
			"",
			"# HELP pg_pool_status Database pool health status (0=healthy, 1=warning, 2=critical)",
			"# TYPE pg_pool_status gauge",
			`pg_pool_status ${dbStatusNum}`,
		];

		if (metrics.database.responseTimeMs !== null) {
			lines.push(
				"",
				"# HELP pg_ping_response_time_ms PostgreSQL ping round-trip time in milliseconds",
				"# TYPE pg_ping_response_time_ms gauge",
				`pg_ping_response_time_ms ${metrics.database.responseTimeMs}`,
			);
		}

		lines.push(
			"",
			"# HELP dente_queue_status Background queue health status (0=healthy, 1=warning, 2=critical)",
			"# TYPE dente_queue_status gauge",
			`dente_queue_status ${queueStatusNum}`,
			"",
			"# HELP dente_queue_jobs_total Total background jobs by status",
			"# TYPE dente_queue_jobs_total gauge",
			`dente_queue_jobs_total{status="pending"} ${metrics.queues.pending}`,
			`dente_queue_jobs_total{status="processing"} ${metrics.queues.processing}`,
			`dente_queue_jobs_total{status="dead_letter"} ${metrics.queues.deadLetter}`,
			`dente_queue_jobs_total{status="failed"} ${metrics.queues.failed}`,
			`dente_queue_jobs_total{status="completed"} ${metrics.queues.completed}`,
			`dente_queue_jobs_total{status="cancelled"} ${metrics.queues.cancelled}`,
		);

		for (const [qName, qStats] of Object.entries(metrics.queues.queues)) {
			lines.push(
				`dente_queue_jobs{queue="${qName}",status="pending"} ${qStats.pending}`,
				`dente_queue_jobs{queue="${qName}",status="processing"} ${qStats.processing}`,
				`dente_queue_jobs{queue="${qName}",status="dead_letter"} ${qStats.deadLetter}`,
				`dente_queue_jobs{queue="${qName}",status="failed"} ${qStats.failed}`,
			);
		}

		lines.push("");
		return lines.join("\n");
	}

	/**
	 * Сохранение моментального снимка RAM в таблицу system_ram_watchdogs.
	 */
	public static async recordRamSnapshot(
		organizationId: string,
		customDb?: typeof db,
	): Promise<void> {
		if (!organizationId) {
			throw new Error("organizationId is required to record RAM snapshot");
		}

		const mem = process.memoryUsage();
		const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(2);

		const targetDb = customDb ?? db;

		await targetDb.insert(systemRamWatchdogs).values({
			organizationId,
			heapUsedMb: toMb(mem.heapUsed),
			heapTotalMb: toMb(mem.heapTotal),
			rssMb: toMb(mem.rss),
			externalMb: toMb(mem.external),
			gcCount: 0,
		});
	}
}
