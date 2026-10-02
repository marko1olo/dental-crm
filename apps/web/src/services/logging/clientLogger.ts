/**
 * DENTE CRM — Client Structured Logger & Observability Engine
 *
 * Централизованный клиентский логгер с кольцевым буфером, перехватчиком fetch,
 * отслеживанием Correlation ID, санитизацией ПДн (152-ФЗ) и выгрузкой диагностических отчетов.
 */

import {
	CORRELATION_ID_HEADER,
	type ClientLogEntry,
	type DiagnosticReportPayload,
	type LogContext,
	type LogLevel,
	type NetworkLogEntry,
	type StaffActionAuditEntry,
	type StaffActionType,
	generateCorrelationId,
	generateUuidV7,
	sanitizeAuditPayload,
	sanitizePayload,
	sanitizeString,
} from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export const MAX_SYSTEM_LOGS = 500;
export const MAX_NETWORK_LOGS = 200;
export const OFFLINE_STAFF_AUDIT_STORAGE_KEY = "dente_offline_staff_audit_buffer";

export type LogListener = (entry: ClientLogEntry) => void;
export type NetworkListener = (entry: NetworkLogEntry) => void;

class ClientLoggerService {
	private systemLogs: ClientLogEntry[] = [];
	private networkLogs: NetworkLogEntry[] = [];
	private offlineStaffAuditBuffer: StaffActionAuditEntry[] = [];
	private isFlushingStaffAudit = false;
	private flushDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	private renderJankEvents: Array<{ timestamp: string; durationMs: number }> = [];
	private renderPacingInstalled = false;
	private logListeners: Set<LogListener> = new Set();
	private networkListeners: Set<NetworkListener> = new Set();
	private fetchInterceptorInstalled = false;
	private globalErrorListenersInstalled = false;

	constructor() {
		if (typeof window !== "undefined" && typeof window.document !== "undefined") {
			this.loadOfflineAuditBuffer();
			this.installFetchInterceptor();
			this.installGlobalErrorListeners();
			this.installNetworkStatusListeners();
			this.installRenderPacingMonitor();
		}
	}

	/**
	 * Запись лога в кольцевой буфер и уведомление слушателей
	 */
	public log(
		level: LogLevel,
		message: string,
		data?: unknown,
		context?: LogContext,
	): ClientLogEntry {
		let sanitizedData: unknown = undefined;
		if (data !== undefined) {
			try {
				sanitizedData = sanitizePayload(data);
			} catch {
				sanitizedData = "[UNSANITIZABLE_DATA]";
			}
		}

		const entry: ClientLogEntry = {
			id: generateUuidV7(),
			timestamp: new Date().toISOString(),
			level,
			module: context?.module ? sanitizeString(context.module) : "App",
			message: sanitizeString(message),
			data: sanitizedData,
			stack: data instanceof Error ? (data.stack ? sanitizeString(data.stack) : undefined) : undefined,
			correlationId: context?.correlationId ? sanitizeString(context.correlationId) : undefined,
		};

		this.systemLogs.push(entry);
		if (this.systemLogs.length > MAX_SYSTEM_LOGS) {
			this.systemLogs.shift();
		}

		// Вывод в системную консоль браузера
		this.outputToConsole(entry);

		// Уведомление живых слушателей (UI HUD)
		for (const listener of this.logListeners) {
			try {
				listener(entry);
			} catch {
				// Ignore listener errors to protect main thread
			}
		}

		return entry;
	}

	public debug(message: string, data?: unknown, context?: LogContext): ClientLogEntry {
		return this.log("DEBUG", message, data, context);
	}

	public info(message: string, data?: unknown, context?: LogContext): ClientLogEntry {
		return this.log("INFO", message, data, context);
	}

	public warn(message: string, data?: unknown, context?: LogContext): ClientLogEntry {
		return this.log("WARN", message, data, context);
	}

	public error(message: string, data?: unknown, context?: LogContext): ClientLogEntry {
		return this.log("ERROR", message, data, context);
	}

	public audit(message: string, data?: unknown, context?: LogContext): ClientLogEntry {
		return this.log("AUDIT", message, data, context);
	}

