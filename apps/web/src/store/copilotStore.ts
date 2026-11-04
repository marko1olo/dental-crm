/**
 * @file copilotStore.ts
 * @description SSOT Zustand store for DENTE AI Copilot: Settings, Trust Levels,
 * Dialog History & Threads, Long-term Clinical Memory, Tool Execution Logs & Diffs (Mandate 8b <= 450 lines).
 * Mandate 8wy: Strict Production vs Showcase separation via isDemoShowcaseMode().
 */

import { create } from "zustand";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../lib/demoMode";
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

export type AiTrustLevel = "confirm_all" | "balanced" | "autonomous";
export type AiProvider = "gemini" | "openai" | "anthropic" | "deepseek" | "groq";
export type AiSpeedMode = "turbo" | "deep_reasoning";
export type ModelRoutingMode = "server_managed" | "custom_byok";
export type ClinicalSpecialization = "therapy" | "orthopedics" | "surgery" | "orthodontics" | "perio" | "pediatric";
export type DiaryTemplate = "soap" | "form043" | "express";
export type CopilotRuntimeEnvironment = "web_browser" | "desktop_native" | "chairside_tablet" | "mobile_tablet";
export type TomographyViewerApp = "planmeca_romexis" | "vatech_ez3d" | "sirona_sidexis" | "custom";
export type WebSpeechSensitivity = "high" | "normal" | "low";

export interface GranularAgentPermissions {
	autoApproveFileReads: boolean;
	autoApproveFileWrites: boolean;
	autoApproveClinicalMutations: boolean;
	autoApproveFinancialDrafts: boolean;
	autoApproveExternalSoftware: boolean;
}

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

export interface AiMemoryFact {
	id: string;
	category: "materials" | "anesthesia" | "protocols" | "equipment" | "custom";
	fact: string;
	createdAt: string;
}

export interface CopilotThread {
	id: string;
	title: string;
	updatedAt: string;
	pinned?: boolean;
	patientName?: string;
	patientId?: string;
	messageCount: number;
	previewText?: string;
}

export interface ToolExecutionLog {
	id: string;
	toolName: string;
	category: "clinical" | "workstation" | "financial";
	status: "success" | "pending" | "running" | "rejected";
	durationMs?: number;
	args: Record<string, unknown>;
	resultSummary: string;
	timestamp: string;
}

export interface ActiveDiff {
	id: string;
	title: string;
	targetEntity: string;
	beforeText: string;
	afterText: string;
	applied?: boolean;
}

export interface CopilotSettings {
	trustLevel: AiTrustLevel;
	provider: AiProvider;
	model: string;
	modelRoutingMode: ModelRoutingMode;
	byokProvider: AiProvider;
	byokApiKey: string;
	byokModel: string;
	byokBaseUrl?: string;
	speedMode: AiSpeedMode;
	showThinkingProcess: boolean;
	clinicalSpecialization: ClinicalSpecialization;
	diaryTemplate: DiaryTemplate;
	customDoctorInstructions: string;
	granularPermissions: GranularAgentPermissions;
	temperature: number;
	runtimeMode: CopilotRuntimeEnvironment;
	// Браузер (Web Browser API)
	autoSaveDrafts: boolean;
	webSpeechSensitivity: WebSpeechSensitivity;
	maskPhiData: boolean;
	apiKeyMasked?: string;
	// Десктоп ПК (Workstation native)
	localDropzonePath: string;
	tomographyViewerApp: TomographyViewerApp;
	fiscalRegisterComPort: string;
	globalDictationHotkey: string;
	// Мобилка / Планшет у кресла
	gloveModeTouchTarget: boolean;
	screenWakeLock: boolean;
	hapticFeedbackEnabled: boolean;
	autoMicOnAppointmentOpen: boolean;
}

