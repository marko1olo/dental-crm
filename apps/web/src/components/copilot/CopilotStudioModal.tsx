/**
 * CopilotStudioModal.tsx — Канонический SSOT выдвижной кабинет и студия Копайлота DENTE.
 * Мандаты 8b (380-450 строк), 8e (автономия), 8am (1 Primary CTA), 8wy (двухрежимный харнесс), Apple HIG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Mic, MicOff, Check, Calendar, Activity, Receipt, Sparkles, BookOpen, Sliders, MessageSquare, Brain, Minimize2, AlertTriangle } from "lucide-react";
import "./styles/copilotStudio.css";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { showToast } from "../GlobalToast";
import { clientLogger } from "../../services/logging/clientLogger";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode, isDemoPatientId } from "../../lib/demoMode";
import { CLINICAL_QUICK_PRESETS, CRM_FASTIFY_TOOLS_REGISTRY } from "./copilotCatalogData";
import { SHOWCASE_INITIAL_MESSAGES } from "../../store/copilotShowcaseData";
import { useCopilotStore, type CopilotMessage } from "../../store/copilotStore";
import type { CopilotUiMessage, DesktopHostWindow } from "./copilotTypes";
import { parseActionProposal, parseJsonResponse } from "./copilotTypes";
import { executeCopilotConfirmation } from "./useCopilotModules/useCopilotActions";
import { streamCopilotChat, toCleanUuid } from "./client/copilotStreamClient";
import { CopilotSettingsModal } from "./CopilotSettingsModal"; import { CopilotHistoryDrawer } from "./CopilotHistoryDrawer"; import { CopilotThinkingIndicator } from "./CopilotThinkingIndicator"; import { CopilotMemoryTab } from "./CopilotMemoryTab"; import { CopilotContextTelemetryBar } from "./telemetry/CopilotContextTelemetryBar"; import { CopilotVisitClinicalDigest } from "./CopilotVisitClinicalDigest"; import { handleClinicalSpeechOrText } from "./copilotDictationHandler"; import { ActiveDiffCard } from "./cards/ActiveDiffCard"; import { CopilotToolLogsView } from "./cards/CopilotToolLogsView"; import { CopilotResultCard } from "./CopilotResultCard"; import { CopilotStudioActionsTab } from "./CopilotStudioActionsTab"; import { CopilotStudioToolProposalCard } from "./CopilotStudioToolProposalCard";

export type CopilotStudioTab = "dialog" | "actions" | "memory";

export interface CopilotStudioModalProps {
  isOpen: boolean; onClose: () => void; activeTooth?: number | null | undefined; patientId?: string | null | undefined;
  patientName?: string | null | undefined; activeVisitId?: string | null | undefined; initialTab?: CopilotStudioTab | undefined;
  initialMessages?: Array<CopilotChatMessage | CopilotUiMessage | CopilotMessage> | undefined; isThinking?: boolean | undefined; thoughtProcess?: string | undefined;
}
export type ChairsideCopilotStudioModalProps = CopilotStudioModalProps;
export interface CopilotChatMessage {
  id: string; role: "user" | "assistant"; text: string; citation?: string | undefined; timestamp: string; applied?: boolean | undefined; actionProposal?: { id: string; toolName: string; description: string; payload: Record<string, unknown> } | undefined; suggestedReplies?: string[] | undefined; toolResult?: unknown | undefined; toolName?: string | undefined;
  isOfflineFallback?: boolean | undefined;
}
const extractSuggestions = (text: string) => {
  const m = text.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
  let suggestions: string[] | undefined;
  if (m && m[1]) { try { const list = JSON.parse(m[1]); if (Array.isArray(list)) suggestions = list.filter((s): s is string => typeof s === "string"); } catch { /* skip */ } }
  return { cleanText: text.replace(/<<<SUGGESTIONS:[\s\S]*?(?:>>>|$)/g, "").trim(), suggestions };
};
export const DEFAULT_INITIAL_MESSAGES: CopilotChatMessage[] = [];