	/**
	 * Запись сетевого запроса в буфер сетевой телеметрии
	 */
	public recordNetwork(entry: Omit<NetworkLogEntry, "id">): NetworkLogEntry {
		const fullEntry: NetworkLogEntry = {
			...entry,
			id: generateUuidV7(),
		};

		this.networkLogs.push(fullEntry);
		if (this.networkLogs.length > MAX_NETWORK_LOGS) {
			this.networkLogs.shift();
		}

		for (const listener of this.networkListeners) {
			try {
				listener(fullEntry);
			} catch {
				// Ignore listener errors
			}
		}

		return fullEntry;
	}

	/**
	 * Получение копии текущих логов
	 */
	public getLogs(): readonly ClientLogEntry[] {
		return [...this.systemLogs];
	}

	/**
	 * Получение копии журнала сетевых запросов
	 */
	public getNetworkLogs(): readonly NetworkLogEntry[] {
		return [...this.networkLogs];
	}

	/**
	 * Очистка буфера логов
	 */
	public clearLogs(): void {
		this.systemLogs = [];
		this.networkLogs = [];
	}

	/**
	 * Подписка на поток системных логов
	 */
	public subscribeLogs(listener: LogListener): () => void {
		this.logListeners.add(listener);
		return () => {
			this.logListeners.delete(listener);
		};
	}

	/**
	 * Подписка на поток сетевых запросов
	 */
	public subscribeNetwork(listener: NetworkListener): () => void {
		this.networkListeners.add(listener);
		return () => {
			this.networkListeners.delete(listener);
		};
	}

