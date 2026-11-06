import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, RotateCcw, Send, Mic, MicOff, AlertTriangle, Columns,
  Globe, Monitor, MessageSquare, Sliders, HardDrive
} from "lucide-react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { useCopilotStore } from "../../store/copilotStore";
import { useCopilotContextSync } from "./CopilotContextSync";
import { useCopilotDrawerDebts } from "./drawer/useCopilotDrawerDebts";
import { CopilotConfirmActionCard } from "./drawer/CopilotConfirmActionCard";
import { CopilotDrawerTasksTab } from "./drawer/CopilotDrawerTasksTab";
import { CopilotDrawerEmptyState } from "./drawer/CopilotDrawerEmptyState";
import { CopilotDictationBanner } from "./composer/CopilotDictationBanner";
import { CopilotMarkdown } from "./CopilotMarkdown";
import { CopilotMessage } from "./CopilotMessage";
import { CopilotSettingsModal } from "./CopilotSettingsModal";
import { CopilotHistoryDrawer } from "./CopilotHistoryDrawer";
import { CopilotThinkingIndicator } from "./CopilotThinkingIndicator";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import { CopilotContextTelemetryBar } from "./telemetry/CopilotContextTelemetryBar";
import type { CopilotDrawerTab } from "./drawer/drawerTypes";
import type { CopilotUiMessage, PendingConfirmation, ProactiveNudge } from "./copilotTypes";
import "./CopilotDrawer.css";

export type { ProactiveNudge };

