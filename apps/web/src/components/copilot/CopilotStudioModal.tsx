/**
 * CopilotStudioModal.tsx — Канонический SSOT выдвижной кабинет и студия Копайлота DENTE.
 * Мандаты 8b (380-450 строк), 8e (автономия), 8am (1 Primary CTA), 8wy (двухрежимный харнесс), Apple HIG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Mic, MicOff, Check, Calendar, Activity, Receipt, Sparkles, BookOpen, Sliders, MessageSquare, Brain } from "lucide-react";
import "./styles/copilotStudio.css";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { showToast } from "../GlobalToast";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode, isDemoPatientId } from "../../lib/demoMode";
import { CLINICAL_QUICK_PRESETS, CRM_FASTIFY_TOOLS_REGISTRY } from "./copilotCatalogData";
import { SHOWCASE_INITIAL_MESSAGES } from "../../store/copilotShowcaseData";
import { useCopilotStore } from "../../store/copilotStore";
import { CopilotSettingsModal } from "./CopilotSettingsModal"; import { CopilotHistoryDrawer } from "./CopilotHistoryDrawer";
import { CopilotThinkingIndicator } from "./CopilotThinkingIndicator"; import { CopilotMemoryTab } from "./CopilotMemoryTab";
import { CopilotContextTelemetryBar } from "./telemetry/CopilotContextTelemetryBar"; import { CopilotVisitClinicalDigest } from "./CopilotVisitClinicalDigest";
import { handleClinicalSpeechOrText } from "./copilotDictationHandler";
import { ActiveDiffCard } from "./cards/ActiveDiffCard"; import { CopilotToolLogsView } from "./cards/CopilotToolLogsView";
import { CopilotResultCard } from "./CopilotResultCard";

export type CopilotStudioTab = "dialog" | "actions" | "memory";

export interface CopilotStudioModalProps {
  isOpen: boolean; onClose: () => void; activeTooth?: number | null | undefined;
  patientId?: string | null | undefined; patientName?: string | null | undefined; activeVisitId?: string | null | undefined;
  initialTab?: CopilotStudioTab | undefined; initialMessages?: CopilotChatMessage[] | undefined; isThinking?: boolean | undefined; thoughtProcess?: string | undefined;
}
export type ChairsideCopilotStudioModalProps = CopilotStudioModalProps;

export interface CopilotChatMessage {
  id: string; role: "user" | "assistant"; text: string; citation?: string | undefined; timestamp: string; applied?: boolean | undefined;
  actionProposal?: { id: string; toolName: string; description: string; payload: Record<string, unknown> } | undefined; suggestedReplies?: string[] | undefined;
  toolResult?: unknown | undefined; toolName?: string | undefined;
}

const extractSuggestions = (text: string) => {
  const m = text.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
  let suggestions: string[] | undefined;
  if (m) { try { const list = JSON.parse(m[1]); if (Array.isArray(list)) suggestions = list.filter((s): s is string => typeof s === "string"); } catch { /* skip */ } }
  return { cleanText: text.replace(/<<<SUGGESTIONS:[\s\S]*?(?:>>>|$)/g, "").trim(), suggestions };
};
export const DEFAULT_INITIAL_MESSAGES: CopilotChatMessage[] = [];

const parseChatMsgs = (list?: any[]): CopilotChatMessage[] => (list || []).map((m, i) => {
  const raw = m.text || m.content || (m.kind === "tool" ? `Выполнен инструмент: ${m.name}` : "");
  const { cleanText, suggestions } = extractSuggestions(raw);
  return { id: m.id || m.callId || `msg-${i}`, role: m.role || (m.kind === "tool" ? "assistant" : "user"), text: cleanText, timestamp: m.timestamp || "10:00", applied: m.applied, citation: m.citation, actionProposal: m.actionProposal, suggestedReplies: m.suggestedReplies || suggestions, toolResult: m.toolResult, toolName: m.toolName };
});

const toValidUuid = (val?: string | null): string | undefined => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val) ? val : undefined;