export interface CopilotStoreState {
	settings: CopilotSettings;
	memoryFacts: AiMemoryFact[];
	threads: CopilotThread[];
	activeThreadId: string;
	threadSearchQuery: string;
	toolExecutionLogs: ToolExecutionLog[];
	activeDiff: ActiveDiff | null;
	threadMessages: Record<string, any[]>;
	isSettingsOpen: boolean;
	isHistoryOpen: boolean;
	telemetry: ContextTelemetryData;

	// Actions
	updateSettings: (patch: Partial<CopilotSettings>) => void;
	setTrustLevel: (level: AiTrustLevel) => void;
	setRuntimeMode: (mode: CopilotRuntimeEnvironment) => void;
	refreshRuntimeEnvironment: () => CopilotRuntimeEnvironment;
	updateTelemetry: (patch: Partial<ContextTelemetryData>) => void;
	addMemoryFact: (category: AiMemoryFact["category"], fact: string) => void;
	removeMemoryFact: (id: string) => void;
	clearMemory: () => void;
	createThread: (patientName?: string, title?: string) => string;
	selectThread: (id: string) => void;
	deleteThread: (id: string) => void;
	togglePinThread: (id: string) => void;
	renameThread: (id: string, title: string) => void;
	setThreadSearchQuery: (query: string) => void;
	saveThreadMessages: (threadId: string, messages: any[]) => void;
	addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
	setActiveDiff: (diff: ActiveDiff | null) => void;
	applyActiveDiff: () => void;
	rejectActiveDiff: () => void;
	setSettingsOpen: (open: boolean) => void;
	setHistoryOpen: (open: boolean) => void;
}

const DEFAULT_SETTINGS: CopilotSettings = {
	trustLevel: "balanced",
	provider: "gemini",
	model: "server_managed",
	modelRoutingMode: "server_managed",
	byokProvider: "gemini",
	byokApiKey: "",
	byokModel: "gemini-2.5-flash",
	speedMode: "turbo",
	showThinkingProcess: true,
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
	runtimeMode: detectRuntimeEnvironment(),
	// Браузер
	autoSaveDrafts: true,
	webSpeechSensitivity: "normal",
	maskPhiData: true,
	// Десктоп ПК
	localDropzonePath: "C:\\Radiology\\Export",
	tomographyViewerApp: "planmeca_romexis",
	fiscalRegisterComPort: "COM1",
	globalDictationHotkey: "F9",
	// Мобилка / Планшет
	gloveModeTouchTarget: true,
	screenWakeLock: true,
	hapticFeedbackEnabled: true,
	autoMicOnAppointmentOpen: false,
};

