import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, RotateCcw, Send, Mic, Sparkles, Check, AlertTriangle,
  Columns, User, Calendar, FileText, CheckCircle2, AlertCircle,
  HelpCircle, ShieldAlert
} from "lucide-react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { useCopilotContextSync } from "./CopilotContextSync";
import { useCopilotDrawerDebts } from "./drawer/useCopilotDrawerDebts";
import type { CopilotUiMessage, PendingConfirmation, ProactiveNudge } from "./copilotTypes";
import "./CopilotDrawer.css";

export type { ProactiveNudge };

export interface CopilotDrawerProps {
  isOpen: boolean;
  messages: CopilotUiMessage[];
  busy: boolean;
  phase: string | null;
  pending: PendingConfirmation | null;
  nameCache: Record<string, string>;
  nudges?: ProactiveNudge[];
  proactiveAlerts?: any[];
  whatsappHitLCards?: any[];
  activeTab: "chat" | "pending";
  onTabChange: (tab: "chat" | "pending") => void;
  onClose: () => void;
  onSend: (text: string) => void;
  onConfirm: (decision: "confirm" | "reject", reason?: string) => void;
  onReset: () => void;
  onDismissNudge?: (id: string) => void;
  onDismissProactiveAlert?: (id: string) => void;
  onApproveWhatsApp?: (id: string) => void;
  onRejectWhatsApp?: (id: string) => void;
  onSelectPatient?: (patientId: string) => void;
  onSelectAppointment?: (appointmentId: string) => void;
  onBookSlot?: (slot: any) => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  messages,
  busy,
  phase,
  pending,
  nameCache,
  nudges = [],
  proactiveAlerts = [],
  activeTab,
  onTabChange,
  onClose,
  onSend,
  onConfirm,
  onReset,
  onDismissNudge,
  onBookSlot,
}) => {
  const { context: uiContext, enrichMessage } = useCopilotContextSync();
  const [input, setInput] = useState(() => safeLocalStorageGetItem("dente_copilot_draft_text") || "");
  const [isDocked, setIsDocked] = useState(false);
  const [isMobile, setIsMobile] = useState(() => (
    typeof window !== "undefined" ? window.innerWidth <= 768 : false
  ));
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleInputChange = (val: string) => {
    setInput(val);
    if (val.trim()) safeLocalStorageSetItem("dente_copilot_draft_text", val);
    else safeLocalStorageRemoveItem("dente_copilot_draft_text");
  };

  const handleReset = () => {
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
  }, [isOpen, messages, activeTab]);

  // Operational shift debts from store via SSOT hook
  const storeDashboard = useAppStore((s) => s.dashboard);
  const { shiftDebtRecalls, shiftDebtEstimates } = useCopilotDrawerDebts(storeDashboard);
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
                  {isDocked ? 'Копайлот' : 'ДЕНТА — Клинический ассистент'}
                </h2>
                <p className="copilot-drawer-subtitle">
                  {busy ? (phase || "Анализирую клинический контекст...") : "Готов к работе • Голос и команды"}
                </p>
              </div>
            </div>
          </div>

          <div className="copilot-header-actions copilot-drawer-header-actions">
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

        {/* Context Telemetry Bar */}
        <div className="copilot-context-bar" data-testid="copilot-context-bar">
          <span className="copilot-context-chip active-view">
            <span>{uiContext.viewLabel || uiContext.view || "Одонтограмма"}</span>
          </span>
          {uiContext.activeTooth !== null && uiContext.activeTooth !== undefined && (
            <span className="copilot-context-chip">
              <span>{`Зуб #${uiContext.activeTooth}`}</span>
            </span>
          )}
          {uiContext.patientName && (
            <span className="copilot-context-chip">
              <User size={12} className="text-[var(--teal)] shrink-0" />
              <span>{uiContext.patientName}</span>
            </span>
          )}
          {uiContext.activeDoctor && (
            <span className="copilot-context-chip doctor">
              <span>{uiContext.activeDoctor}</span>
            </span>
          )}
          {uiContext.allergies && uiContext.allergies.length > 0 && (
            <span className="copilot-context-chip copilot-context-chip--warn" title={uiContext.allergies.join(", ")}>
              <ShieldAlert size={12} />
              <span>{`Аллергии (${uiContext.allergies.length})`}</span>
            </span>
          )}
        </div>

        {/* Tabs Bar */}
        <div className="copilot-tabs copilot-tabs-bar" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "chat"}
            onClick={() => onTabChange("chat")}
            className={`copilot-tab-btn ${activeTab === "chat" ? "copilot-tab-btn--active active" : ""}`}
          >
            Чат {messages.length > 0 && <span className="copilot-tab-badge copilot-badge-count">{messages.length}</span>}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "pending"}
            onClick={() => onTabChange("pending")}
            className={`copilot-tab-btn ${activeTab === "pending" ? "copilot-tab-btn--active active" : ""}`}
          >
            Задачи {totalTasksCount > 0 && <span className="copilot-tab-badge copilot-tab-badge--alert">{totalTasksCount}</span>}
          </button>
        </div>

        {/* Nudges Banner */}
        {nudges.length > 0 && (
          <div className="copilot-nudges-bar">
            {nudges.slice(0, 2).map((nudge) => (
              <div key={nudge.id} className="copilot-nudge-item">
                <AlertTriangle size={14} className="text-[var(--warn)] shrink-0" />
                <span className="copilot-nudge-text">{nudge.text}</span>
                {onDismissNudge && (
                  <button type="button" onClick={() => onDismissNudge(nudge.id)} className="copilot-nudge-close">
                    <X size={12} />
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
                <div className="copilot-feed-empty">
                  <Sparkles size={32} className="text-[var(--teal)] opacity-60 mb-2" />
                  <p className="text-sm font-medium text-[var(--ink)]">Ассистент готов к работе</p>
                  <p className="text-xs text-[var(--muted)] max-w-xs mt-1">
                    Спросите о расписании, надиктуйте дневник SOAP или попросите рассчитать план лечения.
                  </p>
                  {/* Quick Playbooks */}
                  <div className="copilot-quick-prompts mt-4">
                    <button type="button" onClick={() => handleSendPrompt("Заполни дневник приёма SOAP")} className="copilot-quick-prompt-btn">
                      Заполни дневник приёма SOAP
                    </button>
                    <button type="button" onClick={() => handleSendPrompt("Рассчитай 3 плана лечения")} className="copilot-quick-prompt-btn">
                      Рассчитай 3 плана лечения
                    </button>
                    <button type="button" onClick={() => handleSendPrompt("Проверь лекарственную безопасность")} className="copilot-quick-prompt-btn">
                      Проверь аллергии и совместимость
                    </button>
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.kind === "text" && msg.role === "user";
                const isAssistant = !isUser;
                const messageText = msg.kind === "text" || msg.kind === "thinking" ? msg.text : (msg as any).name || (msg as any).content || "";
                return (
                  <div key={idx} className={`copilot-msg-row ${isUser ? "copilot-msg-row--user user" : "copilot-msg-row--assistant assistant"}`}>
                    <div className={`copilot-msg-bubble ${isUser ? "copilot-msg-bubble--user user" : "copilot-msg-bubble--assistant assistant"}`}>
                      <div className="copilot-msg-header">
                        <span className="copilot-msg-author">{isUser ? "Врач" : "Ассистент ДЕНТА"}</span>
                      </div>
                      <div className="copilot-msg-text" style={{ whiteSpace: "pre-wrap" }}>
                        {messageText}
                      </div>

                      {/* Tool call indicator */}
                      {(msg as any).toolCalls && (msg as any).toolCalls.length > 0 && (
                        <div className="copilot-tool-execution-banner mt-2">
                          <CheckCircle2 size={13} className="text-[var(--teal)] shrink-0" />
                          <span className="text-xs">Выполнен инструмент: {((msg as any).toolCalls[0].name || "").replace("clinical.", "").replace("crm.", "")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Two-Phase Confirmation Guard */}
              {pending && (
                <div className="copilot-action-confirm-card" data-testid="copilot-action-confirm-card">
                  <div className="copilot-confirm-header">
                    <AlertCircle size={18} className="text-[var(--teal)] shrink-0" />
                    <div>
                      <h4 className="copilot-confirm-title">Подтверждение операции</h4>
                      <p className="copilot-confirm-sub">Действие: {pending.toolName}</p>
                    </div>
                  </div>
                  <div className="copilot-confirm-params">
                    <pre className="text-xs font-mono p-2 bg-[var(--paper-subtle)] rounded border border-[var(--line)] overflow-x-auto">
                      {JSON.stringify(pending.args, null, 2)}
                    </pre>
                  </div>
                  <div className="copilot-confirm-actions">
                    <button
                      type="button"
                      onClick={() => onConfirm("confirm")}
                      className="copilot-btn-primary"
                      data-testid="copilot-confirm-btn"
                    >
                      <Check size={14} />
                      Применить
                    </button>
                    <button
                      type="button"
                      onClick={() => onConfirm("reject", "Отклонено врачом")}
                      className="copilot-btn-cancel"
                      data-testid="copilot-reject-btn"
                    >
                      <X size={14} />
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Tasks Tab */
            <div className="copilot-tasks-tab-content" data-testid="copilot-tasks-tab-content">
              <div className="copilot-tasks-section">
                <h3 className="copilot-tasks-section-title">Задачи смены</h3>

                {/* Recalls */}
                <div className="copilot-task-card">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[var(--ink)]">Просроченные рекаллы</span>
                    <span className="text-xs font-bold text-[var(--teal)]">{shiftDebtRecalls.length}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Пациенты, ожидающие повторного приглашения на гигиену и контроль.</p>
                  {shiftDebtRecalls.length > 0 && onBookSlot && (
                    <button type="button" onClick={() => onBookSlot({})} className="copilot-task-action-btn mt-2">
                      Записаться на слот
                    </button>
                  )}
                </div>

                {/* Estimates */}
                <div className="copilot-task-card mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-[var(--ink)]">Ожидают ответа по смете</span>
                    <span className="text-xs font-bold text-[var(--warn)]">{shiftDebtEstimates.length}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">Сметы на лечении без подтверждения пациентом.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Composer Toolbar */}
        <form className="copilot-composer" onSubmit={handleSubmit}>
          <div className="copilot-composer-box">
            <textarea
              className="copilot-composer-input"
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Напишите команду или вопрос ассистенту... (Enter для отправки)"
              rows={2}
              data-testid="copilot-composer-input"
            />

            <div className="copilot-composer-actions">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("dente:open-voice-dictation"));
                }}
                className="copilot-icon-btn copilot-mic-btn"
                title="Голосовой стенограф приёма"
                aria-label="Голос"
                data-testid="copilot-composer-mic"
              >
                <Mic size={18} />
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
    </>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};

export default CopilotDrawer;
