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
import {
	appendRemoteMessage,
	createRemoteSession,
	deleteRemoteSession,
	fetchRemoteMessages,
	fetchRemoteSessions,
	fetchRemoteMemoryFacts,
	saveRemoteMemoryFacts,
	generateSessionUuid,
	isSessionUuid,
	updateRemoteSession,
} from "./copilotSessionApi";
import {
	DEFAULT_SETTINGS,
	detectRuntimeEnvironment,
	getInitialCopilotState,
} from "./copilotStoreDefaults";

export { DEFAULT_SETTINGS, detectRuntimeEnvironment, getInitialCopilotState };

export type AiTrustLevel = "confirm_all" | "balanced" | "autonomous";
export type AiProvider = "gemini" | "openai" | "anthropic" | "deepseek" | "groq";
export type AiSpeedMode = "turbo" | "deep_reasoning";
export type ModelRoutingMode = "server_managed" | "custom_byok";
export type ClinicalSpecialization = "therapy" | "orthopedics" | "surgery" | "orthodontics" | "perio" | "pediatric";
export type DiaryTemplate = "soap" | "treatment_diary" | "form043" | "express";
export type CopilotRuntimeEnvironment = "web_browser" | "desktop_native" | "chairside_tablet" | "mobile_tablet";
export type WebSpeechSensitivity = "high" | "normal" | "low";
export type SpeechEngine = "gemini_live" | "whisper" | "web_speech";

export interface GranularAgentPermissions {
	autoApproveFileReads: boolean;
	autoApproveFileWrites: boolean;
	autoApproveClinicalMutations: boolean;
	autoApproveFinancialDrafts: boolean;
	autoApproveExternalSoftware: boolean;
}

export interface AiMemoryFact {
	id: string;
	category: "materials" | "anesthesia" | "protocols" | "equipment" | "diagnosis" | "custom";
	fact: string;
	createdAt: string;
}