const parseChatMsgs = (list?: Array<CopilotChatMessage | CopilotUiMessage | CopilotMessage | Record<string, unknown>>): CopilotChatMessage[] => (list || []).map((m, i) => {
  const mRec = typeof m === "object" && m !== null ? (m as Record<string, unknown>) : {};
  const raw = typeof mRec.text === "string" ? mRec.text : typeof mRec.content === "string" ? mRec.content : (mRec.kind === "tool" ? `Выполнен инструмент: ${String(mRec.name || "")}` : "");
  const { cleanText, suggestions } = extractSuggestions(raw);
  const mRole = mRec.role === "assistant" || mRec.kind === "tool" ? "assistant" : "user";
  const replies = Array.isArray(mRec.suggestedReplies) ? mRec.suggestedReplies.filter((s): s is string => typeof s === "string") : suggestions;
  return {
    id: typeof mRec.id === "string" ? mRec.id : typeof mRec.callId === "string" ? mRec.callId : `msg-${i}`,
    role: mRole, text: cleanText, timestamp: typeof mRec.timestamp === "string" ? mRec.timestamp : "10:00", applied: Boolean(mRec.applied),
    citation: typeof mRec.citation === "string" ? mRec.citation : undefined, actionProposal: parseActionProposal(mRec.actionProposal),
    suggestedReplies: replies, toolResult: mRec.toolResult, toolName: typeof mRec.toolName === "string" ? mRec.toolName : undefined,
    isOfflineFallback: Boolean(mRec.isOfflineFallback),
  };
});

