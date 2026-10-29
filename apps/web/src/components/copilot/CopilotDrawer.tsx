import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X, RotateCcw, Send, Mic, MicOff, Sparkles, Check, AlertTriangle,
  Columns, User, Calendar, FileText, CheckCircle2, AlertCircle, ShieldAlert, Calculator,
  Globe, Monitor, Camera, FolderSearch, Receipt
} from "lucide-react";
import { safeLocalStorageGetItem, safeLocalStorageSetItem, safeLocalStorageRemoveItem } from "../../lib/safeLocalStorage";
import { useAppStore } from "../../store/appStore";
import { useCopilotContextSync } from "./CopilotContextSync";
import { useCopilotDrawerDebts } from "./drawer/useCopilotDrawerDebts";
import { CopilotConfirmParamsView } from "./drawer/CopilotConfirmParamsView";
import { CopilotDictationBanner } from "./composer/CopilotDictationBanner";
import { CopilotMarkdown } from "./CopilotMarkdown";
import { CopilotMessage } from "./CopilotMessage";
import { useUnifiedDictation } from "../../hooks/useUnifiedDictation";
import type { CopilotUiMessage, PendingConfirmation, ProactiveNudge } from "./copilotTypes";
import "./CopilotDrawer.css";

export type { ProactiveNudge };

const TOOL_TITLES_RU: Record<string, string> = {
  calculate_treatment_estimate: "Предварительный расчёт сметы лечения",
  apply_treatment_estimate: "Применение сметы плана лечения",
  draft_clinical_soap_diary: "Формирование дневника приёма (SOAP)",
  get_patient_clinical_card: "Медицинская карта приёма",
  save_clinical_diary: "Сохранение протокола приёма в медкарту",
  save_visit_diary: "Сохранение протокола приёма в медкарту",
  save_examination_protocol: "Сохранение протокола приёма в медкарту",
  save_protocol_043: "Сохранение протокола приёма в медкарту",
  create_prescription: "Оформление электронного рецепта",
  create_electronic_prescription: "Оформление электронного рецепта",
  create_prescription_107: "Оформление электронного рецепта",
  check_drug_interactions: "Проверка лекарственной совместимости",
  update_odontogram: "Обновление статуса зубной формулы",
  add_procedure_to_invoice: "Добавление услуги в счёт приёма",
  create_appointment: "Бронирование приёма в расписании",
};