export interface CopilotThread {
	id: string;
	title: string;
	updatedAt: string;
	createdAt?: string;
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
	showTypingAnimation?: boolean;
	clinicalSpecialization: ClinicalSpecialization;
	diaryTemplate: DiaryTemplate;
	customDoctorInstructions: string;
	granularPermissions: GranularAgentPermissions;
	temperature: number;
	contextLimitTokens?: number;
	runtimeMode: CopilotRuntimeEnvironment;
	// Браузер и Голос (Web Speech API, 152-ФЗ)
	speechEngine?: SpeechEngine;
	autoSaveDrafts: boolean;
	webSpeechSensitivity: WebSpeechSensitivity;
	maskPhiData: boolean;
	apiKeyMasked?: string;
	globalDictationHotkey: string;
	autoMicOnAppointmentOpen: boolean;
	// Рабочая станция (чтение снимков DICOM / экспорт)
	localDropzonePath: string;
	// Мобилка / Планшет у кресла
	gloveModeTouchTarget: boolean;
	screenWakeLock: boolean;
	hapticFeedbackEnabled: boolean;
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
	updateMemoryFact: (id: string, fact: string, category?: AiMemoryFact["category"]) => void;
	removeMemoryFact: (id: string) => void;
	clearMemory: () => void;
	createThread: (patientName?: string, title?: string) => string;
	selectThread: (id: string) => void;
	deleteThread: (id: string) => void;
	clearThreads: () => void;
	togglePinThread: (id: string) => void;
	renameThread: (id: string, title: string) => void;
	setThreadSearchQuery: (query: string) => void;
	saveThreadMessages: (threadId: string, messages: any[]) => void;
	hydrateSessionsFromBackend: () => Promise<void>;
	loadThreadMessages: (threadId: string) => Promise<any[]>;
	addToolLog: (log: Omit<ToolExecutionLog, "id" | "timestamp">) => void;
	setActiveDiff: (diff: ActiveDiff | null) => void;
	applyActiveDiff: () => void;
	rejectActiveDiff: () => void;
	setSettingsOpen: (open: boolean) => void;
	setHistoryOpen: (open: boolean) => void;
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
			if (!isDemoShowcaseMode()) void saveRemoteMemoryFacts(next);
			return { memoryFacts: next };
		});
	},

	updateMemoryFact: (id, fact, category) => {
		set((state) => {
			const next = state.memoryFacts.map((f) => (f.id === id ? { ...f, fact: fact.trim(), ...(category ? { category } : {}) } : f));
			safeLocalStorageSetJson("dente_copilot_memory", next);
			if (!isDemoShowcaseMode()) void saveRemoteMemoryFacts(next);
			return { memoryFacts: next };
		});
	},

	removeMemoryFact: (id) => {
		set((state) => {
			const next = state.memoryFacts.filter((f) => f.id !== id);
			safeLocalStorageSetJson("dente_copilot_memory", next);
			if (!isDemoShowcaseMode()) void saveRemoteMemoryFacts(next);
			return { memoryFacts: next };
		});
	},

	clearMemory: () => {
		set(() => {
			safeLocalStorageSetJson("dente_copilot_memory", []);
			if (!isDemoShowcaseMode()) void saveRemoteMemoryFacts([]);
			return { memoryFacts: [] };
		});
	},

	createThread: (patientName = "Новый пациент", title = "Новый клинический диалог", patientId?: string) => {
		const newId = generateSessionUuid();
		const newThread: CopilotThread = {
			id: newId,
			title,
			updatedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
			createdAt: new Date().toISOString(),
			patientName,
			patientId,
			messageCount: 0,
		};
		set((state) => {
			const next = [newThread, ...state.threads];
			safeLocalStorageSetJson("dente_copilot_threads", next);
			return { threads: next, activeThreadId: newId };
		});
		if (!isDemoShowcaseMode()) {
			void createRemoteSession({
				id: newId,
				patientId: patientId || null,
				title,
				summary: title,
				activeView: "Одонтограмма",
			});
		}
		return newId;
	},

	selectThread: (id) => {
		set({ activeThreadId: id, isHistoryOpen: false });
		if (isSessionUuid(id)) {
			void get().loadThreadMessages(id);
		}
	},

	deleteThread: (id) => {
		set((state) => {
			const next = state.threads.filter((t) => t.id !== id);
			safeLocalStorageSetJson("dente_copilot_threads", next);
			const activeId = state.activeThreadId === id ? (next[0]?.id || "") : state.activeThreadId;
			return { threads: next, activeThreadId: activeId };
		});
		if (!isDemoShowcaseMode() && isSessionUuid(id)) {
			void deleteRemoteSession(id);
		}
	},

	clearThreads: () => {
		set(() => {
			safeLocalStorageSetJson("dente_copilot_threads", []);
			safeLocalStorageSetJson("dente_copilot_thread_messages", {});
			return { threads: [], activeThreadId: "", threadMessages: {} };
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
		if (!isDemoShowcaseMode() && isSessionUuid(id)) {
			void updateRemoteSession(id, { summary: title });
		}
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
		if (!isDemoShowcaseMode() && isSessionUuid(threadId) && Array.isArray(messages) && messages.length > 0) {
			const last = messages[messages.length - 1];
			const content = String(last.text || last.content || "").trim();
			if (content && last.role) {
				void appendRemoteMessage(threadId, {
					role: last.role === "assistant" ? "assistant" : "user",
					content,
					toolCalls: last.actionProposal ? [last.actionProposal] : null,
				});
			}
		}
	},

	hydrateSessionsFromBackend: async () => {
		if (isDemoShowcaseMode()) return;
		try {
			const remoteFacts = await fetchRemoteMemoryFacts();
			if (remoteFacts && Array.isArray(remoteFacts) && remoteFacts.length > 0) {
				set({ memoryFacts: remoteFacts });
				safeLocalStorageSetJson("dente_copilot_memory", remoteFacts);
			}
		} catch {
			// Офлайн фоллбек на локальный кэш
		}
		try {
			const remote = await fetchRemoteSessions();
			if (!remote || remote.length === 0) return;
			set((state) => {
				const existingMap = new Map(state.threads.map((t) => [t.id, t]));
				const merged: CopilotThread[] = [...remote];
				for (const r of merged) {
					const local = existingMap.get(r.id);
					if (local?.pinned) r.pinned = true;
				}
				for (const local of state.threads) {
					if (!merged.some((m) => m.id === local.id)) {
						merged.push(local);
					}
				}
				safeLocalStorageSetJson("dente_copilot_threads", merged);
				const activeId = state.activeThreadId || (merged[0]?.id || "");
				return { threads: merged, activeThreadId: activeId };
			});
		} catch {
			// Офлайн фоллбек на локальный кэш
		}
	},

	loadThreadMessages: async (threadId: string) => {
		const cached = get().threadMessages[threadId];
		if (cached && cached.length > 0) return cached;
		if (isDemoShowcaseMode() || !isSessionUuid(threadId)) return [];
		try {
			const remoteMsgs = await fetchRemoteMessages(threadId);
			if (remoteMsgs && remoteMsgs.length > 0) {
				const parsed = remoteMsgs.map((m: any, idx: number) => ({
					id: m.id || `msg-${idx}`,
					role: m.role || "user",
					text: m.content || m.text || "",
					timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00",
					toolCalls: m.toolCalls,
				}));
				set((state) => {
					const next = { ...state.threadMessages, [threadId]: parsed };
					safeLocalStorageSetJson("dente_copilot_thread_messages", next);
					return { threadMessages: next };
				});
				return parsed;
			}
		} catch {
			// Офлайн фоллбек
		}
		return cached || [];
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

	setActiveDiff: (diff) => set({ activeDiff: diff }),
	applyActiveDiff: () => set((state) => ({ activeDiff: state.activeDiff ? { ...state.activeDiff, applied: true } : null })),
	rejectActiveDiff: () => set({ activeDiff: null }),
	setSettingsOpen: (open) => set({ isSettingsOpen: open }),
	setHistoryOpen: (open) => set({ isHistoryOpen: open }),
}));

if (typeof window !== "undefined") {
	setTimeout(() => {
		void useCopilotStore.getState().hydrateSessionsFromBackend();
	}, 50);

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
