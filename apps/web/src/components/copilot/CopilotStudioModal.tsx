/**
 * CopilotStudioModal.tsx — Канонический SSOT выдвижной кабинет и студия Копайлота DENTE.
 * Мандаты 8b (380-450 строк), 8e (автономия), 8am (1 Primary CTA), 8wy (двухрежимный харнесс), Apple HIG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Mic, MicOff, Check, Calendar, Activity, Receipt, Sparkles, BookOpen, Sliders, MessageSquare, Brain } from "lucide-react";
import "./styles/copilotStudio.css";
import { useVoiceEngine } from "../voice/voiceEngine";
import { showToast } from "../GlobalToast";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { isDemoShowcaseMode, isDemoPatientId } from "../../lib/demoMode";
import { CLINICAL_QUICK_PRESETS, CRM_FASTIFY_TOOLS_REGISTRY, inspectSpeechEngineHealth, type SpeechEngineHealthReport } from "./copilotCatalogData";
import { useCopilotStore } from "../../store/copilotStore";
import { CopilotSettingsModal } from "./CopilotSettingsModal";
import { CopilotHistoryDrawer } from "./CopilotHistoryDrawer";
import { CopilotThinkingIndicator } from "./CopilotThinkingIndicator";
import { CopilotMemoryTab } from "./CopilotMemoryTab";
import { CopilotContextTelemetryBar } from "./telemetry/CopilotContextTelemetryBar";

export type CopilotStudioTab = "dialog" | "actions" | "memory";

export interface CopilotStudioModalProps {
  isOpen: boolean; onClose: () => void; activeTooth?: number | null | undefined;
  patientId?: string | null | undefined; patientName?: string | null | undefined; activeVisitId?: string | null | undefined;
  initialTab?: CopilotStudioTab | undefined; initialMessages?: CopilotChatMessage[] | undefined; isThinking?: boolean | undefined; thoughtProcess?: string | undefined;
}
export type ChairsideCopilotStudioModalProps = CopilotStudioModalProps;

export interface CopilotChatMessage {
  id: string; role: "user" | "assistant"; text: string; citation?: string | undefined; timestamp: string; applied?: boolean | undefined;
  actionProposal?: { id: string; toolName: string; description: string; payload: Record<string, unknown> } | undefined;
  suggestedReplies?: string[] | undefined;
}

const extractSuggestions = (text: string) => {
  const m = text.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
  let suggestions: string[] | undefined;
  if (m) { try { const list = JSON.parse(m[1]); if (Array.isArray(list)) suggestions = list.filter((s): s is string => typeof s === "string"); } catch { /* skip */ } }
  return { cleanText: text.replace(/<<<SUGGESTIONS:[\s\S]*?(?:>>>|$)/g, "").trim(), suggestions };
};

const DEFAULT_INITIAL_MESSAGES: CopilotChatMessage[] = [
  { id: "msg-init-1", role: "user", text: "Пациент с жалобами на боли от холодного в зубе 36. Сформируй протокол приёма и план лечения.", timestamp: "10:15" },
  { id: "msg-init-2", role: "assistant", timestamp: "10:16", applied: false, text: "Диагноз: K02.1 Глубокий кариес дентина (Зуб 36). Назначено препарирование, изолирующая прокладка и реставрация нанокомпозитом под инфильтрационной анестезией Артикаин 1.7 мл.", citation: "Клинические рекомендации СтАР / ITI Consensus", actionProposal: { id: "act-init-1", toolName: CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary, description: "Запись протокола приёма и сметы в карту пациента", payload: { tooth: 36, diagnosis: "K02.1" } }, suggestedReplies: ["Прокладка Ionosit", "Смета на зуб 36", "Контроль 7 дн"] },
];

const parseChatMsgs = (list?: any[]): CopilotChatMessage[] => (list || []).map((m, i) => {
  const raw = m.text || m.content || (m.kind === "tool" ? `Выполнен инструмент: ${m.name}` : "");
  const { cleanText, suggestions } = extractSuggestions(raw);
  return { id: m.id || m.callId || `msg-${i}`, role: m.role || (m.kind === "tool" ? "assistant" : "user"), text: cleanText, timestamp: m.timestamp || "10:00", applied: m.applied, citation: m.citation, actionProposal: m.actionProposal, suggestedReplies: m.suggestedReplies || suggestions };
});

