/**
 * @file copilotStoreDefaults.ts
 * @description Default settings, environment auto-detection, and initial state factory
 * for DENTE AI Copilot Store (Mandate 8b <= 150 lines, Mandate 8wy).
 */

import { isDemoShowcaseMode } from "../lib/demoMode";
import { safeLocalStorageGetJson } from "../lib/safeLocalStorage";
import {
	type ContextTelemetryData,
	PRODUCTION_TELEMETRY,
	SHOWCASE_TELEMETRY,
} from "../components/copilot/telemetry/telemetryTypes";
import {
	SHOWCASE_MEMORY_FACTS,
	SHOWCASE_THREADS,
	SHOWCASE_TOOL_LOGS,
} from "./copilotShowcaseData";
import type {
	AiMemoryFact,
	CopilotRuntimeEnvironment,
	CopilotSettings,
	CopilotThread,
	ToolExecutionLog,
} from "./copilotStore";

/**
 * Автоматическое определение среды исполнения врача:
 * 1. desktop_native: Electron / Tauri / Dente native wrapper
 * 2. chairside_tablet: сенсорный планшет у кресла / экран <= 1024px / coarse pointer
 * 3. web_browser: стандартный десктопный браузер
 */
export function detectRuntimeEnvironment(): CopilotRuntimeEnvironment {
	if (typeof window === "undefined") return "web_browser";
	const w = window as unknown as Record<string, unknown>;
	const ua = (typeof navigator !== "undefined" && navigator.userAgent) ? navigator.userAgent.toLowerCase() : "";
	if (
		Boolean(w.isElectron) ||
		Boolean(w.__TAURI__) ||
		Boolean(w.__TAURI_INTERNALS__) ||
		Boolean(w.denteDesktop) ||
		Boolean(w.denteNative) ||
		ua.includes("electron") ||
		ua.includes("tauri") ||
		ua.includes("dente-desktop")
	) {
		return "desktop_native";
	}
	const isCoarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
	const isTouch = (typeof navigator !== "undefined" && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) || ("ontouchstart" in window);
	const isSmallScreen = typeof window.innerWidth === "number" && window.innerWidth <= 1024;

	if (isCoarse || (isTouch && isSmallScreen)) {
		return "chairside_tablet";
	}
	return "web_browser";
}

export const DEFAULT_SETTINGS: CopilotSettings = {
	trustLevel: "balanced",
	provider: "gemini",
	model: "server_managed",
	modelRoutingMode: "server_managed",
	byokProvider: "gemini",
	byokApiKey: "",
	byokModel: "gemini-2.5-flash",
	speedMode: "turbo",
	showThinkingProcess: true,
	showTypingAnimation: true,
	clinicalSpecialization: "therapy",
	diaryTemplate: "soap",
	customDoctorInstructions: "",
	granularPermissions: {
		autoApproveFileReads: true,
		autoApproveFileWrites: false,
		autoApproveClinicalMutations: true,
		autoApproveFinancialDrafts: true,
		autoApproveExternalSoftware: false,
	},
	temperature: 0.2,
	contextLimitTokens: 32768,
	runtimeMode: detectRuntimeEnvironment(),
	// Браузер и Голос (Web Speech, 152-ФЗ)
	speechEngine: "gemini_live",
	autoSaveDrafts: true,
	webSpeechSensitivity: "normal",
	maskPhiData: true,
	globalDictationHotkey: "F9",
	autoMicOnAppointmentOpen: false,
	// Рабочая станция
	localDropzonePath: "C:\\Radiology\\Export",
	// Мобилка / Планшет
	gloveModeTouchTarget: true,
	screenWakeLock: true,
	hapticFeedbackEnabled: true,
};

/**
 * Инициализирует состояние стора с изоляцией Демо и Продакшн (Мандат 8wy).
 */
export function getInitialCopilotState() {
	const isDemo = isDemoShowcaseMode();
	const defaultThreads: CopilotThread[] = isDemo ? SHOWCASE_THREADS : [];
	const defaultMemory: AiMemoryFact[] = isDemo ? SHOWCASE_MEMORY_FACTS : [];
	const defaultLogs: ToolExecutionLog[] = isDemo ? SHOWCASE_TOOL_LOGS : [];
	const defaultTelemetry: ContextTelemetryData = isDemo ? SHOWCASE_TELEMETRY : PRODUCTION_TELEMETRY;

	const threads = safeLocalStorageGetJson("dente_copilot_threads", defaultThreads) || [];
	const memoryFacts = safeLocalStorageGetJson("dente_copilot_memory", defaultMemory) || [];
	const activeThreadId = threads.length > 0 ? (threads[0]?.id || "") : "";

	return {
		threads,
		activeThreadId,
		memoryFacts,
		toolExecutionLogs: defaultLogs,
		telemetry: defaultTelemetry,
	};
}
