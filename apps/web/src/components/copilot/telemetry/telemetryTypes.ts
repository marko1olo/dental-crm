/**
 * @file telemetryTypes.ts
 * @description Canonical SSOT data contracts for DENTE AI Copilot Context Telemetry.
 * Mandate 8b: <= 60 lines. Mandate 8wy: Production vs Showcase isolation.
 */

export interface ContextTelemetryData {
	patientName: string;
	patientId: string;
	activeTooth: number | null;
	modelBadge: string;
	latencyMs: number;
	activeTokens: number;
	maxTokens: number;
	gatewayStatus: "cloud_active" | "local_deterministic";
}

/** Боевая телеметрия: чистый нулевой контекст без вымышленных пациентов */
export const PRODUCTION_TELEMETRY: ContextTelemetryData = {
	patientName: "",
	patientId: "",
	activeTooth: null,
	modelBadge: "Gemini 2.5 Flash",
	latencyMs: 0,
	activeTokens: 0,
	maxTokens: 128000,
	gatewayStatus: "cloud_active",
};

/** Демо-витринная телеметрия для презентаций */
export const SHOWCASE_TELEMETRY: ContextTelemetryData = {
	patientName: "Иванов Иван Иванович",
	patientId: "pat-active",
	activeTooth: 36,
	modelBadge: "Gemini 2.5 Flash",
	latencyMs: 450,
	activeTokens: 14250,
	maxTokens: 128000,
	gatewayStatus: "cloud_active",
};

export const DEFAULT_TELEMETRY = PRODUCTION_TELEMETRY;
