/**
 * @file copilotStore.ts
 * @description SSOT Zustand store for DENTE AI Copilot: Settings, Trust Levels,
 * Dialog History & Threads, Long-term Clinical Memory, Tool Execution Logs & Diffs (Mandate 8b <= 450 lines).
 * Mandate 8wy: Strict Production vs Showcase separation via isDemoShowcaseMode().
 */

import { create } from "zustand";
import { logger } from "../utils/logger";
import { safeLocalStorageGetJson, safeLocalStorageSetJson, readDenteClinicToken, readDenteStaffToken } from "../lib/safeLocalStorage";
import { isDemoShowcaseMode } from "../lib/demoMode";
import { type ContextTelemetryData, PRODUCTION_TELEMETRY, SHOWCASE_TELEMETRY } from "../components/copilot/telemetry/telemetryTypes";
import { SHOWCASE_MEMORY_FACTS, SHOWCASE_THREADS, SHOWCASE_TOOL_LOGS } from "./copilotShowcaseData";
import {
	appendRemoteMessage, createRemoteSession, deleteRemoteSession, fetchRemoteMessages,
	fetchRemoteSessions, fetchRemoteMemoryFacts, saveRemoteMemoryFacts, fetchRemoteSettings,
	saveRemoteSettings, generateSessionUuid, isSessionUuid, updateRemoteSession,
} from "./copilotSessionApi";
import { DEFAULT_SETTINGS, detectRuntimeEnvironment, getInitialCopilotState } from "./copilotStoreDefaults";

export { DEFAULT_SETTINGS, detectRuntimeEnvironment, getInitialCopilotState };