	/**
	 * Установка перехватчика fetch для автоматического добавления X-Correlation-Id
	 * и логирования сетевой активности
	 */
	public installFetchInterceptor(): void {
		if (this.fetchInterceptorInstalled || typeof window === "undefined" || !window.fetch) {
			return;
		}

		const originalFetch = window.fetch;
		const self = this;

		window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
			const startTime = performance.now();
			const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
			const method = (init?.method || (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
			const path = url.startsWith("http")
				? new URL(url, window.location.origin).pathname
				: (url.split("?")[0] ?? url);

			// Генерируем или сохраняем существующий Correlation ID
			const headers = new Headers(init?.headers || (typeof input === "object" && "headers" in input ? input.headers : undefined));
			let correlationId = headers.get(CORRELATION_ID_HEADER);
			if (!correlationId) {
				correlationId = generateCorrelationId("web");
				headers.set(CORRELATION_ID_HEADER, correlationId);
			}

			// Превью тела запроса для отладки
			let requestBodyPreview: string | undefined;
			if (init?.body && typeof init.body === "string") {
				try {
					const parsed = JSON.parse(init.body);
					requestBodyPreview = JSON.stringify(sanitizePayload(parsed));
				} catch {
					requestBodyPreview = sanitizeString(init.body.slice(0, 300));
				}
			}

			const modifiedInit: RequestInit = {
				...init,
				headers,
			};

			try {
				const response = await originalFetch.call(this, input, modifiedInit);
				const latencyMs = Number((performance.now() - startTime).toFixed(2));

				self.recordNetwork({
					timestamp: new Date().toISOString(),
					method,
					url,
					path,
					statusCode: response.status,
					latencyMs,
					correlationId,
					requestBodyPreview,
					success: response.ok,
				});

				return response;
			} catch (err: unknown) {
				const latencyMs = Number((performance.now() - startTime).toFixed(2));
				const errorMessage = err instanceof Error ? err.message : String(err);

				self.recordNetwork({
					timestamp: new Date().toISOString(),
					method,
					url,
					path,
					statusCode: 0,
					latencyMs,
					correlationId,
					requestBodyPreview,
					error: errorMessage,
					success: false,
				});

				self.error(`[Network Error] ${method} ${url} failed after ${latencyMs}ms: ${errorMessage}`, err, {
					module: "Network",
					correlationId,
				});

				throw err;
			}
		};

		this.fetchInterceptorInstalled = true;
	}

	/**
	 * Перехват глобальных ошибок и unhandled promise rejections
	 */
	public installGlobalErrorListeners(): void {
		if (this.globalErrorListenersInstalled || typeof window === "undefined") {
			return;
		}

		window.addEventListener("error", (event) => {
			this.error(
				`[Global Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
				event.error,
				{ module: "WindowError" },
			);
		});

		window.addEventListener("unhandledrejection", (event) => {
			const reason = event.reason;
			this.error(
				`[Unhandled Promise Rejection] ${reason instanceof Error ? reason.message : String(reason)}`,
				reason,
				{ module: "PromiseRejection" },
			);
		});

		this.globalErrorListenersInstalled = true;
	}

	/**
	 * Загрузка сохраненного буфера аудита действий персонала из localStorage
	 */
	public loadOfflineAuditBuffer(): void {
		const storage =
			typeof window !== "undefined" && window.localStorage
				? window.localStorage
				: typeof localStorage !== "undefined"
					? localStorage
					: null;
		if (!storage) return;
		try {
			const saved = storage.getItem(OFFLINE_STAFF_AUDIT_STORAGE_KEY);
			if (saved) {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed)) {
					this.offlineStaffAuditBuffer = parsed;
				}
			}
		} catch {
			this.offlineStaffAuditBuffer = [];
		}
	}

	/**
	 * Сохранение локального буфера аудита действий персонала в localStorage
	 */
	private saveOfflineAuditBuffer(): void {
		const storage =
			typeof window !== "undefined" && window.localStorage
				? window.localStorage
				: typeof localStorage !== "undefined"
					? localStorage
					: null;
		if (!storage) return;
		try {
			storage.setItem(
				OFFLINE_STAFF_AUDIT_STORAGE_KEY,
				JSON.stringify(this.offlineStaffAuditBuffer.slice(-300)),
			);
		} catch {
			// Ignore quota exceeded or storage disabled
		}
	}

	/**
	 * Регистрация юридически значимого действия персонала (152-ФЗ / 323-ФЗ)
	 * с гарантированным оффлайн-буферизированием и фоновой отправкой.
	 */
	public recordStaffAction(entry: {
		actionType: StaffActionType;
		entityType: string;
		entityId: string;
		patientId?: string | null | undefined;
		actorUserId?: string | null | undefined;
		actorRole?: string | null | undefined;
		actorName?: string | null | undefined;
		details?: Record<string, unknown> | undefined;
		reason?: string | null | undefined;
		organizationId?: string | undefined;
	}): StaffActionAuditEntry {
		let sanitizedDetails: Record<string, unknown> = {};
		if (entry.details) {
			try {
				sanitizedDetails = sanitizeAuditPayload(entry.details) as Record<string, unknown>;
			} catch {
				sanitizedDetails = { error: "unserializable_details" };
			}
		}

		const fullEntry: StaffActionAuditEntry = {
			id: generateUuidV7(),
			organizationId: entry.organizationId || "00000000-0000-0000-0000-000000000000",
			actionType: entry.actionType,
			entityType: sanitizeString(entry.entityType),
			entityId: sanitizeString(entry.entityId),
			patientId: entry.patientId || null,
			actorUserId: entry.actorUserId || null,
			actorRole: entry.actorRole ? sanitizeString(entry.actorRole) : null,
			actorName: entry.actorName ? sanitizeString(entry.actorName) : null,
			details: sanitizedDetails,
			reason: entry.reason ? sanitizeString(entry.reason) : null,
			clientTimestamp: new Date().toISOString(),
		};

		this.offlineStaffAuditBuffer.push(fullEntry);
		if (this.offlineStaffAuditBuffer.length > 300) {
			this.offlineStaffAuditBuffer.shift();
		}
		this.saveOfflineAuditBuffer();

		// Логируем в локальный журнал
		this.audit(
			`[StaffAction] ${fullEntry.actionType} on ${fullEntry.entityType}:${fullEntry.entityId}`,
			fullEntry.details,
			{ module: "StaffAudit" },
		);

		// Запускаем отложенный сброс буфера на сервер
		this.scheduleFlushStaffAuditBuffer();

		return fullEntry;
	}

	/**
	 * Планирование отправки буфера аудита на сервер (с дебаунсом 1.5 сек)
	 */
	public scheduleFlushStaffAuditBuffer(): void {
		if (this.flushDebounceTimer) {
			clearTimeout(this.flushDebounceTimer);
		}
		this.flushDebounceTimer = setTimeout(() => {
			this.flushDebounceTimer = null;
			void this.flushStaffAuditBuffer();
		}, 1500);
	}

	/**
	 * Пакетная отправка буфера аудита персонала на сервер (/api/audit/events/batch)
	 */
	public async flushStaffAuditBuffer(): Promise<number> {
		if (this.isFlushingStaffAudit || this.offlineStaffAuditBuffer.length === 0) {
			return 0;
		}
		if (typeof navigator !== "undefined" && !navigator.onLine) {
			return 0;
		}

		this.isFlushingStaffAudit = true;
		let flushedCount = 0;

		try {
			const batch = this.offlineStaffAuditBuffer.slice(0, 50);
			if (batch.length === 0) return 0;

			const response = await fetch("/api/audit/events/batch", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...denteAdminSecretRequestHeaders(),
				},
				body: JSON.stringify({ events: batch }),
			});

			if (response.ok) {
				const sentIds = new Set(batch.map((e) => e.id));
				this.offlineStaffAuditBuffer = this.offlineStaffAuditBuffer.filter(
					(e) => !sentIds.has(e.id),
				);
				this.saveOfflineAuditBuffer();
				flushedCount = batch.length;

				// Если в буфере еще остались записи, отправляем следующую пачку
				if (this.offlineStaffAuditBuffer.length > 0) {
					setTimeout(() => void this.flushStaffAuditBuffer(), 200);
				}
			}
		} catch (err) {
			// Сохраняем в локальном буфере до восстановления связи
			this.warn("Фоновая синхронизация журнала аудита отложена до восстановления сети", err, {
				module: "StaffAudit",
			});
		} finally {
			this.isFlushingStaffAudit = false;
		}

		return flushedCount;
	}

	public getPendingStaffAuditCount(): number {
		return this.offlineStaffAuditBuffer.length;
	}

	/**
	 * Измерение реальных операционных метрик сетевой задержки (Zero Math.random)
	 */
	public getRealLatencyMetrics(): {
		count: number;
		p50Ms: number;
		p95Ms: number;
		avgMs: number;
		minMs: number;
		maxMs: number;
	} {
		const validLogs = this.networkLogs.filter(
			(l): l is NetworkLogEntry & { latencyMs: number } =>
				typeof l.statusCode === "number" &&
				l.statusCode > 0 &&
				typeof l.latencyMs === "number" &&
				l.latencyMs > 0,
		);
		if (validLogs.length === 0) {
			return { count: 0, p50Ms: 0, p95Ms: 0, avgMs: 0, minMs: 0, maxMs: 0 };
		}

		const latencies: number[] = validLogs
			.map((l) => l.latencyMs)
			.sort((a: number, b: number) => a - b);
		const count = latencies.length;
		const p50Index = Math.floor(count * 0.5);
		const p95Index = Math.min(count - 1, Math.floor(count * 0.95));
		let sum = 0;
		for (const val of latencies) {
			sum += val;
		}

		return {
			count,
			p50Ms: latencies[p50Index] ?? 0,
			p95Ms: latencies[p95Index] ?? 0,
			avgMs: Number((sum / count).toFixed(1)),
			minMs: latencies[0] ?? 0,
			maxMs: latencies[count - 1] ?? 0,
		};
	}

	/**
	 * Мониторинг темпа отрисовки (Render Pacing) и микро-фризов интерфейса (>50мс)
	 */
	public installRenderPacingMonitor(): void {
		if (this.renderPacingInstalled || typeof window === "undefined" || !window.requestAnimationFrame) {
			return;
		}
		this.renderPacingInstalled = true;

		let lastFrameTime = performance.now();
		const checkFrame = (now: number) => {
			const delta = now - lastFrameTime;
			lastFrameTime = now;

			// Если вкладка активна и кадр занял > 50мс (просадка ниже 20 fps)
			if (typeof document !== "undefined" && !document.hidden && delta > 50) {
				this.renderJankEvents.push({
					timestamp: new Date().toISOString(),
					durationMs: Math.round(delta),
				});
				if (this.renderJankEvents.length > 50) {
					this.renderJankEvents.shift();
				}
			}

			if (typeof window !== "undefined" && window.requestAnimationFrame) {
				window.requestAnimationFrame(checkFrame);
			}
		};

		window.requestAnimationFrame(checkFrame);
	}

	public getRenderJankCount(): number {
		return this.renderJankEvents.length;
	}

	/**
	 * Отслеживание событий подключения к сети (online/offline)
	 */
	public installNetworkStatusListeners(): void {
		if (typeof window === "undefined") return;

		window.addEventListener("online", () => {
			this.info("Сеть восстановлена: клиент перешел в статус ONLINE", null, {
				module: "NetworkState",
			});
			void this.flushStaffAuditBuffer();
		});

		window.addEventListener("offline", () => {
			this.warn("Потеряно сетевое подключение: клиент перешел в статус OFFLINE", null, {
				module: "NetworkState",
			});
		});
	}

	/**
	 * Формирование полного диагностического отчета в формате JSON
	 */
	public async generateDiagnosticReport(
		sessionContext?: DiagnosticReportPayload["sessionContext"],
		offlineQueueSummary?: DiagnosticReportPayload["offlineQueueSummary"],
	): Promise<DiagnosticReportPayload> {
		let storageStats: DiagnosticReportPayload["storage"] = undefined;
		if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
			try {
				const estimate = await navigator.storage.estimate();
				const quota = estimate.quota || 0;
				const usage = estimate.usage || 0;
				storageStats = {
					quotaBytes: quota,
					usageBytes: usage,
					percentUsed: quota > 0 ? Number(((usage / quota) * 100).toFixed(1)) : 0,
				};
			} catch {
				// Ignore storage estimate failure
			}
		}

		const navConnection = typeof navigator !== "undefined"
			? (navigator as Navigator & { connection?: { downlink?: number; effectiveType?: string; rtt?: number } }).connection
			: undefined;

		return {
			appName: "DENTE Dental CRM",
			appVersion: "0.1.0",
			generatedAt: new Date().toISOString(),
			environment: typeof import.meta !== "undefined" && import.meta.env?.MODE ? import.meta.env.MODE : "unknown",
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "Node.js",
			platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
			screen: {
				width: typeof window !== "undefined" ? window.innerWidth : 1440,
				height: typeof window !== "undefined" ? window.innerHeight : 900,
				devicePixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1,
			},
			network: {
				online: typeof navigator !== "undefined" ? navigator.onLine : true,
				downlink: navConnection?.downlink,
				effectiveType: navConnection?.effectiveType,
				rtt: navConnection?.rtt,
			},
			storage: storageStats,
			sessionContext,
			systemLogs: this.getLogs(),
			networkLogs: this.getNetworkLogs(),
			offlineQueueSummary,
		};
	}

	/**
	 * Выгрузка диагностического файла .json в браузере (1-клик экспорт)
	 */
	public async downloadDiagnosticReport(
		sessionContext?: DiagnosticReportPayload["sessionContext"],
		offlineQueueSummary?: DiagnosticReportPayload["offlineQueueSummary"],
	): Promise<void> {
		const report = await this.generateDiagnosticReport(sessionContext, offlineQueueSummary);
		let jsonString: string;
		try {
			jsonString = JSON.stringify(sanitizePayload(report), null, 2);
		} catch {
			jsonString = JSON.stringify({
				error: "Failed to serialize complete diagnostic report",
				generatedAt: new Date().toISOString(),
				appName: "DENTE Dental CRM",
			}, null, 2);
		}

		if (typeof document !== "undefined") {
			const blob = new Blob([jsonString], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `dente-diagnostic-report-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		}
	}

	private outputToConsole(entry: ClientLogEntry): void {
		const prefix = `[${entry.module}]`;
		const data = entry.data !== undefined ? entry.data : "";

		switch (entry.level) {
			case "DEBUG":
				if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
					console.debug(prefix, entry.message, data);
				}
				break;
			case "INFO":
			case "AUDIT":
				if (typeof import.meta !== "undefined" && import.meta.env?.DEV) {
					console.info(prefix, entry.message, data);
				}
				break;
			case "WARN":
				console.warn(prefix, entry.message, data);
				break;
			case "ERROR":
				console.error(prefix, entry.message, data, entry.stack || "");
				break;
		}
	}
}

export const clientLogger = new ClientLoggerService();
export default clientLogger;