function humanizeToolName(name?: string | null): string {
  if (!name) return "Клиническое действие";
  const cleaned = name.replace(/^(clinical|crm)\./, "");
  return TOOL_TITLES_RU[cleaned] || cleaned.replace(/_/g, " ");
}

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
  isVoiceActive?: boolean;
  onToggleVoice?: () => void;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen, messages, busy, phase, pending, nameCache, nudges = [],
  proactiveAlerts = [], activeTab, onTabChange, onClose, onSend,
  onConfirm, onReset, onDismissNudge, onBookSlot,
  onSelectPatient, onSelectAppointment,
  isVoiceActive: isVoiceActiveProp, onToggleVoice,
}) => {
  const { context: uiContext, enrichMessage } = useCopilotContextSync();
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
    preferredMode: "gemini_live",
    context: "chat",
    specialty: "therapy",
    patientId: uiContext.patientId ?? undefined,
    onResult: (accumulated) => {
      const base = baseTextRef.current.trim();
      const spoken = accumulated.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      handleInputChange(combined);
    },
    onInterim: (interim) => {
      const base = baseTextRef.current.trim();
      const spoken = `${dictation.fullTranscript || ""} ${interim || ""}`.trim();
      const combined = base ? (spoken ? `${base} ${spoken}` : base) : spoken;
      if (combined) {
        setInput(combined);
      }
    },
  });

  const isVoiceRecording = dictation.isRecording || Boolean(isVoiceActiveProp);

  const toggleVoice = async () => {
    if (onToggleVoice) {
      onToggleVoice();
      return;
    }
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

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isOpen) {
      document.body.classList.add("copilot-open");
    } else {
      document.body.classList.remove("copilot-open");
    }
    return () => {
      document.body.classList.remove("copilot-open");
    };
  }, [isOpen]);

  const handleReset = () => {
    if (dictation.isRecording) {
      void dictation.stopDictation();
    }
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
    if (dictation.isRecording) {
      void dictation.stopDictation();
    }
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
            onClick={() => {
              setRuntimeMode("web_browser");
              safeLocalStorageSetItem("dente_copilot_runtime_mode", "web_browser");
            }}
          >
            <Globe size={13} />
            <span>Веб-клиника</span>
          </button>
          <button
            type="button"
            className={`copilot-mode-btn ${runtimeMode === "desktop_native" ? "active" : ""}`}
            onClick={() => {
              setRuntimeMode("desktop_native");
              safeLocalStorageSetItem("dente_copilot_runtime_mode", "desktop_native");
            }}
          >
            <Monitor size={13} />
            <span>Рабочая станция (ПК)</span>
          </button>
        </div>

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
                <div className="copilot-feed-empty">
                  <Sparkles size={32} className="text-[var(--teal)] opacity-60 mb-2" />
                  <p className="text-sm font-medium text-[var(--ink)]">Ассистент готов к работе</p>
                  <p className="text-xs text-[var(--muted)] max-w-xs mt-1">
                    {runtimeMode === "desktop_native"
                      ? "Управление рабочей станцией ПК: снимки визиографа, томографы, касса по COM/USB."
                      : "Клинический ассистент: расписание, дневник SOAP, сметы и медкарта приёма."}
                  </p>
                  {/* Quick Playbooks */}
                  <div className="copilot-quick-prompts mt-4">
                    {runtimeMode === "desktop_native" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Захвати экран визиографа")}
                          className="copilot-quick-prompt-btn"
                        >
                          <Camera size={15} className="text-[var(--teal)] shrink-0 mr-2" />
                          <span>Захвати экран визиографа</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Найди снимки КЛКТ пациента")}
                          className="copilot-quick-prompt-btn"
                        >
                          <FolderSearch size={15} className="text-[var(--teal)] shrink-0 mr-2" />
                          <span>Найди снимки КЛКТ</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Проверь фискальный регистратор")}
                          className="copilot-quick-prompt-btn"
                        >
                          <Receipt size={15} className="text-[var(--teal)] shrink-0 mr-2" />
                          <span>Касса по COM/USB</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Заполни дневник приёма")}
                          className="copilot-quick-prompt-btn"
                        >
                          <FileText size={15} className="text-[var(--teal)] shrink-0 mr-2" />
                          <span>Заполни дневник приёма</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Рассчитай 3 плана лечения")}
                          className="copilot-quick-prompt-btn"
                        >
                          <Calculator size={15} className="text-[var(--teal)] shrink-0 mr-2" />
                          <span>Рассчитай 3 плана лечения</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSendPrompt("Проверь лекарственную безопасность")}
                          className="copilot-quick-prompt-btn"
                        >
                          <ShieldAlert size={15} className="text-[var(--warn,#f59e0b)] shrink-0 mr-2" />
                          <span>Проверь аллергии и совместимость</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => (
                <CopilotMessage
                  key={msg.id || idx}
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
                <div className="copilot-action-confirm-card" data-testid="copilot-action-confirm-card">
                  <div className="copilot-confirm-header">
                    <AlertCircle size={18} className="text-[var(--teal)] shrink-0" />
                    <div>
                      <h4 className="copilot-confirm-title">Подтверждение операции</h4>
                      <p className="copilot-confirm-sub">Действие: {humanizeToolName(pending.name || pending.toolName)}</p>
                    </div>
                  </div>
                  <CopilotConfirmParamsView
                    name={pending.name || pending.toolName || undefined}
                    args={pending.args || (pending as any).arguments || {}}
                    nameCache={nameCache}
                  />
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
                      className="copilot-btn-secondary copilot-btn-cancel"
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
                title={isVoiceRecording ? "Остановить надиктовку речи" : "Голосовая надиктовка ДЕНТА (Web Speech Live)"}
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
    </>
  );

  if (typeof document !== "undefined" && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};

export default CopilotDrawer;
