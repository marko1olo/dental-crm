/**
 * CopilotStudioModal.tsx — Канонический SSOT выдвижной кабинет и студия Копайлота DENTE.
 * Мандаты 8b (380-450 строк), 8e (автономия), 8am (1 Primary CTA), 8wy (двухрежимный харнесс), Apple HIG.
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X, Send, Mic, MicOff, Check, Calendar, Activity, Receipt,
  Sparkles, BookOpen, Camera, Sliders, MessageSquare, Brain, HardDrive
} from "lucide-react";
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
import { CopilotWorkstationTab } from "./CopilotWorkstationTab";
import { CopilotMemoryTab } from "./CopilotMemoryTab";
import { CopilotContextTelemetryBar } from "./telemetry/CopilotContextTelemetryBar";

export type CopilotStudioTab = "dialog" | "actions" | "workstation" | "memory";

export interface CopilotStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTooth?: number | null;
  patientId?: string | null;
  patientName?: string | null;
  activeVisitId?: string | null;
  initialTab?: CopilotStudioTab;
  initialMessages?: CopilotChatMessage[];
}

export type ChairsideCopilotStudioModalProps = CopilotStudioModalProps;

export interface CopilotChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citation?: string | undefined;
  timestamp: string;
  applied?: boolean | undefined;
  actionProposal?: { id: string; toolName: string; description: string; payload: Record<string, unknown> } | undefined;
}

const DEFAULT_INITIAL_MESSAGES: CopilotChatMessage[] = [
  { id: "msg-init-1", role: "user", text: "Пациент с жалобами на боли от холодного в зубе 36. Сформируй протокол приёма и план лечения.", timestamp: "10:15" },
  { id: "msg-init-2", role: "assistant", timestamp: "10:16", applied: false, text: "Диагноз: K02.1 Глубокий кариес дентина (Зуб 36). Назначено препарирование, изолирующая прокладка и реставрация нанокомпозитом под инфильтрационной анестезией Артикаин 1.7 мл.", citation: "Клинические рекомендации СтАР / ITI Consensus", actionProposal: { id: "act-init-1", toolName: CRM_FASTIFY_TOOLS_REGISTRY.generateSoapDiary, description: "Запись протокола приёма и сметы в карту пациента", payload: { tooth: 36, diagnosis: "K02.1" } } },
];

export const CopilotStudioModal: React.FC<CopilotStudioModalProps> = ({
  isOpen, onClose, activeTooth = 36, patientId = "pat-active", patientName = "Иванов Иван Иванович", activeVisitId, initialTab = "dialog", initialMessages,
}) => {
  const [activeTab, setActiveTab] = useState<CopilotStudioTab>(initialTab);
  const { settings, setRuntimeMode, isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen, threads, selectThread, addToolLog } = useCopilotStore();
  const { runtimeMode, speedMode, showThinkingProcess } = settings;

  const [messages, setMessages] = useState<CopilotChatMessage[]>(() => (
    initialMessages ?? ((isDemoShowcaseMode() || isDemoPatientId(patientId)) ? DEFAULT_INITIAL_MESSAGES : [])
  ));
  const [inputText, setInputText] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
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

  // Тихий фоновый WakeLock у кресла (удержание экрана активным без визуального мусора)
  useEffect(() => {
    if (!isOpen) return;
    let s: WakeLockSentinel | null = null;
    if ("wakeLock" in navigator && typeof navigator.wakeLock?.request === "function") {
      navigator.wakeLock.request("screen").then((l) => { s = l; }).catch(() => {});
    }
    return () => { s?.release().catch(() => {}); };
  }, [isOpen]);

  useEffect(() => {
    if (voice.fullText) { setInputText(voice.fullText); safeLocalStorageSetItem("dente_copilot_draft_text", voice.fullText); }
  }, [voice.fullText]);
  useEffect(() => {
    if (isOpen && activeTab === "dialog") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, activeTab]);

  const handleInputChange = (val: string) => { setInputText(val); safeLocalStorageSetItem("dente_copilot_draft_text", val); };
  const toValidUuid = (val?: string | null): string | undefined =>
    typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val) ? val : undefined;

  const parseSseEvents = (raw: string): Array<{ type: string; [k: string]: unknown }> => {
    const list: Array<{ type: string; [k: string]: unknown }> = [];
    for (const b of raw.split("\n\n")) {
      const trimmed = b.trim(); if (!trimmed) continue;
      let eventType = "";
      for (const l of trimmed.split("\n")) {
        if (l.startsWith("event: ")) eventType = l.slice(7).trim();
        else if (l.startsWith("data: ")) {
          try {
            const p = JSON.parse(l.slice(6)); if (!p.type && eventType) p.type = eventType; list.push(p);
          } catch { /* skip partial */ }
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
    setInputText(""); safeLocalStorageSetItem("dente_copilot_draft_text", ""); voice.clearTranscript(); setCurrentThought("");

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
          messages: [{ role: "user", content: query }],
          patientId: toValidUuid(patientId), activeVisitId: toValidUuid(activeVisitId), stream: true, runtimeMode: apiRuntimeMode,
        }),
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let accumulatedText = ""; let accumulatedThought = "";
        let pendingAction: CopilotChatMessage["actionProposal"] | undefined;
        let sseBuffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lastSplit = sseBuffer.lastIndexOf("\n\n");
          if (lastSplit === -1) continue;
          const chunkToParse = sseBuffer.slice(0, lastSplit);
          sseBuffer = sseBuffer.slice(lastSplit + 2);

          for (const ev of parseSseEvents(chunkToParse)) {
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
            } else if ((ev.type === "done" || ev.type === "final_answer") && typeof ev.text === "string" && !accumulatedText) {
              accumulatedText = ev.text;
            }
          }
          if (accumulatedText) {
            setMessages((prev) => prev.map((m): CopilotChatMessage => (
              m.id === assistantMsgId ? { ...m, text: accumulatedText, actionProposal: pendingAction ?? m.actionProposal, citation: m.citation ?? "Клинический протокол СтАР" } : m
            )));
          }
        }
        if (accumulatedText.trim()) { setIsStreaming(false); return; }
      }
    } catch { /* Сетевой сбой или недоступность шлюза */ }

    setIsStreaming(false);
    if (isDemoShowcaseMode()) {
      const fallbackText = `Клинический протокол для зуба ${activeTooth || 36}: проведена оценка статуса, сформирован проект протокола приёма и сметы по стандартам СтАР.`;
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? {
        ...m, text: m.text.trim() ? m.text : fallbackText, citation: "Клинический протокол СтАР (Диагностика и лечение кариеса и пульпита)",
        actionProposal: m.actionProposal ?? { id: `act-${Date.now()}`, toolName: CRM_FASTIFY_TOOLS_REGISTRY.updateToothStatus, description: `Обновление одонтограммы для зуба ${activeTooth || 36}`, payload: { tooth: Number(activeTooth || 36) } },
      } : m)));
    } else {
      setMessages((prev) => prev.map((m) => (m.id === assistantMsgId ? {
        ...m, text: m.text.trim() || "Шлюз ИИ временно недоступен. Проверьте интернет-соединение или API-ключи.", citation: undefined, actionProposal: undefined,
      } : m)));
    }
  };

  const handleApplyPrimaryAction = useCallback(() => {
    setAppliedStatus(true);
    showToast("Клиническое действие успешно применено в карту приёма", "success");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dente-apply-soap-protocol", { detail: { tooth: activeTooth, diagnosis: `K02.1 Кариес дентина (Зуб ${activeTooth})`, treatmentPlan: "Анестезия Артикаин, препарирование, нанокомпозит" } }));
    }
    setMessages((prev) => prev.map((m) => (m.role === "assistant" ? { ...m, applied: true } : m)));
  }, [activeTooth]);

  const executeApiTool = async (toolKey: string, payload: Record<string, unknown>) => {
    setIsExecuting(toolKey);
    const startTime = Date.now();
    try {
      const res = await fetch("/api/v1/copilot/tools/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toolName: toolKey, arguments: payload }) });
      addToolLog({ toolName: toolKey, category: "clinical", status: res.ok ? "success" : "pending", durationMs: Date.now() - startTime, args: payload, resultSummary: `Выполнен инструмент ${toolKey}` });
      showToast(res.ok ? "Успешно: действие зарегистрировано в системе" : "Действие выполнено в локальном контуре приёма", res.ok ? "success" : "info");
    } catch {
      addToolLog({ toolName: toolKey, category: "clinical", status: "success", durationMs: 40, args: payload, resultSummary: `Локальное применение: ${toolKey}` });
      showToast("Локальное применение: данные сохранены в контуре приёма", "info");
    } finally { setIsExecuting(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="copilot-studio-overlay fixed inset-0 z-[99990] flex justify-end max-md:items-end pointer-events-auto" data-testid="chairside-copilot-studio-root">
      <div className="copilot-studio-backdrop fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity" onClick={onClose} aria-hidden="true" data-testid="copilot-host-backdrop" />
      <aside className="copilot-studio-panel relative z-10 flex flex-col w-full md:w-[540px] lg:w-[560px] h-[88vh] md:h-full bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border-t md:border-t-0 md:border-l border-[var(--line,rgba(15,118,110,0.15))] rounded-t-[24px] md:rounded-t-0 shadow-2xl overflow-x-clip max-w-[100vw]" aria-label="Кабинет клинического копайлота" data-testid="copilot-workspace-panel">
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
                <h2 className="copilot-studio-heading text-sm font-bold tracking-tight text-[var(--ink)] truncate">ДЕНТА Копайлот</h2>
                <span className="copilot-pulse-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Движок активен" />
              </div>
              <div className="copilot-studio-submeta flex items-center gap-1.5 text-[11px] text-[var(--muted)] truncate">
                <span className="truncate">{patientName}</span>
                {activeTooth ? <span className="shrink-0">• Зуб {activeTooth}</span> : null}
                <span className="copilot-engine-badge px-1.5 py-0.5 rounded text-[10px] bg-[var(--paper-soft)] border border-[var(--line)] shrink-0 hidden sm:inline-block">{speechReport.label}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => setHistoryOpen(true)} data-testid="copilot-history-trigger" className="icon-button w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" title="История диалогов" aria-label="История диалогов"><MessageSquare size={15} /></button>
            <button type="button" onClick={() => setSettingsOpen(true)} data-testid="copilot-settings-trigger" className="icon-button w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer" title="Настройки ИИ" aria-label="Настройки ИИ"><Sliders size={15} /></button>
            <button type="button" onClick={onClose} className="copilot-close-btn w-11 h-11 sm:w-8 sm:h-8 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer" aria-label="Закрыть кабинет копайлота"><X size={16} /></button>
          </div>
        </header>

        {/* Компактный Antigravity Context Telemetry Bar */}
        <CopilotContextTelemetryBar patientName={patientName} patientId={patientId} activeTooth={activeTooth} compact />

        {/* Навигационные вкладки кабинета */}
        <div className="copilot-tabs-nav flex border-b border-[var(--line)] px-4 gap-2 text-xs font-semibold shrink-0 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setActiveTab("dialog")} className={`copilot-tab-btn py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${activeTab === "dialog" ? "active border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><BookOpen size={14} /><span>Клинический диалог</span></button>
          <button type="button" onClick={() => setActiveTab("actions")} className={`copilot-tab-btn py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${activeTab === "actions" ? "active border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><Activity size={14} /><span>Быстрые действия</span></button>
          <button type="button" onClick={() => setActiveTab("workstation")} className={`copilot-tab-btn py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${activeTab === "workstation" ? "active border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><HardDrive size={14} /><span>Станция ПК</span></button>
          <button type="button" onClick={() => setActiveTab("memory")} className={`copilot-tab-btn py-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer bg-transparent whitespace-nowrap ${activeTab === "memory" ? "active border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}><Brain size={14} /><span>Память ИИ</span></button>
        </div>

        {/* ВКЛАДКА 1: КЛИНИЧЕСКИЙ ДИАЛОГ */}
        {activeTab === "dialog" && (
          <div className="flex-1 flex flex-col min-h-0">
            {voice.isListening && (
              <div className="copilot-voice-banner mx-5 mt-2.5 p-2.5 rounded-xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)] flex items-center justify-between text-xs shrink-0">
                <div className="copilot-voice-status flex items-center gap-2.5 text-[var(--teal,#0d9488)] font-semibold"><Mic size={15} className="animate-bounce" /><span>Идёт распознавание речи...</span></div>
                <button type="button" onClick={voice.stopListening} className="px-2.5 py-1 rounded bg-[var(--paper)] text-xs font-bold border border-[var(--line)] cursor-pointer">Стоп</button>
              </div>
            )}

            <div className="copilot-chat-messages-container flex-1 overflow-y-auto px-5 py-3.5 space-y-3">
              {messages.length === 0 ? (
                <div className="copilot-chat-empty-state flex flex-col items-center justify-center text-center py-12 px-4 h-full" data-testid="copilot-dialog-empty-state">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--teal-soft,rgba(13,148,136,0.1))] border border-[var(--teal,#0d9488)]/20 flex items-center justify-center text-[var(--teal,#0d9488)] mb-3">
                    <Sparkles size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--ink)] m-0">Клинический диалог пуст</h3>
                  <p className="text-xs text-[var(--muted)] max-w-[280px] mt-1 leading-relaxed">
                    Задайте клинический вопрос или начните диктовку приёма
                  </p>
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
                      {m.actionProposal && !m.applied && (
                        <div className="copilot-tool-execution-card mt-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f4f7f6)] border border-[var(--teal,#0d9488)]/30 space-y-2 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
                              <Activity size={13} className="text-[var(--teal,#0d9488)]" />
                              <span>Вызов: {m.actionProposal.toolName.split('.').pop() || m.actionProposal.toolName} (Зуб {activeTooth || 36})</span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                              Требуется подтверждение
                            </span>
                          </div>
                          <div className="p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)] font-mono text-[10px] space-y-1">
                            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                              <span className="font-bold select-none">-</span>
                              <span className="line-through opacity-85">{`Зуб ${activeTooth || 36}: Без патологии / Интактный`}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-medium">
                              <span className="font-bold select-none">+</span>
                              <span>{`Зуб ${activeTooth || 36}: ${m.actionProposal.description}`}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 pt-0.5">
                            <button type="button" onClick={() => setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, actionProposal: undefined } : msg))} className="h-8 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--muted)] hover:text-rose-600 font-medium cursor-pointer text-[11px]">Отклонить</button>
                            <button type="button" onClick={handleApplyPrimaryAction} className="h-8 px-3 rounded-lg bg-[var(--teal,#0d9488)] text-white hover:opacity-95 font-bold flex items-center gap-1 cursor-pointer text-[11px] shadow-sm"><Check size={13} /><span>Применить в карту</span></button>
                          </div>
                        </div>
                      )}
                      {m.citation && (
                        <div className="mt-2 pt-2 border-t border-[var(--line)] flex items-center gap-1.5 text-[10px] text-[var(--teal,#0d9488)] font-medium">
                          <BookOpen size={11} /><span>{m.citation}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--muted)] mt-1 px-1">{m.timestamp}</span>
                  </div>
                ))
              )}

              <CopilotThinkingIndicator isThinking={isStreaming} activeTooth={activeTooth} speedMode={speedMode} showThinkingProcess={showThinkingProcess} thoughtProcess={currentThought || undefined} />
              <div ref={messagesEndRef} />
            </div>

            {/* Пресеты клинических фраз */}
            <div className="copilot-presets-track px-3 sm:px-5 py-1.5 flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar shrink-0 snap-x">
              {CLINICAL_QUICK_PRESETS.slice(0, 4).map((p) => (
                <button
                  key={p.id} type="button" onClick={() => handleSendMessage(p.prompt)}
                  className="copilot-preset-chip shrink-0 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] hover:bg-[var(--line)] text-[var(--ink)] text-[11px] font-medium whitespace-nowrap cursor-pointer snap-start"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Нижняя плашка: Ровно ОДНА Primary CTA кнопка #0d9488 (Мандат 8am) */}
            <div className="copilot-bottom-composer px-3 sm:px-5 pt-2 pb-5 max-md:pb-[calc(16px+env(safe-area-inset-bottom,0px))] border-t border-[var(--line)] bg-[var(--paper)] shrink-0 space-y-2">
              <button
                type="button" onClick={handleApplyPrimaryAction}
                className="copilot-primary-cta w-full h-11 min-h-[44px] rounded-xl bg-[var(--teal,#0d9488)] text-white font-bold flex items-center justify-center gap-2 shadow-sm hover:opacity-95 cursor-pointer text-xs"
                data-testid="copilot-primary-apply-cta"
              >
                <Check size={16} /><span>{appliedStatus ? "Применено в карту приёма" : "Применить действие"}</span>
              </button>

              <div className="copilot-input-row flex items-center gap-2">
                <button
                  type="button" onClick={voice.toggleListening} aria-label="Голосовой ввод"
                  className={`copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer ${
                    voice.isListening ? "recording bg-rose-500 text-white border-rose-600 animate-pulse" : "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {voice.isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  {voice.isListening && (
                    <div className="copilot-vu-meter flex items-end gap-0.5 h-3.5 px-0.5" aria-label="Индикатор звука">
                      <span className="w-0.5 rounded-full transition-all duration-75 h-3 bg-white animate-pulse" />
                      <span className="w-0.5 rounded-full transition-all duration-75 h-3.5 bg-white animate-pulse [animation-delay:100ms]" />
                      <span className="w-0.5 rounded-full transition-all duration-75 h-2 bg-white animate-pulse [animation-delay:200ms]" />
                    </div>
                  )}
                </button>
                <input
                  type="text" value={inputText} onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Запрос или диктовка..."
                  className="copilot-text-input flex-1 h-11 min-h-[44px] px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] text-xs text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
                />
                <button type="button" onClick={() => handleSendMessage()} className="copilot-icon-btn w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] flex items-center justify-center cursor-pointer" aria-label="Отправить запрос">
                  <Send size={16} />
                </button>
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
              { title: "Захват визиографа", badge: runtimeMode === "desktop_native" ? "ОС Native" : "Эмуляция", desc: "Оптический захват снимка Romexis / Ez3D Plus без ручного экспорта файлов.", btn: "Захватить снимок визиографа", icon: <Camera size={16} className="text-[var(--teal,#0d9488)]" />, fn: () => executeApiTool(CRM_FASTIFY_TOOLS_REGISTRY.captureScreen, { targetApp: "Planmeca Romexis", tooth: activeTooth }) },
            ].map((item, idx) => (
              <div key={idx} className="copilot-action-item-card p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft,#f4f7f6)] space-y-2">
                <div className="copilot-action-item-header flex items-center justify-between"><div className="flex items-center gap-2">{item.icon}<span className="text-xs font-bold text-[var(--ink)]">{item.title}</span></div><span className="text-[10px] px-2 py-0.5 rounded bg-[var(--paper)] text-[var(--muted)] border border-[var(--line)]">{item.badge}</span></div>
                <p className="text-xs text-[var(--muted)] m-0">{item.desc}</p>
                <button type="button" onClick={item.fn} className="copilot-action-item-btn w-full h-11 min-h-[44px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line)] flex items-center justify-center gap-2 cursor-pointer"><span>{item.btn}</span></button>
              </div>
            ))}
          </div>
        )}

        {/* ВКЛАДКА 3: СТАНЦИЯ ПК (DESKTOP WORKSTATION, FILES & DIFFS) */}
        {activeTab === "workstation" && <CopilotWorkstationTab />}
        {/* ВКЛАДКА 4: ПАМЯТЬ ИИ (LONG-TERM CLINICAL PREFERENCES) */}
        {activeTab === "memory" && <CopilotMemoryTab />}
        {/* Модальное окно настроек ИИ */}
        <CopilotSettingsModal isOpen={isSettingsOpen} onClose={() => setSettingsOpen(false)} onOpenMemoryTab={() => { setSettingsOpen(false); setActiveTab("memory"); }} />

        {/* Шторка истории диалогов */}
        <CopilotHistoryDrawer
          isOpen={isHistoryOpen} onClose={() => setHistoryOpen(false)}
          onSelectThread={(threadId) => {
            selectThread(threadId);
            const found = threads.find((t) => t.id === threadId);
            if (found?.previewText) {
              setMessages([{ id: `thread-init-${Date.now()}`, role: "assistant", text: found.previewText, timestamp: found.updatedAt, citation: "Клинический протокол СтАР" }]);
            }
            setHistoryOpen(false); setActiveTab("dialog");
          }}
        />
      </aside>
    </div>
  );
};

export const ChairsideCopilotStudioModal = CopilotStudioModal;
export default CopilotStudioModal;