export const CopilotStudioModal: React.FC<CopilotStudioModalProps> = ({
  isOpen, onClose, activeTooth, patientId, patientName, activeVisitId, initialTab = "dialog", initialMessages, isThinking, thoughtProcess,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotStudioTab>((initialTab as CopilotStudioTab) || "dialog");
  const [actionsSubTab, setActionsSubTab] = useState<"quick" | "logs">("quick");
  const { settings, memoryFacts, activeThreadId, threadMessages, saveThreadMessages, setRuntimeMode, isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen, threads, selectThread, addToolLog, activeDiff, applyActiveDiff, rejectActiveDiff, toolExecutionLogs } = useCopilotStore();
  const { runtimeMode, speedMode, showThinkingProcess } = settings;
  const threadKey = activeThreadId || "default-thread";

  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => (initialMessages?.length ? parseChatMsgs(initialMessages) : ((threadMessages[threadKey]?.length ? threadMessages[threadKey] : ((isDemoShowcaseMode() || isDemoPatientId(patientId)) ? (SHOWCASE_INITIAL_MESSAGES as CopilotChatMessage[]) : [])))));
  useEffect(() => { if (initialMessages?.length) setMessages(parseChatMsgs(initialMessages)); }, [initialMessages]);
  const hydrateSession = useCallback(async (sId: string) => {
    try {
      const tok = readDenteClinicToken() || readDenteStaffToken() || "";
      const res = await fetch(`/api/agent/sessions/${encodeURIComponent(sId)}/messages`, { headers: tok ? { Authorization: `Bearer ${tok}` } : {} });
      if (res.ok) {
        const b = await res.json(), raw = Array.isArray(b?.messages) ? b.messages : Array.isArray(b?.data) ? b.data : null;
        if (raw?.length) {
          const p = parseChatMsgs(raw.map((m: any) => ({ id: m.id, role: m.role, content: m.content || m.text, timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : undefined })));
          setMessages(p); saveThreadMessages(sId, p); return true;
        }
      }
    } catch { /* офлайн */ }
    return false;
  }, [saveThreadMessages]);
  useEffect(() => {
    const saved = threadMessages[threadKey];
    if (saved && saved.length > 0) setMessages(saved);
    else if (threadKey && threadKey !== "default-thread") void hydrateSession(threadKey).then((ok) => { if (!ok && !isDemoShowcaseMode() && !isDemoPatientId(patientId)) setMessages([]); });
    else if (!isDemoShowcaseMode() && !isDemoPatientId(patientId)) setMessages([]);
  }, [threadKey, patientId, hydrateSession]);
  useEffect(() => { if (initialTab) setActiveTab(initialTab as CopilotStudioTab); }, [initialTab]);
  useEffect(() => { if (messages.length > 0) saveThreadMessages(threadKey, messages); }, [messages, threadKey, saveThreadMessages]);
  const handleClose = useCallback(() => { if (messages.length > 0) saveThreadMessages(threadKey, messages); onClose(); }, [messages, threadKey, saveThreadMessages, onClose]);

  const [inputText, setInputText] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
  const baseDraftRef = useRef<string>(inputText), messagesEndRef = useRef<HTMLDivElement>(null), isFirstRenderRef = useRef<boolean>(true);
  const [appliedStatus, setAppliedStatus] = useState<boolean>(false), [actionError, setActionError] = useState<string | null>(null), [, setIsExecuting] = useState<string | null>(null), [isStreaming, setIsStreaming] = useState<boolean>(false), [currentThought, setCurrentThought] = useState<string>(""), [activeToolName, setActiveToolName] = useState<string | null>(null);
  const unifiedVoice = useUnifiedDictation({ preferredMode: "gemini_live", context: "chat", patientId: toValidUuid(patientId), visitId: toValidUuid(activeVisitId), autoFallback: true });
  const voice = { isListening: unifiedVoice.isRecording, fullText: unifiedVoice.fullTranscript, toggleListening: unifiedVoice.toggleDictation, stopListening: unifiedVoice.stopDictation, clearTranscript: unifiedVoice.clearTranscript };

  // Автоматическое определение среды исполнения без ручных переключателей
  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints > 0) || window.matchMedia?.("(pointer: coarse)").matches;
    const w = window as unknown as { electron?: unknown; __TAURI__?: unknown };
    if (Boolean(w.electron || w.__TAURI__) && runtimeMode !== "desktop_native") setRuntimeMode("desktop_native");
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

  const parseSseEvents = (raw: string): Array<{ type: string; [k: string]: unknown }> => {
    const list: Array<{ type: string; [k: string]: unknown }> = [];
    for (const b of raw.split(/\r?\n\r?\n/)) {
      const trimmed = b.trim(); if (!trimmed) continue;
      let eventType = "";
      for (const l of trimmed.split(/\r?\n/)) {
        if (l.startsWith("event: ")) eventType = l.slice(7).trim();
        else if (l.startsWith("data: ")) { try { const p = JSON.parse(l.slice(6).trim()); if (!p.type && eventType) p.type = eventType; list.push(p); } catch { /* skip */ } }
      }
    }
    return list;
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
    const { fallbackText, fallbackProposalTooth, pendingAction: localPendingAction } = handleClinicalSpeechOrText(query, patientId, activeTooth, { trustLevel: settings.trustLevel });
    const token = readDenteClinicToken() || readDenteStaffToken() || "";
    const apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";

    // Скользящее окно многошаговой памяти диалога (AI-REV-06): последние 10 сообщений + текущий запрос
    const historyWindow = messages.filter((m) => m.text && m.text.trim().length > 0).slice(-10).map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.text }));
    const outboundMessages = [...historyWindow, { role: "user" as const, content: query }];

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          messages: outboundMessages, patientId: toValidUuid(patientId), activeVisitId: toValidUuid(activeVisitId), stream: true, runtimeMode: apiRuntimeMode,
          sessionId: activeThreadId || undefined, temperature: settings.temperature ?? 0.2, contextLimitTokens: settings.contextLimitTokens, showTypingAnimation: settings.showTypingAnimation,
          trustLevel: settings.trustLevel, granularPermissions: settings.granularPermissions, customInstructions: settings.customDoctorInstructions,
          memoryFacts: memoryFacts.map((m) => m.fact), doctorSpecialization: settings.clinicalSpecialization, speedMode: settings.speedMode,
          activeTooth: typeof activeTooth === "number" ? activeTooth : undefined, modelRoutingMode: settings.modelRoutingMode, byokProvider: settings.byokProvider, byokApiKey: settings.byokApiKey, byokModel: settings.byokModel,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader(); const decoder = new TextDecoder("utf-8");
        let accumulatedText = ""; let accumulatedThought = ""; let pendingAction: CopilotChatMessage["actionProposal"] | undefined; let sseBuffer = "";
        let pendingToolResult: unknown | undefined; let pendingToolName: string | undefined;
        const applySseEvents = (events: Array<{ type: string; [k: string]: unknown }>) => {
          for (const ev of events) {
            if (ev.type === "token" && typeof ev.text === "string") accumulatedText += ev.text;
            else if ((ev.type === "thought" || ev.type === "thinking" || ev.type === "reasoning") && typeof ev.text === "string") { accumulatedThought += ev.text; setCurrentThought(accumulatedThought); }
            else if (ev.type === "confirmation_required" || ev.type === "tool_call_started" || ev.type === "tool_start") {
              const callId = String(ev.callId || `act-${Date.now()}`), toolName = String(ev.tool || ev.name || CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus);
              setActiveToolName(toolName);
              const args = (ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object" ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
              const desc = typeof ev.descriptionRu === "string" ? ev.descriptionRu : `Подтверждение действия: ${toolName}`;
              pendingAction = { id: callId, toolName, description: desc, payload: args };
              addToolLog({ toolName, category: "clinical", status: "pending", args, resultSummary: desc });
            } else if (ev.type === "tool_end" || ev.type === "tool_call_finished" || ev.type === "tool_result") {
              setActiveToolName(null);
              pendingToolName = String(ev.name || ev.tool || pendingAction?.toolName || "");
              pendingToolResult = ev.result ?? ev.data ?? ev.payload;
              const evArgs = ((ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object") ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
              if (evArgs.beforeText || evArgs.afterText || pendingToolName.includes("file") || pendingToolName.includes("workstation")) {
                const targetFile = String(evArgs.targetEntity || evArgs.path || evArgs.file || "workstation_document.txt");
                useCopilotStore.getState().setActiveDiff({
                  id: `diff-${Date.now()}`,
                  title: `Изменения файла: ${targetFile.split(/[/\\]/).pop() || targetFile}`,
                  targetEntity: targetFile,
                  beforeText: String(evArgs.beforeText || "(Исходное состояние файла)"),
                  afterText: String(evArgs.afterText || evArgs.content || (typeof pendingToolResult === "string" ? pendingToolResult : JSON.stringify(pendingToolResult, null, 2)) || "(Обновлённое содержимое)"),
                  applied: false,
                });
              }
              addToolLog({ toolName: pendingToolName, category: "clinical", status: "success", args: (ev.args as any) || {}, resultSummary: `Выполнен: ${pendingToolName}` });
            } else if ((ev.type === "done" || ev.type === "final_answer") && typeof ev.text === "string" && !accumulatedText) {
              setActiveToolName(null);
              accumulatedText = ev.text;
            }
          }
          if (accumulatedText || pendingToolResult) {
            const { cleanText, suggestions } = extractSuggestions(accumulatedText);
            const effectiveAction = pendingAction ?? (localPendingAction ? { id: localPendingAction.id, toolName: localPendingAction.toolName, description: localPendingAction.description, payload: { ...(localPendingAction.payload || {}), execute: localPendingAction.execute } } : undefined);
            setMessages((prev) => prev.map((m): CopilotChatMessage => (m.id === assistantMsgId ? { ...m, text: cleanText, actionProposal: effectiveAction ?? m.actionProposal, citation: m.citation ?? "Клинический протокол СтАР", suggestedReplies: suggestions, toolResult: pendingToolResult ?? m.toolResult, toolName: pendingToolName ?? m.toolName } : m)));
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) { sseBuffer += decoder.decode(); if (sseBuffer.trim()) applySseEvents(parseSseEvents(sseBuffer)); break; }
          sseBuffer += decoder.decode(value, { stream: true });
          const matches = [...sseBuffer.matchAll(/\r?\n\r?\n/g)];
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1]; const splitPos = lastMatch.index ?? 0;
            const chunkToParse = sseBuffer.slice(0, splitPos); sseBuffer = sseBuffer.slice(splitPos + lastMatch[0].length);
            applySseEvents(parseSseEvents(chunkToParse));
          }
        }
        if (accumulatedText.trim()) { setIsStreaming(false); return; }
      }
    } catch { /* Сетевой сбой или недоступность шлюза */ }

    setIsStreaming(false);
    const localProposal = localPendingAction ? { id: localPendingAction.id, toolName: localPendingAction.toolName, description: localPendingAction.description, payload: { ...(localPendingAction.payload || {}), execute: localPendingAction.execute } } : undefined;
    if (isDemoShowcaseMode()) {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text.trim() ? m.text : fallbackText, citation: "Клинический протокол СтАР (Диагностика и лечение кариеса и пульпита)", actionProposal: m.actionProposal ?? localProposal ?? { id: `act-${Date.now()}`, toolName: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, description: `Обновление одонтограммы для зуба ${fallbackProposalTooth}`, payload: { tooth: fallbackProposalTooth } } } : m)));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text.trim() || fallbackText || "Шлюз ИИ временно недоступен. Проверьте интернет-соединение или API-ключи.", citation: undefined, actionProposal: m.actionProposal ?? localProposal } : m)));
    }
  };

  const handleApplyPrimaryAction = useCallback(async (action?: CopilotChatMessage["actionProposal"]) => {
    setActionError(null);
    const act = action ?? [...messages].reverse().find((m) => m.role === "assistant" && m.actionProposal && !m.applied)?.actionProposal;
    try {
      if (act?.payload && typeof (act.payload as any).execute === "function") {
        await Promise.resolve((act.payload as any).execute());
      } else if (typeof window !== "undefined") {
        const targetTooth = Number(act?.payload?.tooth ?? act?.payload?.toothNumber ?? activeTooth) || undefined;
        const targetDiag = (act?.payload?.diagnosis as string) || act?.description || (targetTooth ? `Клинический статус (Зуб ${targetTooth})` : "Клинический статус");
        const targetPlan = (act?.payload?.treatmentPlan as string) || (act?.payload?.plan as string) || (act?.description ? `План: ${act.description}` : "План лечения согласно протоколу СтАР");
        window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { tooth: targetTooth, toothNumber: targetTooth, state: (act?.payload?.state as string) || (act?.payload?.status as string) || undefined, diagnosis: targetDiag, diagnosisIcd10: (act?.payload?.diagnosisIcd10 as string) || (act?.payload?.icd10 as string) || undefined, treatmentPlan: targetPlan, finding: targetTooth ? { toothNumber: targetTooth, state: (act?.payload?.state as string) || "caries", icd10Override: (act?.payload?.diagnosisIcd10 as string) || undefined } : undefined } }));
      }
      setAppliedStatus(true);
      showToast("Клиническое действие успешно применено в карту приёма", "success");
      setMessages((prev) => prev.map((m) => (m.role === "assistant" ? { ...m, applied: true } : m)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось применить действие в карту";
      setActionError(msg); showToast(msg, "error");
    }
  }, [activeTooth, messages]);

  const executeApiTool = async (toolKey: string, payload: Record<string, unknown>) => {
    setIsExecuting(toolKey);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/v1/copilot/tools/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolName: toolKey, arguments: payload }) });
      addToolLog({ toolName: toolKey, category: "clinical", status: res.ok ? "success" : "error", durationMs: Date.now() - startTime, args: payload, resultSummary: res.ok ? `Выполнен инструмент ${toolKey}` : `Сбой инструмента ${toolKey}` });
      showToast(res.ok ? "Действие успешно зарегистрировано в системе" : `Сбой выполнения инструмента ${toolKey}`, res.ok ? "success" : "error");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ошибка сети";
      addToolLog({ toolName: toolKey, category: "clinical", status: "error", durationMs: Date.now() - startTime, args: payload, resultSummary: `Сбой сети для ${toolKey}: ${msg}` });
      showToast(`Ошибка сети при вызове инструмента: ${msg}`, "error");
    } finally { setIsExecuting(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="copilot-studio-overlay fixed inset-0 z-[99990] flex justify-end max-md:items-end pointer-events-auto" data-testid="chairside-copilot-studio-root">
      <div className="copilot-studio-backdrop fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={handleClose} aria-hidden="true" data-testid="copilot-host-backdrop" />
      <aside className="copilot-studio-panel relative z-10 flex flex-col w-full md:w-[580px] lg:w-[620px] h-[88vh] md:h-full bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-t md:border-t-0 md:border-l border-[var(--line,rgba(15,118,110,0.15))] rounded-t-[24px] md:rounded-t-0 shadow-2xl overflow-x-clip max-w-[100vw]" aria-label="Кабинет клинического копайлота" data-testid="copilot-workspace-panel">
        <div className="copilot-studio-drag-handle-wrap md:hidden flex justify-center pt-2.5 pb-1">
          <div className="copilot-studio-drag-handle w-9 h-1.5 touch-none rounded-full bg-[var(--line,rgba(15,118,110,0.25))]" />
        </div>

        {/* Компактная шапка кабинета с кнопками Настроек и Истории */}
        <header className="copilot-studio-header px-4 sm:px-6 py-2.5 border-b border-[var(--line,rgba(15,118,110,0.15))] flex items-center justify-between gap-2.5 shrink-0">
          <div className="copilot-studio-brand flex items-center gap-2.5 min-w-0 flex-1">
            <div className="copilot-studio-icon-badge w-8 h-8 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,rgba(13,148,136,0.3))] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="copilot-studio-title-box min-w-0 flex-1 truncate">
              <div className="copilot-studio-title-row flex items-center gap-2"><h2 className="copilot-studio-heading text-sm font-bold tracking-tight text-[var(--ink)] truncate">ДЕНТА Копайлот</h2><span className="copilot-pulse-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Движок активен" /></div>
              <div className="copilot-studio-submeta flex items-center gap-1.5 text-xs text-[var(--muted)] truncate"><span className="text-[11px] text-[var(--muted)] font-medium truncate"><span className="hidden sm:inline">Клинический ассистент врача</span><span className="sm:hidden">Ассистент</span></span></div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setHistoryOpen(true)} data-testid="copilot-history-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0" title="История диалогов" aria-label="История диалогов"><MessageSquare size={15} /></button>
            <button type="button" onClick={() => setSettingsOpen(true)} data-testid="copilot-settings-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer shrink-0" title="Настройки ИИ" aria-label="Настройки ИИ"><Sliders size={15} /></button>
            <button type="button" onClick={handleClose} data-testid="copilot-studio-close-btn" className="copilot-close-btn w-11 h-11 min-w-[44px] min-h-[44px] sm:w-9 sm:h-9 sm:min-w-[36px] sm:min-h-[36px] rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer shrink-0" aria-label="Закрыть кабинет копайлота"><X size={16} /></button>
          </div>
        </header>

        {/* Компактный Antigravity Context Telemetry Bar (DEF-FRONT-07: честный Empty State без вымышленных Ивановых в бою) */}
        {(() => { const isDemo = isDemoShowcaseMode() || isDemoPatientId(patientId); const effectiveName = (patientName && patientName !== "Иванов Иван Иванович") ? patientName : (isDemo ? (patientName || "Кузнецов М.П.") : null); return <CopilotContextTelemetryBar patientName={effectiveName} patientId={patientId || (isDemo ? "pat-36" : null)} activeTooth={typeof activeTooth === "number" ? activeTooth : (isDemo ? 36 : null)} compact />; })()}

        {/* Apple HIG Segmented Control: 3 клинические вкладки */}
        <div className="copilot-tabs-segmented-wrapper px-4 py-2 border-b border-[var(--line,rgba(15,118,110,0.15))] bg-[var(--paper,#ffffff)] shrink-0">
          <div className="copilot-tabs-segmented flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line,rgba(15,118,110,0.15))] gap-1">
            <button type="button" onClick={() => setActiveTab("dialog")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "dialog" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}>
              <BookOpen size={13} className="shrink-0" /><span className="hidden sm:inline">Клинический диалог</span><span className="sm:hidden">Диалог</span>
            </button>
            <button type="button" onClick={() => setActiveTab("actions")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "actions" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}>
              <Activity size={13} className="shrink-0" /><span className="hidden sm:inline">Быстрые действия</span><span className="sm:hidden">Действия</span>
            </button>
            <button type="button" onClick={() => setActiveTab("memory")} className={`copilot-tab-btn flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeTab === "memory" ? "active bg-[var(--paper)] text-[var(--teal)] font-bold shadow-sm border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}>
              <Brain size={13} className="shrink-0" /><span className="hidden sm:inline">Память ИИ</span><span className="sm:hidden">Память</span>
            </button>
          </div>
        </div>

        {/* ВКЛАДКА 1: КЛИНИЧЕСКИЙ ДИАЛОГ */}
        {activeTab === "dialog" && (
          <div className="flex-1 flex flex-col min-h-0">
            {voice.isListening && (
              <div className="copilot-voice-banner mx-5 mt-2.5 p-2.5 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)] flex items-center justify-between text-xs shrink-0">
                <div className="copilot-voice-status flex items-center gap-2.5 text-[var(--teal,#0d9488)] font-semibold"><Mic size={15} className="animate-bounce" /><span>Идёт распознавание речи...</span></div>
                <button type="button" onClick={voice.stopListening} className="h-11 min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-xl bg-[var(--paper)] text-xs font-bold border border-[var(--line)] cursor-pointer flex items-center justify-center hover:bg-[var(--line)]">Стоп</button>
              </div>
            )}

            <div className="copilot-chat-messages-container flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
              <CopilotVisitClinicalDigest activeTooth={activeTooth} patientId={patientId} onSendMessage={(prompt) => handleSendMessage(prompt)} showEmptyStateIfNoFindings={messages.length === 0} />
              {activeDiff && <div className="my-2"><ActiveDiffCard diff={activeDiff} onApply={applyActiveDiff} onReject={rejectActiveDiff} /></div>}
              {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                    <div className={`copilot-message-bubble max-w-[92%] p-3.5 rounded-2xl text-xs leading-relaxed ${m.role === "user" ? "copilot-message-user bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] text-[var(--ink)]" : "copilot-message-assistant bg-[var(--paper,#ffffff)] border border-[var(--line)] shadow-sm text-[var(--ink)]"}`}>
                      <p className="whitespace-pre-wrap m-0">
                        {m.text || (isStreaming ? "Формирование ответа..." : "")}
                        {isStreaming && m.role === "assistant" && !m.text && (
                          <span className="copilot-typing-cursor inline-block w-1.5 h-3 bg-[var(--teal,#0d9488)] animate-pulse ml-1 align-middle" />
                        )}
                      </p>
                      {/* Агентная карточка инструмента и Contiguous Two-Phase Diff */}
                      {m.actionProposal && !m.applied && (() => {
                        const proposalTooth = Number(m.actionProposal.payload?.tooth ?? m.actionProposal.payload?.toothNumber ?? (activeTooth || 36));
                        const toolShort = m.actionProposal.toolName.split('.').pop() || m.actionProposal.toolName;
                        const actionTitle = toolShort.includes("Soap") || toolShort.includes("Diary") || toolShort.includes("Visit") ? `Дневник приёма (Зуб ${proposalTooth})` : toolShort.includes("Tooth") ? `Обновление одонтограммы (Зуб ${proposalTooth})` : `Клинический протокол (Зуб ${proposalTooth})`;
                        return (
                          <div className="copilot-tool-execution-card mt-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--teal,#0d9488)]/30 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]"><Activity size={13} className="text-[var(--teal,#0d9488)]" /><span>{actionTitle}</span></div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Требуется подтверждение</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] text-xs space-y-1.5">
                              <div className="flex items-center gap-2 text-[var(--muted)]"><span className="text-[11px] font-medium text-[var(--muted)] w-14 shrink-0">Было:</span><span className="line-through opacity-75">{`Зуб ${proposalTooth}: Без патологии / Интактный`}</span></div>
                              <div className="flex items-center gap-2 text-[var(--ink)] font-medium"><span className="text-[11px] font-semibold text-[var(--teal,#0d9488)] w-14 shrink-0">Станет:</span><span className="text-[var(--teal,#0d9488)] font-semibold">{`Зуб ${proposalTooth}: ${m.actionProposal.description}`}</span></div>
                            </div>
                            {actionError && (
                              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-between text-[11px] text-rose-700 dark:text-rose-300"><span>{actionError}</span><button type="button" onClick={() => handleApplyPrimaryAction(m.actionProposal)} className="px-2 py-1 rounded bg-rose-600 text-white font-semibold hover:bg-rose-700 cursor-pointer text-[10px]">Повторить попытку</button></div>
                            )}
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button type="button" onClick={() => { setActionError(null); setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, actionProposal: undefined } : msg)); }} className="h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-rose-600 font-semibold cursor-pointer text-xs flex items-center justify-center transition-colors">Отклонить</button>
                              <button type="button" data-testid="copilot-primary-apply-cta" onClick={() => handleApplyPrimaryAction(m.actionProposal)} className="copilot-primary-cta h-11 min-h-[44px] px-4 rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-sm hover:opacity-95 transition-all"><Check size={14} /><span>{appliedStatus ? "Применено в карту приёма" : "Применить в карту"}</span></button>
                            </div>
                          </div>
                        );
                      })()}
                      {m.toolResult && <div className="mt-2.5"><CopilotResultCard name={m.toolName || m.actionProposal?.toolName} result={m.toolResult} /></div>}
                      {m.citation && (<div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-1.5 text-[10px] text-[var(--teal,#0d9488)] font-medium"><BookOpen size={11} /><span>{m.citation}</span></div>)}
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1 px-1">{m.timestamp}</span>
                  </div>
                ))}

              <CopilotThinkingIndicator isThinking={isStreaming || Boolean(isThinking)} activeTooth={activeTooth} speedMode={speedMode} showThinkingProcess={showThinkingProcess} thoughtProcess={thoughtProcess || currentThought || undefined} currentToolName={activeToolName} />
              <div ref={messagesEndRef} />
            </div>

            {/* Variant 2: Умные контекстные подсказки нейросети (Smart Replies) */}
            {(() => {
              const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
              const replies = lastAssistant?.suggestedReplies;
              if (!replies || replies.length === 0 || isStreaming) return null;
              return (
                <div className="copilot-smart-replies-track px-3 sm:px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 snap-x" data-testid="copilot-smart-replies">
                  <span className="text-[11px] text-[var(--teal,#0d9488)] font-semibold shrink-0 flex items-center gap-1"><Sparkles size={12} className="text-[var(--teal,#0d9488)] shrink-0" /><span className="hidden sm:inline">Подсказки:</span></span>
                  {replies.map((reply, i) => <button key={i} type="button" onClick={() => handleSendMessage(reply)} className="copilot-smart-reply-chip shrink-0 px-3 py-1.5 min-h-[36px] rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] hover:border-[var(--teal,#0d9488)] text-[var(--ink)] text-xs font-medium whitespace-nowrap cursor-pointer transition-all shadow-2xs snap-start flex items-center">{reply}</button>)}
                </div>
              );
            })()}

            {/* Нижняя панель ввода (Ровно 1 Primary CTA находится в карточке действия) */}
            <div className="copilot-bottom-composer px-3 sm:px-5 pt-2 pb-5 max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-2">
              <div className="copilot-input-row flex items-center gap-2">
                <button type="button" onClick={voice.toggleListening} aria-label="Голосовой ввод" className={`copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${voice.isListening ? "recording bg-rose-500 text-white border-rose-600 animate-pulse" : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"}`}>
                  {voice.isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  {voice.isListening && <div className="copilot-vu-meter flex items-end gap-0.5 h-3.5 px-0.5" aria-label="Индикатор звука"><span className="w-0.5 rounded-full h-3 bg-white animate-pulse" /><span className="w-0.5 rounded-full h-3.5 bg-white animate-pulse" /><span className="w-0.5 rounded-full h-2 bg-white animate-pulse" /></div>}
                </button>
                <input type="text" value={inputText} onChange={(e) => handleInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } }} placeholder="Запрос или диктовка..." className="copilot-text-input flex-1 h-11 min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]" />
                <button type="button" onClick={() => handleSendMessage()} className="copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer" aria-label="Отправить запрос"><Send size={16} /></button>
              </div>
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: БЫСТРЫЕ ДЕЙСТВИЯ (FASTIFY API) И ЛОГИ ИНСТРУМЕНТОВ */}
        {activeTab === "actions" && (
          <div className="copilot-actions-grid flex-1 overflow-y-auto p-5 space-y-3.5">
            {/* Apple HIG Segmented Control: Быстрые действия vs Логи инструментов */}
            <div className="flex items-center p-1 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--line)] gap-1 shrink-0">
              {(["quick", "logs"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActionsSubTab(tab)} data-testid={`copilot-actions-subtab-${tab}`} className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${actionsSubTab === tab ? "bg-[var(--paper)] text-[var(--teal,#0d9488)] font-bold shadow-xs border border-[var(--line)]" : "text-[var(--muted)] hover:text-[var(--ink)] bg-transparent border-transparent"}`}>
                  <span>{tab === "quick" ? "Быстрые действия" : "Логи и диффы"}</span>
                  {tab === "logs" && toolExecutionLogs.length > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold">{toolExecutionLogs.length}</span>}
                </button>
              ))}
            </div>
            {activeDiff && <ActiveDiffCard diff={activeDiff} onApply={applyActiveDiff} onReject={rejectActiveDiff} />}

            {actionsSubTab === "quick" ? (
              <>
                <p className="text-xs text-[var(--muted)] leading-normal m-0">Клинические инструменты прямого исполнения без блокировок врача:</p>
                {[
                  { title: "Бронирование слота", badge: "Расписание", desc: "Резерв следующего этапа терапии через 7 дней без обязательных начмедов.", btn: "Забронировать окно приёма", icon: <Calendar size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot, { patientId, tooth: activeTooth, service: "Терапия" }) },
                  { title: "Зубная формула FDI", badge: "Одонтограмма", desc: `Фиксация кариеса дентина и пломбирования зуба ${activeTooth || 36}.`, btn: `Обновить статус зуба ${activeTooth || 36}`, icon: <Activity size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, { tooth: activeTooth || 36, state: "C", diagnosis: "K02.1" }) },
                  { title: "Выставление счёта", badge: "Касса и чеки", desc: "Пречек на препарирование и нанокомпозитную реставрацию: 6 500 руб.", btn: "Сформировать счёт (6 500 руб.)", icon: <Receipt size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createInvoiceDraft, { patientId, amountKopecks: 650000, serviceTitle: "Лечение кариеса" }) },
                  { title: "Протокол SOAP в карту", badge: "Медкарта", desc: "Синтез дневника по стандарту SOAP с жалобами, осмотром и лечением.", btn: "Сформировать протокол SOAP", icon: <BookOpen size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary, { toothNumber: Number(activeTooth || 36), diagnosisMkb: "K02.1", complaints: "Жалобы на кратковременные боли от холодного и сладкого", patientId }) },
                  ...(runtimeMode === "desktop_native" ? [
                    { title: "Захват визиографа (ROI)", badge: "Рабочая станция", desc: "Локальный снимок активного окна визиографа для анализа рентгенограммы.", btn: "Захватить снимок визиографа", icon: <Sparkles size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool("capture_workstation_screen", { diagnosticReason: `Анализ визиографа зуба ${activeTooth || 36}`, targetScreenIndex: 0 }) },
                    { title: "Поиск КЛКТ на диске", badge: "Локальный диск", desc: "Сканирование сетевой папки томографа Romexis/Ez3D на наличие новых срезов.", btn: "Сканировать папку КЛКТ", icon: <Brain size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool("search_workstation_files", { query: "dicom", category: "xray_study" }) },
                    { title: "Редактирование файла на ПК", badge: "Файлы и дифф", desc: "Замена фрагмента клинической выписки с формированием верифицированного диффа.", btn: "Сформировать дифф файла", icon: <Activity size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => { setActiveDiff({ id: `diff-file-${Date.now()}`, title: "Редактирование: protocol_tooth_36.txt", targetEntity: "C:\\Radiology\\Export\\protocol_tooth_36.txt", beforeText: "Диагноз: Кариес дентина K02.1\nЛечение: Назначена терапия", afterText: "Диагноз: K02.1 Глубокий кариес дентина (Зуб 36)\nЛечение: Препарирование полости, нанокомпозитная реставрация Ceram.X Duo под анестезией Артикаин 1:200к", applied: false }); setActionsSubTab("logs"); showToast("Сформирован дифф изменений файла на ПК", "info"); } },
                  ] : []),
                ].map((item, idx) => (
                  <div key={idx} className="copilot-action-item-card p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] space-y-2">
                    <div className="copilot-action-item-header flex items-center justify-between"><div className="flex items-center gap-2">{item.icon}<span className="text-xs font-bold text-[var(--ink)]">{item.title}</span></div><span className="text-[10px] px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">{item.badge}</span></div>
                    <p className="text-xs text-[var(--muted)] m-0">{item.desc}</p>
                    <button type="button" onClick={item.fn} className="copilot-action-item-btn w-full h-11 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center gap-2 cursor-pointer"><span>{item.btn}</span></button>
                  </div>
                ))}
              </>
            ) : (
              <CopilotToolLogsView logs={toolExecutionLogs} onViewDiff={(log) => { const a = log.args || {}; setActiveDiff({ id: `diff-${log.id}`, title: `Дифф: ${log.toolName}`, targetEntity: String(a.targetEntity || a.path || a.target || log.toolName), beforeText: String(a.beforeText || a.target || "(Исходный фрагмент)"), afterText: String(a.afterText || a.replacement || log.resultSummary || "(Измененный фрагмент)"), applied: log.status === "success" }); }} />
            )}
        </div>)}
        {/* ВКЛАДКА 3: ПАМЯТЬ ИИ (LONG-TERM CLINICAL PREFERENCES) */}
        {activeTab === "memory" && <CopilotMemoryTab />}
        <CopilotSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} onOpenMemoryTab={() => { setSettingsOpen(false); setActiveTab("memory"); }} />
        <CopilotHistoryDrawer isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} onSelectThread={(tId) => {
          selectThread(tId); const saved = threadMessages[tId];
          if (saved && saved.length > 0) setMessages(saved);
          else { const f = threads.find((t) => t.id === tId); setMessages(f?.previewText ? [{ id: `thread-init-${Date.now()}`, role: "assistant", text: f.previewText, timestamp: f.updatedAt, citation: "Клинический протокол СтАР" }] : []); void hydrateSession(tId); }
          setHistoryOpen(false); setActiveTab("dialog"); }} />
      </aside>
    </div>
  );
};
export const ChairsideCopilotStudioModal = CopilotStudioModal; export default CopilotStudioModal;
