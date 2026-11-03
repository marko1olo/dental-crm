/**
 * @file copilotStore.ts
 * @description SSOT Zustand store for DENTE AI Copilot: Settings, Trust Levels,
 * Dialog History & Threads, Long-term Clinical Memory, Tool Execution Logs & Diffs (Mandate 8b <= 300 lines).
 */

import { create } from "zustand";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "../lib/safeLocalStorage";

export type AiTrustLevel = "confirm_all" | "balanced" | "autonomous";
export type AiProvider = "gemini" | "openai" | "anthropic" | "local";
export type AiSpeedMode = "turbo" | "deep_reasoning";
export type ClinicalSpecialization = "therapy" | "orthopedics" | "surgery" | "orthodontics" | "perio" | "pediatric";
export type DiaryTemplate = "soap" | "form043" | "express";
export type CopilotRuntimeEnvironment = "web_browser" | "desktop_native" | "chairside_tablet" | "mobile_tablet";
export type TomographyViewerApp = "planmeca_romexis" | "vatech_ez3d" | "sirona_sidexis" | "custom";
export type WebSpeechSensitivity = "high" | "normal" | "low";

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
	speedMode: AiSpeedMode;
	showThinkingProcess: boolean;
	clinicalSpecialization: ClinicalSpecialization;
	diaryTemplate: DiaryTemplate;
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
	localInferenceServerUrl: string;
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
	isSettingsOpen: boolean;
	isHistoryOpen: boolean;

	// Actions
	updateSettings: (patch: Partial<CopilotSettings>) => void;
	setTrustLevel: (level: AiTrustLevel) => void;
	setRuntimeMode: (mode: CopilotRuntimeEnvironment) => void;
	refreshRuntimeEnvironment: () => CopilotRuntimeEnvironment;
	addMemoryFact: (category: AiMemoryFact["category"], fact: string) => void;
	removeMemoryFact: (id: string) => void;
	clearMemory: () => void;
	createThread: (patientName?: string, title?: string) => string;
	selectThread: (id: string) => void;
	deleteThread: (id: string) => void;
	togglePinThread: (id: string) => void;
	renameThread: (id: string, title: string) => void;
	setThreadSearchQuery: (query: string) => void;
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
	model: "gemini-2.5-flash",
	speedMode: "turbo",
	showThinkingProcess: true,
	clinicalSpecialization: "therapy",
	diaryTemplate: "soap",
	runtimeMode: detectRuntimeEnvironment(),
	// Браузер
	autoSaveDrafts: true,
	webSpeechSensitivity: "normal",
	maskPhiData: true,
	// Десктоп ПК
	localDropzonePath: "C:\\Radiology\\Export",
	tomographyViewerApp: "planmeca_romexis",
	fiscalRegisterComPort: "COM1",
	localInferenceServerUrl: "http://localhost:11434",
	globalDictationHotkey: "F9",
	// Мобилка / Планшет
	gloveModeTouchTarget: true,
	screenWakeLock: true,
	hapticFeedbackEnabled: true,
	autoMicOnAppointmentOpen: false,
};

const DEFAULT_MEMORY_FACTS: AiMemoryFact[] = [
	{
		id: "mem-1",
		category: "materials",
		fact: "Предпочтение наногибридного композита светового отверждения (Filtek Ultimate / Harmonize) и бонда 7 поколения",
		createdAt: "2026-10-15",
	},
	{
		id: "mem-2",
		category: "anesthesia",
		fact: "Инфильтрационная и проводниковая анестезия: Артикаин 1:200 000 по умолчанию, без вазоконстриктора при гипертонии",
		createdAt: "2026-10-16",
	},
	{
		id: "mem-3",
		category: "equipment",
		fact: "Рабочая станция кабинета №1: Визиограф Planmeca ProSensor, локальная dropzone C:\\Radiology\\Export",
		createdAt: "2026-10-20",
	},
	{
		id: "mem-4",
		category: "protocols",
		fact: "Формирование протокола SOAP: подробное обоснование диагноза по МКБ-10 с формулой FDI",
		createdAt: "2026-10-25",
	},
];

const DEFAULT_THREADS: CopilotThread[] = [
	{
		id: "thread-active",
		title: "Приём: Осмотр и глубокий кариес 36",
		updatedAt: "10:16",
		pinned: true,
		patientName: "Иванов Иван Иванович",
		patientId: "pat-active",
		messageCount: 4,
		previewText: "Сформирован протокол приёма и план лечения зуба 36",
	},
	{
		id: "thread-prev-1",
		title: "Консультация ортопеда: All-on-4 нижняя челюсть",
		updatedAt: "Вчера, 16:40",
		pinned: false,
		patientName: "Смирнова Елена Павловна",
		patientId: "pat-smirnova",
		messageCount: 6,
		previewText: "Сформирована сравнительная смета: цирконий vs металлокерамика",
	},
	{
		id: "thread-prev-2",
		title: "Анализ снимка КЛКТ: Зуб 46 периапикальный очаг",
		updatedAt: "28 окт, 14:10",
		pinned: false,
		patientName: "Кузнецов Алексей Сергеевич",
		patientId: "pat-kuznetsov",
		messageCount: 3,
		previewText: "Обнаружен дополнительный дистально-язычный канал Radix Entomolaris",
	},
];

const DEFAULT_TOOL_LOGS: ToolExecutionLog[] = [
	{
		id: "log-1",
		toolName: "updateToothStatus",
		category: "clinical",
		status: "success",
		durationMs: 42,
		args: { tooth: 36, diagnosis: "K02.1" },
		resultSummary: "Одонтограмма обновлена: K02.1 Кариес дентина (Зуб 36)",
		timestamp: "10:16:02",
	},
	{
		id: "log-2",
		toolName: "generateSoapDiary",
		category: "clinical",
		status: "success",
		durationMs: 120,
		args: { tooth: 36, anesthesic: "Articaine 1.7ml", material: "Nano-composite" },
		resultSummary: "Дневник приёма SOAP сформирован и готов к подписанию",
		timestamp: "10:16:05",
	},
];

export const useCopilotStore = create<CopilotStoreState>((set, get) => ({
	settings: {
		...DEFAULT_SETTINGS,
		...(safeLocalStorageGetJson("dente_copilot_settings", DEFAULT_SETTINGS) || {}),
		runtimeMode: detectRuntimeEnvironment(),
	},
	memoryFacts: safeLocalStorageGetJson("dente_copilot_memory", DEFAULT_MEMORY_FACTS),
	threads: safeLocalStorageGetJson("dente_copilot_threads", DEFAULT_THREADS),
	activeThreadId: "thread-active",
	threadSearchQuery: "",
	toolExecutionLogs: DEFAULT_TOOL_LOGS,
	activeDiff: null,
	isSettingsOpen: false,
	isHistoryOpen: false,

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