export const CopilotStudioModal: React.FC<CopilotStudioModalProps> = ({ isOpen, onClose, activeTooth, patientId, patientName, activeVisitId, initialTab = "dialog", initialMessages, isThinking, thoughtProcess }) => {
  const [activeTab, setActiveTab] = useState<CopilotStudioTab>((initialTab as CopilotStudioTab) || "dialog");
  const { settings, memoryFacts, activeThreadId, threadMessages, saveThreadMessages, setRuntimeMode, isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen, threads, selectThread, addToolLog, activeDiff, setActiveDiff, applyActiveDiff, rejectActiveDiff, toolExecutionLogs } = useCopilotStore();
  const { runtimeMode, speedMode, showThinkingProcess } = settings;
  const threadKey = activeThreadId || "default-thread";

  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => (initialMessages?.length ? parseChatMsgs(initialMessages) : (threadMessages[threadKey]?.length ? parseChatMsgs(threadMessages[threadKey]) : (isDemoShowcaseMode() ? (SHOWCASE_INITIAL_MESSAGES as CopilotChatMessage[]) : []))));
  useEffect(() => { if (initialMessages?.length) setMessages(parseChatMsgs(initialMessages)); }, [initialMessages]);
  const hydrateSession = useCallback(async (sId: string) => {
    try {
      const tok = readDenteClinicToken() || readDenteStaffToken() || "";
      const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sId)}/messages`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
      if (res.ok) {
        const b = await res.json(), raw = Array.isArray(b?.messages) ? b.messages : Array.isArray(b?.data) ? b.data : null;
        if (raw?.length) {
          const p = parseChatMsgs(raw.map((m: { id?: string; role?: "user" | "assistant"; content?: string; text?: string; createdAt?: string }) => ({ id: m.id, role: m.role, content: m.content || m.text, timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined })));
          setMessages(p); saveThreadMessages(sId, p); return true;
        }
      }
    } catch (err) { clientLogger.warn("[CopilotStudioModal] Hydrate session offline:", err); }
    return false;
  }, [saveThreadMessages]);
  useEffect(() => {
    setMessages([]);
    const saved = threadMessages[threadKey];
    if (saved && saved.length > 0) setMessages(parseChatMsgs(saved));
    else if (threadKey && threadKey !== "default-thread") void hydrateSession(threadKey).then((ok) => { if (!ok && !isDemoShowcaseMode()) setMessages([]); });
    else if (isDemoShowcaseMode()) setMessages(SHOWCASE_INITIAL_MESSAGES as CopilotChatMessage[]);
    else setMessages([]);
  }, [threadKey, patientId, hydrateSession]);
  useEffect(() => {
    const handleFill = (e: Event) => {
      const prompt = (e as CustomEvent<{ prompt?: string }> | undefined)?.detail?.prompt;
      if (typeof prompt === "string" && prompt.trim()) { setInputText(prompt.trim()); baseDraftRef.current = prompt.trim(); safeLocalStorageSetItem("dente_copilot_draft_text", prompt.trim()); }
    };
    window.addEventListener("dente:fill-copilot-input", handleFill);
    return () => window.removeEventListener("dente:fill-copilot-input", handleFill);
  }, []);
  useEffect(() => { if (initialTab) setActiveTab(initialTab as CopilotStudioTab); }, [initialTab]);
  const [inputText, setInputText] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
  const baseDraftRef = useRef<string>(inputText), messagesEndRef = useRef<HTMLDivElement>(null), isFirstRenderRef = useRef<boolean>(true);

  const resetDraft = useCallback(() => {
    setInputText(""); baseDraftRef.current = "";
    if (typeof window !== "undefined") { try { localStorage.removeItem("dente_copilot_draft_text"); } catch { /* ignore */ } }
  }, []);

  useEffect(() => { resetDraft(); }, [patientId, resetDraft]);

  const handleClose = useCallback(() => {
    if (messages.length > 0) saveThreadMessages(threadKey, messages);
    resetDraft(); onClose();
  }, [messages, threadKey, saveThreadMessages, resetDraft, onClose]);
  const [appliedActionIds, setAppliedActionIds] = useState<Set<string>>(() => new Set()), [actionError, setActionError] = useState<string | null>(null), [, setIsExecuting] = useState<string | null>(null), [isStreaming, setIsStreaming] = useState<boolean>(false), [currentThought, setCurrentThought] = useState<string>(""), [activeToolName, setActiveToolName] = useState<string | null>(null);
  const unifiedVoice = useUnifiedDictation({ preferredMode: "gemini_live", context: "chat", patientId: toCleanUuid(patientId), visitId: toCleanUuid(activeVisitId), autoFallback: true });
  const voice = { isListening: unifiedVoice.isRecording, fullText: unifiedVoice.fullTranscript, toggleListening: unifiedVoice.toggleDictation, stopListening: unifiedVoice.stopDictation, clearTranscript: unifiedVoice.clearTranscript };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints > 0) || window.matchMedia?.("(pointer: coarse)").matches;
    const hostWin = window as DesktopHostWindow;
    if (Boolean(hostWin.electron || hostWin.__TAURI__) && runtimeMode !== "desktop_native") setRuntimeMode("desktop_native");
    else if (isTouch && runtimeMode !== "chairside_tablet" && runtimeMode !== "mobile_tablet") setRuntimeMode("chairside_tablet");
  }, [runtimeMode, setRuntimeMode]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof document !== "undefined") document.body.classList.add("copilot-open", "copilot-studio-open");
    let s: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator && typeof navigator.wakeLock?.request === "function") navigator.wakeLock.request("screen").then((l) => { s = l; }).catch(() => {});
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape" && !isSettingsOpen && !isHistoryOpen) handleClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => { if (typeof document !== "undefined") document.body.classList.remove("copilot-open", "copilot-studio-open"); s?.release().catch(() => {}); window.removeEventListener("keydown", handleKeyDown); };
  }, [isOpen, isSettingsOpen, isHistoryOpen, handleClose]);

  useEffect(() => { baseDraftRef.current = inputText; if (!voice.isListening) voice.clearTranscript(); }, [voice.isListening]);
  useEffect(() => {
    if (!voice.fullText) return;
    const base = (baseDraftRef.current || "").trim();
    const combined = base ? `${base} ${voice.fullText}` : voice.fullText;
    setInputText(combined); safeLocalStorageSetItem("dente_copilot_draft_text", combined);
  }, [voice.fullText]);

  useEffect(() => {
    if (!isOpen || activeTab !== "dialog") return;
    if (isFirstRenderRef.current) { isFirstRenderRef.current = false; return; }
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, activeTab]);

  const handleInputChange = (val: string) => {
    setInputText(val); if (!voice.isListening) baseDraftRef.current = val;
    safeLocalStorageSetItem("dente_copilot_draft_text", val);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? inputText).trim();
    if (!query) return;
    if (voice.isListening) voice.stopListening();
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsgId = `msg-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text: query, timestamp: nowTime }]);
    setInputText(""); baseDraftRef.current = ""; safeLocalStorageSetItem("dente_copilot_draft_text", ""); voice.clearTranscript(); setCurrentThought(""); setActiveToolName(null);
    const assistantMsgId = `msg-${Date.now() + 1}`;
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", text: "", timestamp: nowTime, applied: false }]);
    setIsStreaming(true);

    // [CLN-DICTATION]: Локальный клинический парсер речи и текста для одонтограммы, SOAP и сметы
    const { fallbackText, fallbackProposalTooth, pendingAction: localPendingAction } = handleClinicalSpeechOrText(query, patientId, activeTooth, { trustLevel: settings.trustLevel, autoApply: false });
    const token = readDenteClinicToken() || readDenteStaffToken() || "", apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";

    // Скользящее окно многошаговой памяти диалога (AI-REV-06): последние 10 сообщений + текущий запрос
    const historyWindow = messages.filter((m) => m.text && m.text.trim().length > 0).slice(-10).map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.text }));
    const outboundMessages = [...historyWindow, { role: "user" as const, content: query }];

    let streamFailed = false, accumulatedText = "", accumulatedThought = "", pendingAction: CopilotChatMessage["actionProposal"] | undefined, pendingToolResult: unknown | undefined, pendingToolName: string | undefined;

    type SseEventPayload = { type?: string; text?: string; thought?: string; tool?: string; name?: string; callId?: string; call_id?: string; descriptionRu?: string; args?: Record<string, unknown>; arguments?: Record<string, unknown>; result?: unknown; data?: unknown; payload?: unknown; };
    const handleSseEvent = (event: string, data: Record<string, unknown>) => {
      const ev = { type: (data.type as string) || event, ...data } as SseEventPayload;
      if (ev.type === "token" && typeof ev.text === "string") accumulatedText += ev.text;
      else if ((ev.type === "thought" || ev.type === "thinking" || ev.type === "reasoning") && typeof ev.text === "string") { accumulatedThought += ev.text; setCurrentThought(accumulatedThought); }
      else if (ev.type === "confirmation_required") {
        const callId = String(ev.callId || `act-${Date.now()}`), toolName = String(ev.tool || ev.name || CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus);
        setActiveToolName(toolName);
        const args = (ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object" ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
        const desc = typeof ev.descriptionRu === "string" ? ev.descriptionRu : `Подтверждение действия: ${toolName}`;
        pendingAction = { id: callId, toolName, description: desc, payload: args };
        addToolLog({ toolName, category: "clinical", status: "pending", args, resultSummary: desc });
      } else if (ev.type === "tool_call_started" || ev.type === "tool_start") {
        const toolName = String(ev.tool || ev.name || CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus);
        setActiveToolName(toolName);
        const args = (ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object" ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
        const desc = typeof ev.descriptionRu === "string" ? ev.descriptionRu : `Выполнение инструмента: ${toolName}`;
        addToolLog({ toolName, category: "clinical", status: "pending", args, resultSummary: desc });
      } else if (ev.type === "tool_end" || ev.type === "tool_call_finished" || ev.type === "tool_result") {
        setActiveToolName(null);
        pendingToolName = String(ev.name || ev.tool || pendingAction?.toolName || "");
        pendingToolResult = ev.result ?? ev.data ?? ev.payload;
        const evArgs = ((ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object") ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
        if (evArgs.beforeText || evArgs.afterText || pendingToolName.includes("file") || pendingToolName.includes("workstation")) {
          const targetFile = String(evArgs.targetEntity || evArgs.path || evArgs.file || "workstation_document.txt");
          useCopilotStore.getState().setActiveDiff({ id: `diff-${Date.now()}`, title: `Изменения файла: ${targetFile.split(/[/\\]/).pop() || targetFile}`, targetEntity: targetFile, beforeText: String(evArgs.beforeText || "(Исходное состояние файла)"), afterText: String(evArgs.afterText || evArgs.content || (typeof pendingToolResult === "string" ? pendingToolResult : JSON.stringify(pendingToolResult, null, 2)) || "(Обновлённое содержимое)"), applied: false });
        }
        addToolLog({ toolName: pendingToolName, category: "clinical", status: "success", args: (typeof ev.args === "object" && ev.args !== null ? (ev.args as Record<string, unknown>) : {}), resultSummary: `Выполнен: ${pendingToolName}` });
      } else if ((ev.type === "done" || ev.type === "final_answer") && typeof ev.text === "string" && !accumulatedText) {
        setActiveToolName(null); accumulatedText = ev.text;
      }

      if (accumulatedText || pendingToolResult) {
        const { cleanText, suggestions } = extractSuggestions(accumulatedText);
        const effectiveAction = pendingAction ?? (localPendingAction ? { id: localPendingAction.id, toolName: localPendingAction.toolName, description: localPendingAction.description, payload: { ...(localPendingAction.payload || {}) } } : undefined);
        setMessages((prev) => prev.map((m): CopilotChatMessage => (m.id === assistantMsgId ? { ...m, text: cleanText, actionProposal: effectiveAction ?? m.actionProposal, citation: m.citation ?? "Клинический протокол СтАР", suggestedReplies: suggestions, toolResult: pendingToolResult ?? m.toolResult, toolName: pendingToolName ?? m.toolName } : m)));
      }
    };

    try {
      const streamResult = await streamCopilotChat({
        messages: outboundMessages,
        patientId,
        activeVisitId,
        sessionId: activeThreadId || undefined,
        activeTooth: typeof activeTooth === "number" ? activeTooth : undefined,
        runtimeMode: apiRuntimeMode,
        trustLevel: settings.trustLevel,
        maskPhiData: settings.maskPhiData ?? true,
        temperature: settings.temperature ?? 0.2,
        contextLimitTokens: settings.contextLimitTokens,
        showTypingAnimation: settings.showTypingAnimation,
        granularPermissions: settings.granularPermissions,
        customInstructions: settings.customDoctorInstructions,
        memoryFacts: memoryFacts.map((m) => m.fact),
        doctorSpecialization: settings.clinicalSpecialization,
        speedMode: settings.speedMode,
        modelRoutingMode: settings.modelRoutingMode,
        byokProvider: settings.byokProvider,
        byokApiKey: settings.byokApiKey,
        byokModel: settings.byokModel,
        onEvent: handleSseEvent,
      });

      if (!streamResult.ok) {
        streamFailed = true;
      } else if (accumulatedText.trim()) {
        setIsStreaming(false);
        return;
      }
    } catch (err) {
      streamFailed = true;
      clientLogger.warn("[CopilotStudioModal] Streaming error:", err);
      showToast("Сбой соединения со шлюзом ИИ. Нажмите «Повторить» для повторной отправки.", "error", 6000, { label: "Повторить", onAction: () => { void handleSendMessage(query); } });
    }
    setIsStreaming(false);
    const localProposal = localPendingAction ? { id: localPendingAction.id, toolName: localPendingAction.toolName, description: localPendingAction.description, payload: { ...(localPendingAction.payload || {}) } } : undefined;
    if (isDemoShowcaseMode()) {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text.trim() ? m.text : (fallbackText || "Готов к работе у кресла. Чем могу помочь?"), citation: m.citation || (localProposal ? "Клинический протокол СтАР" : undefined), actionProposal: m.actionProposal ?? localProposal } : m)));
    } else {
      const isFallbackActive = streamFailed || !accumulatedText.trim();
      const fallbackCleanText = fallbackText || (isFallbackActive ? "Локальный клинический словарь готов к приёму команд." : "");
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? {
        ...m,
        text: m.text.trim() || fallbackCleanText,
        citation: m.citation,
        actionProposal: m.actionProposal ?? localProposal,
        isOfflineFallback: isFallbackActive,
      } : m)));
    }
  };

  const handleApplyPrimaryAction = useCallback(async (action?: CopilotChatMessage["actionProposal"]) => {
    setActionError(null);
    const act = action ?? [...messages].reverse().find((m) => m.role === "assistant" && m.actionProposal && !m.applied && !appliedActionIds.has(m.actionProposal.id))?.actionProposal;
    if (!act) { showToast("Нет активных предложений для применения", "info"); return; }
    const token = readDenteClinicToken() || readDenteStaffToken() || "", apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";

    try {
      if (act.id || act.toolName) {
        try {
          const ok = await executeCopilotConfirmation({ callId: act.id, decision: "confirm", actionName: act.toolName, actionArgs: act.payload || {}, patientId: patientId || undefined, sessionId: activeThreadId || undefined, runtimeMode: apiRuntimeMode });
          if (ok) addToolLog({ toolName: act.toolName, category: "clinical", status: "success", args: act.payload || {}, resultSummary: `Подтверждено действие: ${act.toolName}` });
        } catch (apiErr) { clientLogger.warn("[CopilotStudioModal] Confirm API fallback:", apiErr); }
      }

      if (typeof window !== "undefined") {
        const targetTooth = Number(act.payload?.tooth ?? act.payload?.toothNumber ?? activeTooth) || undefined;
        const targetDiag = (act.payload?.diagnosis as string) || act.description || (targetTooth ? `Клинический статус (Зуб ${targetTooth})` : "Клинический статус");
        const targetPlan = (act.payload?.treatmentPlan as string) || (act.payload?.plan as string) || (act.description ? `План: ${act.description}` : "План лечения согласно протоколу СтАР");
        const isVisitOpen = Boolean(activeVisitId || window.__useVisitStore?.getState()?.visitNoteForm);

        if (isVisitOpen) {
          window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { tooth: targetTooth, toothNumber: targetTooth, state: (act.payload?.state as string) || (act.payload?.status as string) || undefined, diagnosis: targetDiag, diagnosisIcd10: (act.payload?.diagnosisIcd10 as string) || (act.payload?.icd10 as string) || undefined, treatmentPlan: targetPlan, finding: targetTooth ? { toothNumber: targetTooth, state: (act.payload?.state as string) || "caries", icd10Override: (act.payload?.diagnosisIcd10 as string) || undefined } : undefined } }));
          showToast("Клиническое действие успешно применено в карту приёма", "success");
        } else {
          useCopilotStore.getState().addMemoryFact("protocols", `Протокол приёма [${targetDiag}]: ${targetPlan}${targetTooth ? ` (Зуб ${targetTooth})` : ""}`);
          showToast("Визит не открыт: протокол сохранён в памяти ассистента. Откройте приём пациента для вставки в дневник.", "info");
        }
        if (targetTooth) {
          window.dispatchEvent(new CustomEvent("dente-odontogram-update", { detail: { patientId, toothNumber: targetTooth, status: (act.payload?.state as string) || "caries" } }));
        }
      }
      setAppliedActionIds((prev) => new Set([...prev, act.id]));
      setMessages((prev) => prev.map((m) => (m.actionProposal?.id === act.id ? { ...m, applied: true } : m)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось применить действие в карту";
      setActionError(msg); showToast(msg, "error");
    }
  }, [activeTooth, messages, appliedActionIds, patientId, activeThreadId, runtimeMode, addToolLog, activeVisitId]);

  const executeApiTool = async (toolKey: string, payload: Record<string, unknown>) => {
    setIsExecuting(toolKey);
    const startTime = Date.now(), token = readDenteClinicToken() || readDenteStaffToken() || "", apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";
    try {
      const res = await fetch("/api/agent/action", {
        method: "POST", headers: { "Content-Type": "application/json", "x-agent-runtime": apiRuntimeMode, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ toolName: toolKey, args: payload, patientId: patientId || undefined, sessionId: activeThreadId || undefined, runtimeMode: apiRuntimeMode }),
      });
      const data = parseJsonResponse(await res.json().catch(() => ({}))), ok = res.ok && data.ok !== false;
      addToolLog({ toolName: toolKey, category: "clinical", status: ok ? "success" : "rejected", durationMs: Date.now() - startTime, args: payload, resultSummary: ok ? `Выполнен инструмент ${toolKey}` : `Сбой инструмента ${toolKey}: ${data?.error || res.statusText}` });
      showToast(ok ? "Действие успешно выполнено в системе" : `Сбой инструмента ${toolKey}: ${data?.error || ""}`, ok ? "success" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка сети";
      addToolLog({ toolName: toolKey, category: "clinical", status: "rejected", durationMs: Date.now() - startTime, args: payload, resultSummary: `Сбой сети для ${toolKey}: ${msg}` });
      showToast(`Ошибка сети при вызове инструмента: ${msg}`, "error");
    } finally { setIsExecuting(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="copilot-studio-overlay fixed inset-0 z-[99990] flex justify-end max-md:items-end pointer-events-auto" data-testid="chairside-copilot-studio-root">
      <div className="copilot-studio-backdrop fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={handleClose} aria-hidden="true" data-testid="copilot-host-backdrop" />
      <aside className="copilot-studio-panel relative z-10 flex flex-col w-full md:w-[580px] lg:w-[620px] h-[88vh] md:h-full bg-[var(--paper)] text-[var(--ink)] border-t md:border-t-0 md:border-l border-[var(--line)] rounded-t-[24px] md:rounded-t-0 shadow-2xl overflow-x-clip max-w-[100vw]" aria-label="Кабинет клинического копайлота" data-testid="copilot-workspace-panel">
        <div className="copilot-studio-drag-handle-wrap md:hidden flex justify-center pt-2.5 pb-1">
          <div className="copilot-studio-drag-handle w-9 h-1.5 touch-none rounded-full bg-[var(--line)]" />
        </div>

        {/* Компактная шапка кабинета с кнопками Настроек и Истории */}
        <header className="copilot-studio-header px-3 sm:px-6 py-2.5 border-b border-[var(--line)] flex items-center justify-between gap-2 shrink-0">
          <div className="copilot-studio-brand flex items-center gap-2 min-w-0 flex-1">
            <div className="copilot-studio-icon-badge w-8 h-8 rounded-lg bg-[var(--teal-soft)] border border-[var(--teal)]/25 flex items-center justify-center text-[var(--teal)] shrink-0"><Sparkles size={16} /></div>
            <div className="copilot-studio-title-box min-w-0 flex-1">
              <div className="copilot-studio-title-row flex items-center gap-1.5"><h2 className="copilot-studio-heading text-sm font-bold tracking-tight text-[var(--ink)] whitespace-nowrap">ДЕНТА Копайлот</h2><span className="copilot-pulse-dot w-2 h-2 rounded-full bg-[var(--success)] animate-pulse shrink-0" title="Движок активен" /></div>
              <div className="copilot-studio-submeta flex items-center gap-1 text-xs text-[var(--muted)]"><span className="text-[11px] text-[var(--muted)] font-medium whitespace-nowrap"><span className="hidden sm:inline">Клинический ассистент врача</span><span className="sm:hidden">Ассистент</span></span></div>
            </div>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button type="button" onClick={() => setHistoryOpen(true)} data-testid="copilot-history-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0" title="История диалогов" aria-label="История диалогов"><MessageSquare size={15} /></button>
            <button type="button" onClick={() => setSettingsOpen(true)} data-testid="copilot-settings-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0" title="Настройки ИИ" aria-label="Настройки ИИ"><Sliders size={15} /></button>
            <button type="button" onClick={() => { useCopilotStore.getState().collapseToHud(); handleClose(); }} data-testid="copilot-collapse-to-hud-trigger" className="icon-button copilot-studio-collapse-btn w-9 h-9 min-w-[36px] min-h-[36px] items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0" title="Свернуть в панель у кресла (HUD)" aria-label="Свернуть в панель у кресла"><Minimize2 size={15} /></button>
            <button type="button" onClick={handleClose} data-testid="copilot-studio-close-btn" className="copilot-close-btn w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0" aria-label="Закрыть кабинет копайлота"><X size={16} /></button>
          </div>
        </header>

        {/* Компактный Antigravity Context Telemetry Bar (DEF-FRONT-07: честный Empty State без вымышленных Ивановых в бою) */}
        {(() => { const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId); const effectiveName = patientName || (isDemo ? "Кузнецов М.П." : null); return <CopilotContextTelemetryBar patientName={effectiveName} patientId={patientId || (isDemo ? "pat-36" : null)} activeTooth={typeof activeTooth === "number" ? activeTooth : (isDemo ? 36 : null)} compact />; })()}

        {/* Apple HIG Segmented Control: 3 клинические вкладки */}
        <div className="copilot-tabs-segmented-wrapper px-4 py-2 border-b border-[var(--line)] bg-[var(--paper)] shrink-0">
          <div className="copilot-tabs-segmented flex items-center p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1">
            <button type="button" onClick={() => setActiveTab("dialog")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "dialog" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}><BookOpen size={13} className="shrink-0" /><span className="hidden sm:inline">Клинический диалог</span><span className="sm:hidden">Диалог</span></button>
            <button type="button" onClick={() => setActiveTab("actions")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "actions" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}><Activity size={13} className="shrink-0" /><span className="hidden sm:inline">Быстрые действия</span><span className="sm:hidden">Действия</span></button>
            <button type="button" onClick={() => setActiveTab("memory")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "memory" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}><Brain size={13} className="shrink-0" /><span className="hidden sm:inline">Память ИИ</span><span className="sm:hidden">Память</span></button>
          </div>
        </div>

        {/* ВКЛАДКА 1: КЛИНИЧЕСКИЙ ДИАЛОГ */}
        {activeTab === "dialog" && (
          <div className="flex-1 flex flex-col min-h-0">
            {voice.isListening && (
              <div className="copilot-voice-banner mx-5 mt-2.5 p-2.5 rounded-xl bg-[var(--teal-soft)] border border-[var(--teal)] flex items-center justify-between text-xs shrink-0">
                <div className="copilot-voice-status flex items-center gap-2.5 text-[var(--teal)] font-semibold"><Mic size={15} className="animate-bounce" /><span>Идёт распознавание речи...</span></div>
                <button type="button" onClick={voice.stopListening} className="h-11 min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--paper)] text-xs font-bold border border-[var(--line)] cursor-pointer flex items-center justify-center hover:bg-[var(--line)]">Стоп</button>
              </div>
            )}

            <div className="copilot-chat-messages-container flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
              <CopilotVisitClinicalDigest activeTooth={activeTooth} patientId={patientId} onSendMessage={(prompt) => handleSendMessage(prompt)} showEmptyStateIfNoFindings={messages.length === 0} />
              {activeDiff && <div className="my-2"><ActiveDiffCard diff={activeDiff} onApply={applyActiveDiff} onReject={rejectActiveDiff} /></div>}
              {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`copilot-message-bubble max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed ${m.role === "user" ? "copilot-message-user bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]" : "copilot-message-assistant bg-[var(--paper)] border border-[var(--line)] shadow-sm text-[var(--ink)]"}`}>
                      {m.isOfflineFallback && (
                        <div className="copilot-offline-badge mb-2 px-2.5 py-1.5 rounded-xl bg-[var(--warn-soft)] border border-[var(--warn)]/25 text-[var(--warn)] text-[11px] font-semibold flex items-center gap-2 shrink-0">
                          <AlertTriangle size={14} className="shrink-0 text-[var(--warn)]" />
                          <span>Автономный режим: используется локальный клинический словарь (без ИИ)</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap m-0">
                        {m.text || (isStreaming ? "Формирование ответа..." : "")}
                        {isStreaming && m.id === messages[messages.length - 1]?.id && m.role === "assistant" && <span className="copilot-typing-cursor inline-block w-1.5 h-3 bg-[var(--teal)] animate-pulse ml-1 align-middle" />}
                      </p>
                      {/* Агентная карточка инструмента и Contiguous Two-Phase Diff */}
                      {m.actionProposal && (
                        <CopilotStudioToolProposalCard
                          message={m}
                          isActionApplied={Boolean(m.applied || appliedActionIds.has(m.actionProposal.id))}
                          activeTooth={activeTooth}
                          actionError={actionError}
                          onApply={handleApplyPrimaryAction}
                          onReject={() => { setActionError(null); setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, actionProposal: undefined } : msg)); }}
                        />
                      )}
                      {Boolean(m.toolResult) && <div className="mt-2.5"><CopilotResultCard name={m.toolName || m.actionProposal?.toolName} result={m.toolResult} /></div>}
                      {m.citation && <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-1.5 text-[10px] text-[var(--teal)] font-medium"><BookOpen size={11} /><span>{m.citation}</span></div>}
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1 px-1">{m.timestamp}</span>
                  </div>
                ))}
              <CopilotThinkingIndicator isThinking={isStreaming || Boolean(isThinking)} activeTooth={activeTooth} speedMode={speedMode} showThinkingProcess={showThinkingProcess} thoughtProcess={thoughtProcess || currentThought || undefined} currentToolName={activeToolName} />
              <div ref={messagesEndRef} />
            </div>

            {/* Variant 2: Умные контекстные подсказки нейросети (Smart Replies) */}
            {(() => {
              const replies = [...messages].reverse().find((m) => m.role === "assistant")?.suggestedReplies;
              if (!replies?.length || isStreaming) return null;
              return (
                <div className="copilot-smart-replies-track px-3 sm:px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0" data-testid="copilot-smart-replies">
                  <span className="hidden sm:flex text-[11px] text-[var(--teal)] font-semibold shrink-0 items-center gap-1"><Sparkles size={12} className="text-[var(--teal)] shrink-0" /><span>Подсказки:</span></span>
                  {replies.map((reply, i) => <button key={i} type="button" onClick={() => handleSendMessage(reply)} className="copilot-smart-reply-chip shrink-0 px-2.5 sm:px-3 py-1.5 min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] hover:border-[var(--teal)] text-[var(--ink)] text-xs font-medium whitespace-nowrap cursor-pointer transition-all shadow-2xs flex items-center">{reply}</button>)}
                </div>
              );
            })()}

            {/* Нижняя панель ввода (Ровно 1 Primary CTA находится в карточке действия) */}
            <div className="copilot-bottom-composer px-3 sm:px-5 pt-2 pb-5 max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-2">
              <div className="copilot-input-row flex items-center gap-2">
                <button type="button" onClick={voice.toggleListening} aria-label="Голосовой ввод" className={`copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${voice.isListening ? "recording bg-[var(--danger)] text-white border-[var(--danger)] animate-pulse" : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>{voice.isListening ? <MicOff size={18} /> : <Mic size={18} />}{voice.isListening && <div className="copilot-vu-meter flex items-end gap-0.5 h-3.5 px-0.5" aria-label="Индикатор звука"><span className="w-0.5 rounded-full h-3 bg-white animate-pulse" /><span className="w-0.5 rounded-full h-3.5 bg-white animate-pulse" /><span className="w-0.5 rounded-full h-2 bg-white animate-pulse" /></div>}</button>
                <input type="text" value={inputText} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } }} placeholder="Запрос или диктовка..." className="copilot-text-input flex-1 h-11 min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]" />
                <button type="button" onClick={() => handleSendMessage()} className="copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer" aria-label="Отправить запрос"><Send size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: БЫСТРЫЕ ДЕЙСТВИЯ (FASTIFY API) И ЛОГИ ИНСТРУМЕНТОВ */}
        {activeTab === "actions" && <CopilotStudioActionsTab activeTooth={activeTooth} patientId={patientId} runtimeMode={runtimeMode} toolExecutionLogs={toolExecutionLogs} activeDiff={activeDiff} setActiveDiff={setActiveDiff} applyActiveDiff={applyActiveDiff} rejectActiveDiff={rejectActiveDiff} executeApiTool={executeApiTool} />}
        {/* ВКЛАДКА 3: ПАМЯТЬ ИИ (LONG-TERM CLINICAL PREFERENCES) */}
        {activeTab === "memory" && <CopilotMemoryTab />}
        <CopilotSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} onOpenMemoryTab={() => { setSettingsOpen(false); setActiveTab("memory"); }} />
        <CopilotHistoryDrawer isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} onSelectThread={(tId) => {
          selectThread(tId); setMessages([]); const saved = threadMessages[tId];
          if (saved && saved.length > 0) setMessages(parseChatMsgs(saved));
          else { const f = threads.find((t) => t.id === tId); setMessages(f?.previewText ? [{ id: `thread-init-${Date.now()}`, role: "assistant", text: f.previewText, timestamp: f.updatedAt, citation: "Клинический протокол СтАР" }] : []); void hydrateSession(tId); }
          setHistoryOpen(false); setActiveTab("dialog");
        }} />
      </aside>
    </div>
  );
};
export const ChairsideCopilotStudioModal = CopilotStudioModal; export default CopilotStudioModal;
