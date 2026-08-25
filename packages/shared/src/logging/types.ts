/**
 * DENTE CRM — Structured Logging & Observability Types
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "AUDIT";

export interface LogContext {
	readonly module?: string | undefined;
	readonly category?: string | undefined;
	readonly correlationId?: string | undefined;
	readonly organizationId?: string | null | undefined;
	readonly userId?: string | null | undefined;
	readonly userRole?: string | null | undefined;
	readonly [key: string]: unknown;
}

export interface ClientLogEntry {
	readonly id: string;
	readonly timestamp: string;
	readonly level: LogLevel;
	readonly module: string;
	readonly message: string;
	readonly data?: unknown;
	readonly stack?: string | undefined;
	readonly correlationId?: string | undefined;
}

export interface NetworkLogEntry {
	readonly id: string;
	readonly timestamp: string;
	readonly method: string;
	readonly url: string;
	readonly path: string;
	readonly statusCode?: number | undefined;
	readonly latencyMs?: number | undefined;
	readonly correlationId: string;
	readonly requestHeaders?: Record<string, string> | undefined;
	readonly requestBodyPreview?: string | undefined;
	readonly responsePreview?: string | undefined;
	readonly error?: string | undefined;
	readonly success: boolean;
}

export interface DiagnosticReportPayload {
	readonly appName: string;
	readonly appVersion: string;
	readonly generatedAt: string;
	readonly environment: string;
	readonly userAgent: string;
	readonly platform: string;
	readonly screen: {
		readonly width: number;
		readonly height: number;
		readonly devicePixelRatio: number;
	};
	readonly network: {
		readonly online: boolean;
		readonly downlink?: number | undefined;
		readonly effectiveType?: string | undefined;
		readonly rtt?: number | undefined;
	};
	readonly storage?: {
		readonly quotaBytes?: number | undefined;
		readonly usageBytes?: number | undefined;
		readonly percentUsed?: number | undefined;
	} | undefined;
	readonly sessionContext?: {
		readonly organizationId?: string | null | undefined;
		readonly userId?: string | null | undefined;
		readonly userRole?: string | null | undefined;
	} | undefined;
	readonly systemLogs: readonly ClientLogEntry[];
	readonly networkLogs: readonly NetworkLogEntry[];
	readonly offlineQueueSummary?: {
		readonly pendingCount: number;
		readonly failedCount: number;
		readonly draftsCount: number;
		readonly clockSkewMs: number;
	} | undefined;
}