export * from "./copilotStoreTypes";
import type {
	AiTrustLevel,
	AiProvider,
	AiSpeedMode,
	ModelRoutingMode,
	ClinicalSpecialization,
	DiaryTemplate,
	CopilotRuntimeEnvironment,
	WebSpeechSensitivity,
	SpeechEngine,
	GranularAgentPermissions,
	AiMemoryFact,
	CopilotThread,
	ToolExecutionLog,
	CopilotToolExecutionLog,
	CopilotMessage,
	ActiveDiff,
	CopilotActiveDiff,
	CopilotUnconfirmedDraft,
	CopilotSettings,
	CopilotStoreState,
} from "./copilotStoreTypes";

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
	isStudioOpen: false,
	isHudOpen: false,
	telemetry: initialState.telemetry,
	unconfirmedDraft: null,

	setUnconfirmedDraft: (draft) => { set({ unconfirmedDraft: draft }); },
	savePendingDictationDraft: (patch) => {
		set((state) => {
			const current = state.unconfirmedDraft || { timestamp: new Date().toISOString() };
			const next: CopilotUnconfirmedDraft = {
				...current,
				...patch,
				timestamp: new Date().toISOString(),
				...(patch.toothUpdates ? { toothUpdates: [...(current.toothUpdates || []), ...patch.toothUpdates] } : {}),
				...(patch.soapPatch ? { soapPatch: { ...(current.soapPatch || {}), ...patch.soapPatch } } : {}),
				...(patch.billingServices ? { billingServices: [...(current.billingServices || []), ...patch.billingServices] } : {}),
			};
			return { unconfirmedDraft: next };
		});
	},
	clearUnconfirmedDraft: () => { set({ unconfirmedDraft: null }); },

	updateSettings: (patch) => {
		set((state) => {
			const next = { ...state.settings, ...patch };
			safeLocalStorageSetJson("dente_copilot_settings", next);
			if (!isDemoShowcaseMode()) {
				void saveRemoteSettings({
					trustLevel: next.trustLevel,
					speedMode: next.speedMode,
					granularPermissions: next.granularPermissions,
					showTypingAnimation: next.showTypingAnimation,
					byokProvider: next.byokProvider,
					provider: next.provider,
					model: next.model,
					modelRoutingMode: next.modelRoutingMode,
					diaryTemplate: next.diaryTemplate,
					clinicalSpecialization: next.clinicalSpecialization,
					customDoctorInstructions: next.customDoctorInstructions,
					showThinkingProcess: next.showThinkingProcess,
					temperature: next.temperature,
					maskPhiData: next.maskPhiData,
				});
			}
			return { settings: next };
		});
	},

	setTrustLevel: (level) => { get().updateSettings({ trustLevel: level }); },
	setRuntimeMode: (mode) => { get().updateSettings({ runtimeMode: mode }); },
	refreshRuntimeEnvironment: () => { const detected = detectRuntimeEnvironment(); get().updateSettings({ runtimeMode: detected }); return detected; },
	updateTelemetry: (patch) => { set((state) => ({ telemetry: { ...state.telemetry, ...patch } })); },

	addMemoryFact: (category, fact) => {
		const newFact: AiMemoryFact = { id: `mem-${Date.now()}`, category, fact: fact.trim(), createdAt: new Date().toISOString().slice(0, 10) };
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
			...(patientId ? { patientId } : {}),
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
			if (!last) return;
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
		} catch (err) {
			logger.info("[copilotStore] Offline fallback for memory facts:", err);
		}
		await get().loadRemoteSettings();
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
		} catch (err) {
			logger.info("[copilotStore] Offline fallback for remote sessions:", err);
		}
	},

	loadRemoteSettings: async () => {
		if (isDemoShowcaseMode()) return;
		try {
			const remoteSettings = await fetchRemoteSettings();
			if (remoteSettings && typeof remoteSettings === "object" && Object.keys(remoteSettings).length > 0) {
				set((state) => { const merged = { ...state.settings, ...remoteSettings }; safeLocalStorageSetJson("dente_copilot_settings", merged); return { settings: merged }; });
			}
		} catch (err) { logger.info("[copilotStore] Offline fallback for remote settings:", err); }
	},

	loadThreadMessages: async (threadId: string): Promise<CopilotMessage[]> => {
		const cached = get().threadMessages[threadId];
		if (cached && cached.length > 0) return cached;
		if (isDemoShowcaseMode() || !isSessionUuid(threadId)) return [];
		try {
			const remoteMsgs = await fetchRemoteMessages(threadId);
			if (remoteMsgs && remoteMsgs.length > 0) {
				const parsed: CopilotMessage[] = (remoteMsgs as unknown[]).map((raw: unknown, idx: number): CopilotMessage => {
					const m = (typeof raw === "object" && raw !== null ? raw : {}) as { id?: string; role?: "user" | "assistant" | "system"; content?: string; text?: string; createdAt?: string; toolCalls?: unknown };
					return {
						id: m.id || `msg-${idx}`,
						role: (m.role === "assistant" || m.role === "system") ? m.role : "user",
						text: m.content || m.text || "",
						timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "10:00",
						toolCalls: m.toolCalls,
					};
				});
				set((state) => {
					const next = { ...state.threadMessages, [threadId]: parsed };
					safeLocalStorageSetJson("dente_copilot_thread_messages", next);
					return { threadMessages: next };
				});
				return parsed;
			}
		} catch (err) {
			logger.info("[copilotStore] Offline fallback for thread messages:", err);
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
	applyActiveDiff: async () => {
		const diff = get().activeDiff;
		if (!diff || diff.applied) return;
		const token = readDenteClinicToken() || readDenteStaffToken() || "";
		const runtime = get().settings.runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";
		const isReplace = Boolean(diff.beforeText && !diff.beforeText.startsWith("(") && diff.beforeText.trim().length > 0);
		const toolName = isReplace ? "replace_file_content" : "write_clinical_file";
		const args = isReplace
			? { targetFile: diff.targetEntity, targetContent: diff.beforeText, replacementContent: diff.afterText }
			: { filePath: diff.targetEntity, content: diff.afterText };
		try {
			const res = await fetch("/api/agent/action", {
				method: "POST",
				headers: { "Content-Type": "application/json", "x-agent-runtime": runtime, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
				body: JSON.stringify({ toolName, args, sessionId: get().activeThreadId || undefined, runtimeMode: runtime }),
			});
			const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
			const ok = res.ok && data?.ok !== false; set((state) => ({ activeDiff: state.activeDiff ? { ...state.activeDiff, applied: ok } : null }));
			get().addToolLog({ toolName, category: "workstation", status: ok ? "success" : "rejected", args, resultSummary: ok ? `Применен дифф: ${diff.targetEntity.split(/[/\\]/).pop() || diff.targetEntity}` : `Сбой диффа: ${data?.error || res.statusText}` });
		} catch (err) {
			set((state) => ({ activeDiff: state.activeDiff ? { ...state.activeDiff, applied: false } : null }));
			get().addToolLog({ toolName, category: "workstation", status: "rejected", args, resultSummary: `Ошибка сети при диффе: ${err instanceof Error ? err.message : String(err)}` });
		}
	},
	rejectActiveDiff: () => set({ activeDiff: null }),
	setSettingsOpen: (open) => set({ isSettingsOpen: open }), setHistoryOpen: (open) => set({ isHistoryOpen: open }),
	setIsStudioOpen: (open) => set({ isStudioOpen: open }), setStudioOpen: (open) => set({ isStudioOpen: open }),
	setIsHudOpen: (open) => set({ isHudOpen: open }), setHudOpen: (open) => set({ isHudOpen: open }),
	expandToStudio: () => set({ isStudioOpen: true, isHudOpen: false }), collapseToHud: () => set({ isStudioOpen: false, isHudOpen: true }),
}));

if (typeof window !== "undefined") {
	setTimeout(() => {
		void useCopilotStore.getState().hydrateSessionsFromBackend();
		void useCopilotStore.getState().loadRemoteSettings();
	}, 50);
	let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
	window.addEventListener("resize", () => {
		if (resizeDebounceTimer) clearTimeout(resizeDebounceTimer);
		resizeDebounceTimer = setTimeout(() => {
			const current = useCopilotStore.getState().settings.runtimeMode, detected = detectRuntimeEnvironment();
			if (current !== detected) useCopilotStore.getState().setRuntimeMode(detected);
		}, 150);
	});
}
