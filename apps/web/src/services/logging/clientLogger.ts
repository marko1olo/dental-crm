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
	generateCorrelationId,
	generateUuidV7,
	sanitizePayload,
	sanitizeString,
} from "@dental/shared";

export const MAX_SYSTEM_LOGS = 500;
export const MAX_NETWORK_LOGS = 200;

export type LogListener = (entry: ClientLogEntry) => void;
export type NetworkListener = (entry: NetworkLogEntry) => void;

class ClientLoggerService {
	private systemLogs: ClientLogEntry[] = [];
	private networkLogs: NetworkLogEntry[] = [];
	private logListeners: Set<LogListener> = new Set();
	private networkListeners: Set<NetworkListener> = new Set();
	private fetchInterceptorInstalled = false;
	private globalErrorListenersInstalled = false;

	constructor() {
		if (typeof window !== "undefined" && typeof window.document !== "undefined") {
			this.installFetchInterceptor();
			this.installGlobalErrorListeners();
			this.installNetworkStatusListeners();
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
		const entry: ClientLogEntry = {
			id: generateUuidV7(),
			timestamp: new Date().toISOString(),
			level,
			module: context?.module || "App",
			message: sanitizeString(message),
			data: data !== undefined ? sanitizePayload(data) : undefined,
			stack: data instanceof Error ? data.stack : undefined,
			correlationId: context?.correlationId,
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
	 * Отслеживание событий подключения к сети (online/offline)
	 */
	public installNetworkStatusListeners(): void {
		if (typeof window === "undefined") return;

		window.addEventListener("online", () => {
			this.info("Сеть восстановлена: клиент перешел в статус ONLINE", null, {
				module: "NetworkState",
			});
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
		const jsonString = JSON.stringify(report, null, 2);

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