/**
 * Инициализирует состояние стора с изоляцией Демо и Продакшн (Мандат 8wy).
 * В боевом режиме (!isDemoShowcaseMode()): чистые пустые массивы и нулевой контекст.
 * В демо-режиме (isDemoShowcaseMode()): витринные клинические примеры.
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

const initialState = getInitialCopilotState();

export const useCopilotStore = create<CopilotStoreState>((set, get) => ({
	settings: {
		...DEFAULT_SETTINGS,
		...(safeLocalStorageGetJson("dente_copilot_settings", DEFAULT_SETTINGS) || {}),
		runtimeMode: detectRuntimeEnvironment(),
	},
	memoryFacts: initialState.memoryFacts,
	threads: initialState.threads,
	activeThreadId: initialState.activeThreadId,
	threadMessages: safeLocalStorageGetJson("dente_copilot_thread_messages", {}) || {},
	threadSearchQuery: "",
	toolExecutionLogs: initialState.toolExecutionLogs,
	activeDiff: null,
	isSettingsOpen: false,
	isHistoryOpen: false,
	telemetry: initialState.telemetry,

	updateSettings: (patch) => {
		set((state) => {
			const next = { ...state.settings, ...patch };
			safeLocalStorageSetJson("dente_copilot_settings", next);
			return { settings: next };
		});
	},

	setTrustLevel: (level) => {
		get().updateSettings({ trustLevel: level });
	},

	setRuntimeMode: (mode) => {
		get().updateSettings({ runtimeMode: mode });
	},

	refreshRuntimeEnvironment: () => {
		const detected = detectRuntimeEnvironment();
		get().updateSettings({ runtimeMode: detected });
		return detected;
	},

	updateTelemetry: (patch) => {
		set((state) => ({
			telemetry: { ...state.telemetry, ...patch },
		}));
	},

	addMemoryFact: (category, fact) => {
		const newFact: AiMemoryFact = {
			id: `mem-${Date.now()}`,
			category,
			fact: fact.trim(),
			createdAt: new Date().toISOString().slice(0, 10),
		};
		set((state) => {
			const next = [newFact, ...state.memoryFacts];
			safeLocalStorageSetJson("dente_copilot_memory", next);
			return { memoryFacts: next };
		});
	},

	removeMemoryFact: (id) => {
		set((state) => {
			const next = state.memoryFacts.filter((f) => f.id !== id);
			safeLocalStorageSetJson("dente_copilot_memory", next);
			return { memoryFacts: next };
		});
	},

	clearMemory: () => {
		set(() => {
			safeLocalStorageSetJson("dente_copilot_memory", []);
			return { memoryFacts: [] };
		});
	},

	createThread: (patientName = "Новый пациент", title = "Новый клинический диалог") => {
		const newId = `thread-${Date.now()}`;
		const newThread: CopilotThread = {
			id: newId,
			title,
			updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
			patientName,
			messageCount: 0,
		};
		set((state) => {
			const next = [newThread, ...state.threads];
			safeLocalStorageSetJson("dente_copilot_threads", next);
			return { threads: next, activeThreadId: newId };
		});
		return newId;
	},

	selectThread: (id) => {
		set({ activeThreadId: id, isHistoryOpen: false });
	},

	deleteThread: (id) => {
		set((state) => {
			const next = state.threads.filter((t) => t.id !== id);
			safeLocalStorageSetJson("dente_copilot_threads", next);
			const activeId = state.activeThreadId === id ? (next[0]?.id || "") : state.activeThreadId;
			return { threads: next, activeThreadId: activeId };
		});
	},

	togglePinThread: (id) => {
		set((state) => {
			const next = state.threads.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t));
			safeLocalStorageSetJson("dente_copilot_threads", next);
			return { threads: next };
		});
	},

	renameThread: (id, title) => {
		set((state) => {
			const next = state.threads.map((t) => (t.id === id ? { ...t, title } : t));
			safeLocalStorageSetJson("dente_copilot_threads", next);
			return { threads: next };
		});
	},

	setThreadSearchQuery: (query) => {
		set({ threadSearchQuery: query });
	},

	saveThreadMessages: (threadId, messages) => {
		set((state) => {
			const next = { ...state.threadMessages, [threadId]: messages };
			safeLocalStorageSetJson("dente_copilot_thread_messages", next);
			return { threadMessages: next };
		});
	},

	addToolLog: (log) => {
		const newLog: ToolExecutionLog = {
			...log,
			id: `log-${Date.now()}`,
			timestamp: new Date().toLocaleTimeString(),
		};
		set((state) => ({
			toolExecutionLogs: [newLog, ...state.toolExecutionLogs.slice(0, 49)],
		}));
	},

	setActiveDiff: (diff) => {
		set({ activeDiff: diff });
	},

	applyActiveDiff: () => {
		set((state) => ({
			activeDiff: state.activeDiff ? { ...state.activeDiff, applied: true } : null,
		}));
	},

	rejectActiveDiff: () => {
		set({ activeDiff: null });
	},

	setSettingsOpen: (open) => set({ isSettingsOpen: open }),
	setHistoryOpen: (open) => set({ isHistoryOpen: open }),
}));

if (typeof window !== "undefined") {
	let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	window.addEventListener("resize", () => {
		if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
		resizeDebounceTimer = setTimeout(() => {
			const current = useCopilotStore.getState().settings.runtimeMode;
			const detected = detectRuntimeEnvironment();
			if (current !== detected) {
				useCopilotStore.getState().setRuntimeMode(detected);
			}
		}, 150);
	});
}
