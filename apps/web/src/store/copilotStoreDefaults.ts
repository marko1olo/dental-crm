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
	const hasFlag = (key: string): boolean => Boolean(Reflect.get(window, key));
	const ua = typeof navigator !== "undefined" && navigator.userAgent ? navigator.userAgent.toLowerCase() : "";
	if (
		hasFlag("denteDesktopNative") ||
		hasFlag("isElectron") ||
		hasFlag("__TAURI__") ||
		hasFlag("__TAURI_INTERNALS__") ||
		hasFlag("denteDesktop") ||
		hasFlag("denteNative") ||
		ua.includes("electron") ||
		ua.includes("tauri") ||
		ua.includes("dente-desktop")
	) {
		return "desktop_native";
	}
	const isCoarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
	const isTouch = (typeof navigator !== "undefined" && Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 0)) || ("ontouchstart" in window);
	const viewportWidth = typeof window.innerWidth === "number" ? window.innerWidth : 0;
	const isPhoneScreen = viewportWidth > 0 && viewportWidth < 768;
	const isTabletScreen = viewportWidth >= 768 && viewportWidth < 1024;

	if ((isCoarse || isTouch) && isPhoneScreen) {
		return "mobile_tablet";
	}
	if ((isCoarse || isTouch) && isTabletScreen) {
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
	byokModel: "gemini-3.6-flash",
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
	pinnedThreadIds: [],
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

export function buildRemoteSettingsPayload(next: CopilotSettings): Record<string, unknown> {
	const trimmedByokKey = next.byokApiKey?.trim();
	return {
		trustLevel: next.trustLevel,
		speedMode: next.speedMode,
		granularPermissions: next.granularPermissions,
		showTypingAnimation: next.showTypingAnimation,
		byokProvider: next.byokProvider,
		provider: next.provider,
		model: next.model,
		modelRoutingMode: next.modelRoutingMode,
		...(trimmedByokKey ? { byokApiKey: trimmedByokKey } : {}),
		...(next.byokModel ? { byokModel: next.byokModel } : {}),
		...(next.byokBaseUrl ? { byokBaseUrl: next.byokBaseUrl } : {}),
		diaryTemplate: next.diaryTemplate,
		clinicalSpecialization: next.clinicalSpecialization,
		customDoctorInstructions: next.customDoctorInstructions,
		showThinkingProcess: next.showThinkingProcess,
		temperature: next.temperature,
		contextLimitTokens: next.contextLimitTokens,
		maskPhiData: next.maskPhiData,
		speechEngine: next.speechEngine,
		autoSaveDrafts: next.autoSaveDrafts,
		webSpeechSensitivity: next.webSpeechSensitivity,
		globalDictationHotkey: next.globalDictationHotkey,
		autoMicOnAppointmentOpen: next.autoMicOnAppointmentOpen,
		localDropzonePath: next.localDropzonePath,
		gloveModeTouchTarget: next.gloveModeTouchTarget,
		screenWakeLock: next.screenWakeLock,
		hapticFeedbackEnabled: next.hapticFeedbackEnabled,
		runtimeMode: next.runtimeMode,
		...(next.pinnedThreadIds ? { pinnedThreadIds: next.pinnedThreadIds } : {}),
	};
}