export interface CopilotDrawerProps {
  isOpen: boolean; messages: CopilotUiMessage[]; busy: boolean; phase: string | null;
  pending: PendingConfirmation | null; nameCache: Record<string, string>; nudges?: ProactiveNudge[];
  proactiveAlerts?: any[]; whatsappHitLCards?: any[]; activeTab: CopilotDrawerTab;
  onTabChange: (tab: CopilotDrawerTab) => void; onClose: () => void; onSend: (text: string) => void;
  onConfirm: (decision: "confirm" | "reject", reason?: string) => void; onReset: () => void;
  onDismissNudge?: (id: string) => void; onDismissProactiveAlert?: (id: string) => void;
  onApproveWhatsApp?: (id: string) => void; onRejectWhatsApp?: (id: string) => void;
  onSelectPatient?: (patientId: string) => void; onSelectAppointment?: (appointmentId: string) => void;
  onBookSlot?: (slot: any) => void; isVoiceActive?: boolean; onToggleVoice?: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen, messages, busy, phase, pending, nameCache, nudges = [],
  proactiveAlerts = [], whatsappHitLCards = [], activeTab, onTabChange, onClose, onSend,
  onConfirm, onReset, onDismissNudge, onBookSlot, onSelectPatient, onSelectAppointment,
  onDismissProactiveAlert, onApproveWhatsApp, onRejectWhatsApp,
  isVoiceActive: isVoiceActiveProp, onToggleVoice,
}) => {
  const { context: uiContext, enrichMessage } = useCopilotContextSync();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const copilotSettings = useCopilotStore((s) => s.settings);
  const selectThread = useCopilotStore((s) => s.selectThread);
  const activeThreadId = useCopilotStore((s) => s.activeThreadId);
  const saveThreadMessages = useCopilotStore((s) => s.saveThreadMessages);
  const threadMessages = useCopilotStore((s) => s.threadMessages);

  useEffect(() => {
    if (activeThreadId && messages.length > 0) {
      saveThreadMessages(activeThreadId, messages);
    }
  }, [activeThreadId, messages, saveThreadMessages]);
  const [runtimeMode, setRuntimeMode] = useState<"web_browser" | "desktop_native">(() => {
    const saved = safeLocalStorageGetItem("dente_copilot_runtime_mode");
    return saved === "desktop_native" ? "desktop_native" : "web_browser";
  });
  const [input, setInput] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
  const [isDocked, setIsDocked] = useState(false);
  const baseTextRef = useRef<string>("");

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.trim()) safeLocalStorageSetItem("dente_copilot_draft_text", val);
    else safeLocalStorageRemoveItem("dente_copilot_draft_text");
  };

  const dictation = useUnifiedDictation({
    preferredMode: "gemini_live", context: "chat", specialty: "therapy",
    patientId: uiContext.patientId ?? undefined,
    onResult: (accumulated) => {
      const base = baseTextRef.current.trim();
      const spoken = accumulated.trim();
      handleInputChange(base ? (spoken ? `${base} ${spoken}` : base) : spoken);
    },
    onInterim: (interim) => {
      const base = baseTextRef.current.trim();
      const spoken = `${dictation.fullTranscript || ""} ${interim || ""}`.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      if (combined) setInput(combined);
    },
  });

  const isVoiceRecording = dictation.isRecording || Boolean(isVoiceActiveProp);

  const toggleVoice = async () => {
    if (onToggleVoice) { onToggleVoice(); return; }
    if (dictation.isRecording) {
      const finalRes = await dictation.stopDictation();
      const base = baseTextRef.current.trim();
      const spoken = finalRes.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      if (combined) handleInputChange(combined);
    } else {
      baseTextRef.current = input || "";
      dictation.clearTranscript();
      await dictation.startDictation("gemini_live");
    }
  };

  const [isMobile, setIsMobile] = useState(() => (typeof window !== "undefined" ? window.innerWidth <= 768 : false));
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) document.body.classList.add("copilot-open");
    else document.body.classList.remove("copilot-open");
    return () => document.body.classList.remove("copilot-open");
  }, [isOpen]);

  const handleReset = () => {
    if (dictation.isRecording) void dictation.stopDictation();
    setInput("");
    safeLocalStorageRemoveItem("dente_copilot_draft_text");
    onReset();
  };

  const handleSendPrompt = (text: string) => {
    if (!text.trim() || busy) return;
    onSend(enrichMessage(text.trim()));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (dictation.isRecording) void dictation.stopDictation();
    if (!input.trim() || busy) return;
    handleSendPrompt(input);
    setInput("");
    safeLocalStorageRemoveItem("dente_copilot_draft_text");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "chat" && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [isOpen, messages, pending, activeTab]);

  // Operational shift debts from store via SSOT hook
  const storeDashboard = useAppStore((s) => s.dashboard);
  const { shiftDebtRecalls, shiftDebtEstimates, totalEstimatesSumRub } = useCopilotDrawerDebts(storeDashboard);
  const totalTasksCount = (pending ? 1 : 0) + shiftDebtRecalls.length + shiftDebtEstimates.length;

  if (!isOpen) return null;

  const content = (
    <>
      <div
        className="copilot-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
        data-testid="copilot-drawer-backdrop"
      />
      <aside
        className={`copilot-drawer open ${isDocked ? "copilot-drawer--docked" : ""}`}
        aria-label="ДЕНТА — Клинический ассистент"
        data-testid="copilot-drawer"
      >
        {/* Apple HIG Drag Handle for mobile sheet */}
        <div className="copilot-drawer-drag-handle" aria-hidden="true" />

        {/* Drawer Header */}
        <header className="copilot-header copilot-drawer-header">
          <div className="copilot-header-brand copilot-drawer-header-left">
            <div className="copilot-status-indicator">
              <span className={`copilot-status-dot ${busy ? "copilot-status-dot--busy" : "copilot-status-dot--ready"}`} />
              <div>
                <h2 className="copilot-header-title copilot-drawer-title">
                  {isMobile ? 'ДЕНТА Копайлот' : (isDocked ? 'Копайлот' : 'ДЕНТА — Клинический ассистент')}
                </h2>
                <p className="copilot-drawer-subtitle">
                  {busy
                    ? (phase || "Анализирую клинический контекст...")
                    : isMobile
                    ? (runtimeMode === "desktop_native" ? "Рабочая станция ОС • Голос и снимки" : "Мобильный копайлот • Голос и приём")
                    : runtimeMode === "desktop_native"
                    ? "Рабочая станция ПК • Томографы, визиограф, снимки"
                    : "Клинический ассистент • Расписание, медкарта, касса"}
                </p>
              </div>
            </div>
          </div>

          <div className="copilot-header-actions copilot-drawer-header-actions">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("dente:open-voice-dictation"));
                }
              }}
              className="copilot-icon-btn"
              title="Открыть голосовой стенограф приёма"
              aria-label="Голосовой стенограф"
              data-testid="copilot-open-stenographer-btn"
            >
              <Mic size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen(true)}
              className="copilot-icon-btn"
              title="История диалогов и сессий"
              aria-label="История"
              data-testid="copilot-open-history-btn"
            >
              <MessageSquare size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="copilot-icon-btn"
              title="Настройки ИИ и Копайлота"
              aria-label="Настройки"
              data-testid="copilot-open-settings-btn"
            >
              <Sliders size={16} />
            </button>
            {!isMobile && (
              <button
                type="button"
                onClick={() => setIsDocked((prev) => !prev)}
                className="copilot-icon-btn copilot-split-view-btn"
                title="Split-View / Докинг панели"
                aria-label="Split-View"
              >
                <Columns size={16} />
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="copilot-icon-btn"
              title="Сбросить историю диалога"
              aria-label="Сброс"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="copilot-icon-btn"
              title="Закрыть панель (Esc)"
              aria-label="Закрыть"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Runtime Mode Switcher (Web CRM vs Desktop Native Workstation) */}
        <div className="copilot-mode-switcher-bar" data-testid="copilot-mode-switcher">
          <button
            type="button"
            className={`copilot-mode-btn ${runtimeMode === "web_browser" ? "active" : ""}`}
            onClick={() => { setRuntimeMode("web_browser"); safeLocalStorageSetItem("dente_copilot_runtime_mode", "web_browser"); }}
          >
            <Globe size={13} />
            <span>Веб-клиника</span>
          </button>
          <button
            type="button"
            className={`copilot-mode-btn ${runtimeMode === "desktop_native" ? "active" : ""}`}
            onClick={() => { setRuntimeMode("desktop_native"); safeLocalStorageSetItem("dente_copilot_runtime_mode", "desktop_native"); }}
          >
            <Monitor size={13} />
            <span>Рабочая станция (ПК)</span>
          </button>
        </div>

        {/* Canonical Antigravity Context Telemetry Bar (Zero-Duplicate Height Protection) */}
        <CopilotContextTelemetryBar
          activeView={uiContext.viewLabel || uiContext.view || "Одонтограмма"}
          patientName={uiContext.patientName}
          patientId={uiContext.patientId}
          activeTooth={typeof uiContext.activeTooth === "number" ? uiContext.activeTooth : (uiContext.activeTooth ? parseInt(String(uiContext.activeTooth), 10) || null : null)}
          activeDoctor={uiContext.activeDoctor}
          allergies={uiContext.allergies}
          compact
        />

        {/* Tabs Bar */}
        <div className="copilot-tabs copilot-tabs-bar" role="tablist">
          <button type="button" role="tab" aria-selected={activeTab === "chat"} onClick={() => onTabChange("chat")}
            className={`copilot-tab-btn ${activeTab === "chat" ? "copilot-tab-btn--active active" : ""}`}>
            Чат {messages.length > 0 && <span className="copilot-tab-badge copilot-badge-count">{messages.length}</span>}
          </button>
          <button type="button" role="tab" aria-selected={activeTab === "pending"} onClick={() => onTabChange("pending")}
            className={`copilot-tab-btn ${activeTab === "pending" ? "copilot-tab-btn--active active" : ""}`}>
            Задачи {totalTasksCount > 0 && <span className="copilot-tab-badge copilot-tab-badge--alert">{totalTasksCount}</span>}
          </button>
        </div>

        {/* Nudges Banner */}
        {nudges.length > 0 && (
          <div className="copilot-nudges-bar">
            {nudges.slice(0, 2).map((nudge) => (
              <div key={nudge.id} className={`copilot-nudge-item ${(nudge as any).priority === "high" ? "high" : ""}`}>
                <div className="copilot-nudge-icon">
                  <AlertTriangle size={15} />
                </div>
                <span className="copilot-nudge-text">{nudge.text}</span>
                {onDismissNudge && (
                  <button
                    type="button"
                    onClick={() => onDismissNudge(nudge.id)}
                    className="copilot-nudge-close"
                    title="Закрыть уведомление"
                    aria-label="Закрыть уведомление"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Main Feed Container */}
        <div className="copilot-feed" ref={feedRef}>
          {activeTab === "chat" ? (
            <div className="copilot-chat-feed">
              {messages.length === 0 && (
                <CopilotDrawerEmptyState
                  runtimeMode={runtimeMode}
                  onSendPrompt={handleSendPrompt}
                />
              )}

              {messages.map((msg, idx) => (
                <CopilotMessage
                  key={(msg as any).id || (msg as any).callId || idx}
                  message={msg}
                  nameCache={nameCache}
                  onConfirm={(callId, decision, modifiedArgs, reason) => onConfirm(decision, reason)}
                  onSelectPatient={onSelectPatient}
                  onSelectAppointment={onSelectAppointment}
                  onBookSlot={onBookSlot}
                />
              ))}

              {/* Two-Phase Confirmation Guard */}
              {pending && (
                <CopilotConfirmActionCard
                  pending={pending}
                  nameCache={nameCache}
                  onConfirm={onConfirm}
                />
              )}

              {/* CoT Extended Thinking Stream during model execution */}
              {busy && (
                <CopilotThinkingIndicator
                  isThinking={busy}
                  activeTooth={typeof uiContext.activeTooth === "number" ? uiContext.activeTooth : (uiContext.activeTooth ? parseInt(String(uiContext.activeTooth), 10) || undefined : undefined)}
                  thoughtProcess={phase || "Анализ клинической картины и формирование решения..."}
                  speedMode={copilotSettings.speedMode}
                  showThinkingProcess={copilotSettings.showThinkingProcess}
                />
              )}
            </div>
          ) : (
            <CopilotDrawerTasksTab
              totalEstimatesSumRub={totalEstimatesSumRub}
              shiftDebtRecalls={shiftDebtRecalls}
              shiftDebtEstimates={shiftDebtEstimates}
              pending={pending}
              nameCache={nameCache}
              whatsappHitLCards={whatsappHitLCards}
              proactiveAlerts={proactiveAlerts}
              onConfirm={(_callId, decision, _args, reason) => onConfirm(decision, reason)}
              onBookSlot={onBookSlot}
              onSendPrompt={handleSendPrompt}
              onDismissProactiveAlert={onDismissProactiveAlert || onDismissNudge}
              onApproveWhatsApp={onApproveWhatsApp}
              onRejectWhatsApp={onRejectWhatsApp}
            />
          )}
        </div>

        {/* Composer Toolbar */}
        <form className="copilot-composer" onSubmit={handleSubmit}>
          {isVoiceRecording && (
            <CopilotDictationBanner
              dictationMode={dictation.mode || "web_speech"}
              isSpeaking={dictation.isSpeaking}
              audioLevel={dictation.audioLevel || (dictation.isSpeaking ? 0.7 : 0.2)}
              onStopVoice={toggleVoice}
            />
          )}
          <div className="copilot-composer-box">
            <textarea
              className="copilot-composer-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? "Команда или вопрос ассистенту..." : "Напишите команду или вопрос ассистенту... (Enter для отправки)"}
              rows={isMobile ? 1 : 2}
              data-testid="copilot-composer-input"
            />

            <div className="copilot-composer-actions">
              <button
                type="button"
                onClick={toggleVoice}
                className={`copilot-icon-btn copilot-mic-btn ${isVoiceRecording ? "active recording" : ""}`}
                title={isVoiceRecording ? "Остановить надиктовку речи" : "Голосовая надиктовка ДЕНТА (Gemini Live)"}
                aria-label="Голос"
                data-testid="copilot-composer-mic"
              >
                {isVoiceRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <button
                type="submit"
                className="copilot-send-btn"
                aria-label="Отправить"
                data-testid="copilot-send-btn"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </form>
      </aside>
      <CopilotSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CopilotHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectThread={(tId) => {
          selectThread(tId);
          setIsHistoryOpen(false);
          const saved = threadMessages[tId];
          if (typeof window !== "undefined" && (window as any).__denteCopilot?.setMessages) {
            (window as any).__denteCopilot.setMessages(saved || []);
          }
        }}
      />
    </>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};

export default CopilotDrawer;