export const CopilotStudioModal: React.FC<CopilotStudioModalProps> = ({
  isOpen, onClose, activeTooth, patientId, patientName, activeVisitId, initialTab = "dialog", initialMessages, isThinking, thoughtProcess,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotStudioTab>((initialTab as CopilotStudioTab) || "dialog");
  const { settings, memoryFacts, activeThreadId, threadMessages, saveThreadMessages, setRuntimeMode, isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen, threads, selectThread, addToolLog } = useCopilotStore();
  const { runtimeMode, speedMode, showThinkingProcess } = settings;
  const threadKey = activeThreadId || "default-thread";

  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => {
    if (initialMessages && initialMessages.length > 0) return parseChatMsgs(initialMessages);
    const saved = threadMessages[threadKey];
    return (saved && saved.length > 0) ? saved : ((isDemoShowcaseMode() || isDemoPatientId(patientId)) ? DEFAULT_INITIAL_MESSAGES : []);
  });
  useEffect(() => { if (initialMessages?.length) setMessages(parseChatMsgs(initialMessages)); }, [initialMessages]);
  useEffect(() => { if (initialTab) setActiveTab(initialTab as CopilotStudioTab); }, [initialTab]);
  useEffect(() => { if (messages.length > 0) saveThreadMessages(threadKey, messages); }, [messages, threadKey, saveThreadMessages]);
  const handleClose = useCallback(() => { if (messages.length > 0) saveThreadMessages(threadKey, messages); onClose(); }, [messages, threadKey, saveThreadMessages, onClose]);

  const [inputText, setInputText] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
  const baseDraftRef = useRef<string>(inputText);
  const [appliedStatus, setAppliedStatus] = useState<boolean>(false);
  const [speechReport, setSpeechReport] = useState<SpeechEngineHealthReport>(() => inspectSpeechEngineHealth());
  const [, setIsExecuting] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [currentThought, setCurrentThought] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voice = useVoiceEngine({ lang: "ru-RU", continuous: true });
  useEffect(() => { setSpeechReport(inspectSpeechEngineHealth()); }, []);

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
    let s: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator && typeof navigator.wakeLock?.request === "function") navigator.wakeLock.request("screen").then((l) => { s = l; }).catch(() => {});
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSettingsOpen && !isHistoryOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      s?.release().catch(() => {});
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isSettingsOpen, isHistoryOpen, handleClose]);

  useEffect(() => {
    baseDraftRef.current = inputText;
    if (!voice.isListening) voice.clearTranscript();
  }, [voice.isListening]);

  useEffect(() => {
    if (!voice.fullText) return;
    const base = (baseDraftRef.current || "").trim();
    const combined = base ? `${base} ${voice.fullText}` : voice.fullText;
    setInputText(combined); safeLocalStorageSetItem("dente_copilot_draft_text", combined);
  }, [voice.fullText]);

  useEffect(() => {
    if (isOpen && activeTab === "dialog") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, activeTab]);

  const handleInputChange = (val: string) => {
    setInputText(val); if (!voice.isListening) baseDraftRef.current = val;
    safeLocalStorageSetItem("dente_copilot_draft_text", val);
  };
  const toValidUuid = (val?: string | null): string | undefined =>
    typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val) ? val : undefined;

  const parseSseEvents = (raw: string): Array<{ type: string; [k: string]: unknown }> => {
    const list: Array<{ type: string; [k: string]: unknown }> = [];
    for (const b of raw.split(/\r?\n\r?\n/)) {
      const trimmed = b.trim(); if (!trimmed) continue;
      let eventType = "";
      for (const l of trimmed.split(/\r?\n/)) {
        if (l.startsWith("event: ")) eventType = l.slice(7).trim();
        else if (l.startsWith("data: ")) {
          try { const p = JSON.parse(l.slice(6).trim()); if (!p.type && eventType) p.type = eventType; list.push(p); } catch { /* skip */ }
        }
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
    setInputText(""); baseDraftRef.current = ""; safeLocalStorageSetItem("dente_copilot_draft_text", ""); voice.clearTranscript(); setCurrentThought("");

    const assistantMsgId = `msg-${Date.now() + 1}`;
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", text: "", timestamp: nowTime, applied: false }]);
    setIsStreaming(true);

    const token = readDenteClinicToken() || readDenteStaffToken() || "";
    const apiRuntimeMode = runtimeMode === "desktop_native" ? "desktop_native" : "web_browser";

    try {
      const res = await fetch("/api/agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          messages: [{ role: "user", content: query }], patientId: toValidUuid(patientId), activeVisitId: toValidUuid(activeVisitId),
          stream: true, runtimeMode: apiRuntimeMode, trustLevel: settings.trustLevel, granularPermissions: settings.granularPermissions,
          customInstructions: settings.customDoctorInstructions, memoryFacts: memoryFacts.map((m) => m.fact),
          doctorSpecialization: settings.clinicalSpecialization, speedMode: settings.speedMode, activeTooth: typeof activeTooth === "number" ? activeTooth : undefined,
          modelRoutingMode: settings.modelRoutingMode, byokProvider: settings.byokProvider, byokApiKey: settings.byokApiKey, byokModel: settings.byokModel,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = ""; let accumulatedThought = "";
        let pendingAction: CopilotChatMessage["actionProposal"] | undefined;
        let sseBuffer = "";
        const applySseEvents = (events: Array<{ type: string; [k: string]: unknown }>) => {
          for (const ev of events) {
            if (ev.type === "token" && typeof ev.text === "string") accumulatedText += ev.text;
            else if ((ev.type === "thought" || ev.type === "thinking" || ev.type === "reasoning") && typeof ev.text === "string") {
              accumulatedThought += ev.text; setCurrentThought(accumulatedThought);
            } else if (ev.type === "confirmation_required" || ev.type === "tool_call_started" || ev.type === "tool_start") {
              const callId = String(ev.callId || `act-${Date.now()}`);
              const toolName = String(ev.tool || ev.name || CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus);
              const args = (ev.args || ev.arguments) && typeof (ev.args || ev.arguments) === "object" ? ((ev.args || ev.arguments) as Record<string, unknown>) : {};
              const desc = typeof ev.descriptionRu === "string" ? ev.descriptionRu : `Подтверждение действия: ${toolName}`;
              pendingAction = { id: callId, toolName, description: desc, payload: args };
              addToolLog({ toolName, category: "clinical", status: "pending", args, resultSummary: desc });
            } else if ((ev.type === "done" || ev.type === "final_answer") && typeof ev.text === "string" && !accumulatedText) accumulatedText = ev.text;
          }
          if (accumulatedText) {
            const { cleanText, suggestions } = extractSuggestions(accumulatedText);
            setMessages((prev) => prev.map((m): CopilotChatMessage => (m.id === assistantMsgId ? { ...m, text: cleanText, actionProposal: pendingAction ?? m.actionProposal, citation: m.citation ?? "Клинический протокол СтАР", suggestedReplies: suggestions } : m)));
          }
        };

        while (true) {
          const { value, done } = await reader.read();
          if (done) { sseBuffer += decoder.decode(); if (sseBuffer.trim()) applySseEvents(parseSseEvents(sseBuffer)); break; }
          sseBuffer += decoder.decode(value, { stream: true });
          const matches = [...sseBuffer.matchAll(/\r?\n\r?\n/g)];
          if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            const splitPos = lastMatch.index ?? 0;
            const chunkToParse = sseBuffer.slice(0, splitPos);
            sseBuffer = sseBuffer.slice(splitPos + lastMatch[0].length);
            applySseEvents(parseSseEvents(chunkToParse));
          }
        }
        if (accumulatedText.trim()) { setIsStreaming(false); return; }
      }
    } catch { /* Сетевой сбой или недоступность шлюза */ }

    setIsStreaming(false);
    if (isDemoShowcaseMode()) {
      const fallbackText = `Клинический протокол для зуба ${activeTooth || 36}: проведена оценка статуса, сформирован проект протокола приёма и сметы по стандартам СтАР.`;
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text.trim() ? m.text : fallbackText, citation: "Клинический протокол СтАР (Диагностика и лечение кариеса и пульпита)", actionProposal: m.actionProposal ?? { id: `act-${Date.now()}`, toolName: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, description: `Обновление одонтограммы для зуба ${activeTooth || 36}`, payload: { tooth: Number(activeTooth || 36) } } } : m)));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? { ...m, text: m.text.trim() || "Шлюз ИИ временно недоступен. Проверьте интернет-соединение или API-ключи.", citation: undefined, actionProposal: undefined } : m)));
    }
  };

  const handleApplyPrimaryAction = useCallback((action?: CopilotChatMessage["actionProposal"]) => {
    setAppliedStatus(true);
    showToast("Клиническое действие успешно применено в карту приёма", "success");
    if (typeof window !== "undefined") {
      const act = action ?? [...messages].reverse().find((m) => m.role === "assistant" && m.actionProposal && !m.applied)?.actionProposal;
      const targetTooth = Number(act?.payload?.tooth ?? act?.payload?.toothNumber ?? activeTooth) || undefined;
      const targetDiag = (act?.payload?.diagnosis as string) || act?.description || (targetTooth ? `Клинический статус (Зуб ${targetTooth})` : "Клинический статус");
      const targetPlan = (act?.payload?.treatmentPlan as string) || (act?.payload?.plan as string) || (act?.description ? `План: ${act.description}` : "План лечения согласно протоколу СтАР");
      const targetState = (act?.payload?.state as string) || (act?.payload?.status as string) || undefined;
      const targetIcd = (act?.payload?.diagnosisIcd10 as string) || (act?.payload?.icd10 as string) || undefined;
      window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { tooth: targetTooth, toothNumber: targetTooth, state: targetState, diagnosis: targetDiag, diagnosisIcd10: targetIcd, treatmentPlan: targetPlan, finding: targetTooth ? { toothNumber: targetTooth, state: targetState || "caries", icd10Override: targetIcd } : undefined } }));
    }
    setMessages((prev) => prev.map((m) => (m.role === "assistant" ? { ...m, applied: true } : m)));
  }, [activeTooth, messages]);

  const executeApiTool = async (toolKey: string, payload: Record<string, unknown>) => {
    setIsExecuting(toolKey);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/v1/copilot/tools/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolName: toolKey, arguments: payload }) });
      addToolLog({ toolName: toolKey, category: "clinical", status: res.ok ? "success" : "pending", durationMs: Date.now() - startTime, args: payload, resultSummary: `Выполнен инструмент ${toolKey}` });
      showToast(res.ok ? "Успешно: действие зарегистрировано в системе" : (isDemoShowcaseMode() ? "Действие выполнено в демо-режиме" : `Сбой выполнения ${toolKey}`), res.ok ? "success" : (isDemoShowcaseMode() ? "info" : "error"));
    } catch {
      addToolLog({ toolName: toolKey, category: "clinical", status: isDemoShowcaseMode() ? "success" : "error", durationMs: isDemoShowcaseMode() ? 40 : 0, args: payload, resultSummary: isDemoShowcaseMode() ? `Локальное применение: ${toolKey}` : `Сбой сети для ${toolKey}` });
      showToast(isDemoShowcaseMode() ? "Локальное применение: данные сохранены в контуре приёма" : "Ошибка сети при вызове инструмента", isDemoShowcaseMode() ? "info" : "error");
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
        <header className="copilot-studio-header px-5 py-3 border-b border-[var(--line,rgba(15,118,110,0.15))] flex items-center justify-between gap-3 shrink-0">
          <div className="copilot-studio-brand flex items-center gap-2.5 min-w-0">
            <div className="copilot-studio-icon-badge w-8 h-8 rounded-lg bg-[var(--teal-soft,rgba(13,148,136,0.12))] border border-[var(--teal,rgba(13,148,136,0.3))] flex items-center justify-center text-[var(--teal,#0d9488)] shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="copilot-studio-title-box min-w-0">
              <div className="copilot-studio-title-row flex items-center gap-2">
                <h2 className="copilot-studio-heading text-sm font-bold tracking-tight text-[var(--ink)]">ДЕНТА Копайлот</h2>
                <span className="copilot-pulse-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Движок активен" />
              </div>
              <div className="copilot-studio-submeta flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span className="copilot-engine-badge px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] border border-[var(--line)] font-medium text-[var(--muted)]">{speechReport.label}</span>
                <span className="text-[10px] text-[var(--muted)] opacity-80 hidden sm:inline">Клинический ассистент</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setHistoryOpen(true)} data-testid="copilot-history-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" title="История диалогов" aria-label="История диалогов"><MessageSquare size={15} /></button>
            <button type="button" onClick={() => setSettingsOpen(true)} data-testid="copilot-settings-trigger" className="icon-button w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" title="Настройки ИИ" aria-label="Настройки ИИ"><Sliders size={15} /></button>
            <button type="button" onClick={handleClose} data-testid="copilot-studio-close-btn" className="copilot-close-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer" aria-label="Закрыть кабинет копайлота"><X size={16} /></button>
          </div>
        </header>

        {/* Компактный Antigravity Context Telemetry Bar */}
        <CopilotContextTelemetryBar patientName={patientName} patientId={patientId} activeTooth={activeTooth} compact />

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
              {messages.length === 0 ? (
                <div className="copilot-chat-empty-state flex flex-col items-center justify-center text-center py-6 px-4 h-full" data-testid="copilot-dialog-empty-state">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)]/20 flex items-center justify-center text-[var(--teal,#0d9488)] mb-2">
                    <Sparkles size={20} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинический диалог пуст</h3>
                  <p className="text-xs text-[var(--muted)] max-w-[320px] mt-1 mb-3 leading-relaxed">Задайте клинический вопрос или начните диктовку приёма:</p>
                  <div className="grid grid-cols-2 gap-2 w-full max-w-[420px]" data-testid="copilot-empty-starters">
                    {[
                      { id: "st-norm", label: `Норма (Зуб ${activeTooth || 36})`, prompt: `Зафиксируй зуб ${activeTooth || 36}: норма, интактный, без патологии` },
                      { id: "st-caries", label: `Кариес ${activeTooth || 36}`, prompt: `Зафиксируй кариес дентина зуба ${activeTooth || 36}, препарирование полости и нанокомпозит` },
                      { id: "st-anes", label: `Артикаин 1.7 мл (${activeTooth || 36})`, prompt: `Инфильтрационная анестезия: Артикаин 1:100 000, 1.7 мл (Зуб ${activeTooth || 36})` },
                      { id: "st-est", label: `Смета на зуб ${activeTooth || 36}`, prompt: `Сформируй смету на комплексное лечение зуба ${activeTooth || 36}` },
                    ].map((s) => (
                      <button key={s.id} type="button" onClick={() => handleSendMessage(s.prompt)} className="p-2.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-left text-xs font-semibold text-[var(--ink)] cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs">
                        <Sparkles size={12} className="text-[var(--teal,#0d9488)] shrink-0" /><span className="whitespace-normal leading-tight">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => (
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
                        return (
                          <div className="copilot-tool-execution-card mt-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--teal,#0d9488)]/30 space-y-2 text-[11px]">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]"><Activity size={13} className="text-[var(--teal,#0d9488)]" /><span>Вызов: {m.actionProposal.toolName.split('.').pop() || m.actionProposal.toolName} (Зуб {proposalTooth})</span></div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Требуется подтверждение</span>
                            </div>
                            <div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] font-mono text-[10px] space-y-1">
                              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded"><span className="font-bold select-none">-</span><span className="line-through opacity-85">{`Зуб ${proposalTooth}: Без патологии / Интактный`}</span></div>
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium"><span className="font-bold select-none">+</span><span>{`Зуб ${proposalTooth}: ${m.actionProposal.description}`}</span></div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button type="button" onClick={() => setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, actionProposal: undefined } : msg))} className="h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-rose-600 font-semibold cursor-pointer text-xs flex items-center justify-center">Отклонить</button>
                              <button type="button" onClick={() => handleApplyPrimaryAction(m.actionProposal)} className="h-11 min-h-[44px] min-w-[44px] px-3.5 rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--teal-soft,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)] hover:text-white font-bold flex items-center justify-center gap-1.5 cursor-pointer text-xs transition-colors"><Check size={14} /><span>Применить в карту</span></button>
                            </div>
                          </div>
                        );
                      })()}
                      {m.citation && (<div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-1.5 text-[10px] text-[var(--teal,#0d9488)] font-medium"><BookOpen size={11} /><span>{m.citation}</span></div>)}
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1 px-1">{m.timestamp}</span>
                  </div>
                ))
              )}

              <CopilotThinkingIndicator isThinking={isStreaming || Boolean(isThinking)} activeTooth={activeTooth} speedMode={speedMode} showThinkingProcess={showThinkingProcess} thoughtProcess={thoughtProcess || currentThought || undefined} />
              <div ref={messagesEndRef} />
            </div>

            {/* Variant 2: Умные контекстные подсказки нейросети (Smart Replies) */}
            {(() => {
              const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
              const replies = lastAssistant?.suggestedReplies;
              if (!replies || replies.length === 0 || isStreaming) return null;
              return (
                <div className="copilot-smart-replies-track px-3 sm:px-5 py-1.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 snap-x" data-testid="copilot-smart-replies">
                  <span className="text-[10px] text-[var(--muted)] font-bold uppercase tracking-wider shrink-0 flex items-center gap-1"><Sparkles size={11} className="text-[var(--teal,#0d9488)]" />Подсказка:</span>
                  {replies.map((reply, i) => (
                    <button key={i} type="button" onClick={() => handleSendMessage(reply)} className="copilot-smart-reply-chip shrink-0 px-3.5 py-2 min-h-[40px] sm:min-h-[44px] rounded-full border border-[var(--teal,#0d9488)]/30 bg-[var(--teal-soft,rgba(13,148,136,0.08))] hover:bg-[var(--teal-soft,rgba(13,148,136,0.18))] text-[var(--teal,#0d9488)] text-xs font-semibold whitespace-nowrap cursor-pointer transition-all shadow-2xs snap-start flex items-center">{reply}</button>
                  ))}
                </div>
              );
            })()}

            {/* Нижняя плашка: Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am) */}
            <div className="copilot-bottom-composer px-3 sm:px-5 pt-2 pb-5 max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-2">
              <button
                type="button" onClick={() => handleApplyPrimaryAction()}
                className="copilot-primary-cta w-full h-11 min-h-[44px] rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer text-xs"
                data-testid="copilot-primary-apply-cta"
              >
                <Check size={16} /><span>{appliedStatus ? "Применено в карту приёма" : "Применить действие"}</span>
              </button>
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

        {/* ВКЛАДКА 2: БЫСТРЫЕ ДЕЙСТВИЯ (FASTIFY API) */}
        {activeTab === "actions" && (
          <div className="copilot-actions-grid flex-1 overflow-y-auto p-5 space-y-3.5">
            <p className="text-xs text-[var(--muted)] leading-normal m-0">Клинические инструменты прямого исполнения без блокировок врача:</p>
            {[
              { title: "Бронирование слота", badge: "Расписание", desc: "Резерв следующего этапа терапии через 7 дней без обязательных начмедов.", btn: "Забронировать окно приёма", icon: <Calendar size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createAppointmentSlot, { patientId, tooth: activeTooth, service: "Терапия" }) },
              { title: "Зубная формула FDI", badge: "Одонтограмма", desc: `Фиксация кариеса дентина и пломбирования зуба ${activeTooth || 36}.`, btn: `Обновить статус зуба ${activeTooth || 36}`, icon: <Activity size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, { tooth: activeTooth || 36, state: "C", diagnosis: "K02.1" }) },
              { title: "Выставление счёта", badge: "Касса и чеки", desc: "Пречек на препарирование и нанокомпозитную реставрацию: 6 500 руб.", btn: "Сформировать счёт (6 500 руб.)", icon: <Receipt size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.createInvoiceDraft, { patientId, amountKopecks: 650000, serviceTitle: "Лечение кариеса" }) },
              { title: "Протокол SOAP в карту", badge: "Медкарта", desc: "Синтез дневника по стандарту SOAP с жалобами, осмотром и лечением.", btn: "Сформировать протокол SOAP", icon: <BookOpen size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary, { patientId, tooth: activeTooth, diagnosis: "K02.1" }) },
            ].map((item, idx) => (
              <div key={idx} className="copilot-action-item-card p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] space-y-2">
                <div className="copilot-action-item-header flex items-center justify-between"><div className="flex items-center gap-2">{item.icon}<span className="text-xs font-bold text-[var(--ink)]">{item.title}</span></div><span className="text-[10px] px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">{item.badge}</span></div>
                <p className="text-xs text-[var(--muted)] m-0">{item.desc}</p>
                <button type="button" onClick={item.fn} className="copilot-action-item-btn w-full h-11 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center gap-2 cursor-pointer"><span>{item.btn}</span></button>
              </div>
            ))}
          </div>
        )}

        {/* ВКЛАДКА 3: ПАМЯТЬ ИИ (LONG-TERM CLINICAL PREFERENCES) */}
        {activeTab === "memory" && <CopilotMemoryTab />}
        <CopilotSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} onOpenMemoryTab={() => { setSettingsOpen(false); setActiveTab("memory"); }} />
        <CopilotHistoryDrawer isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)} onSelectThread={(tId) => {
          selectThread(tId); const saved = threadMessages[tId];
          if (saved && saved.length > 0) setMessages(saved);
          else { const f = threads.find((t) => t.id === tId); setMessages(f?.previewText ? [{ id: `thread-init-${Date.now()}`, role: "assistant", text: f.previewText, timestamp: f.updatedAt, citation: "Клинический протокол СтАР" }] : []); }
          setHistoryOpen(false); setActiveTab("dialog");
        }} />
      </aside>
    </div>
  );
};

export const ChairsideCopilotStudioModal = CopilotStudioModal;
export default CopilotStudioModal;
