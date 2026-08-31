import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, RotateCcw, MessageSquare, CheckSquare, Loader2, Activity, User } from 'lucide-react';
import type {
  CopilotUiMessage,
  PendingConfirmation,
  CopilotPhase,
  CopilotNudge,
  SelectIdHandler,
  BookSlotHandler,
  ConfirmHandler,
} from './copilotTypes';
import { CopilotMessage } from './CopilotMessage';
import { CopilotConfirmCard } from './CopilotConfirmCard';
import { CopilotComposer } from './CopilotComposer';
import { CopilotNudges } from './CopilotNudges';
import { CopilotSuggestions } from './CopilotSuggestions';
import { useCopilotContextSync } from './CopilotContextSync';

export interface CopilotDrawerProps {
  isOpen: boolean;
  messages: CopilotUiMessage[];
  busy: boolean;
  phase: CopilotPhase;
  pending: PendingConfirmation | null;
  nameCache: Record<string, string>;
  nudges: CopilotNudge[];
  activeTab: 'chat' | 'pending';
  onTabChange: (tab: 'chat' | 'pending') => void;
  onClose: () => void;
  onSend: (text: string) => void;
  onConfirm: ConfirmHandler;
  onReset: () => void;
  onDismissNudge: (id: string) => void;
  onSelectPatient?: SelectIdHandler;
  onSelectAppointment?: SelectIdHandler;
  onBookSlot?: BookSlotHandler;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  isOpen,
  messages,
  busy,
  phase,
  pending,
  nameCache,
  nudges,
  activeTab,
  onTabChange,
  onClose,
  onSend,
  onConfirm,
  onReset,
  onDismissNudge,
  onSelectPatient,
  onSelectAppointment,
  onBookSlot,
}) => {
  const { context: uiContext, enrichMessage } = useCopilotContextSync();

  const [input, setInput] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        return localStorage.getItem('dente_copilot_draft_text') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const feedRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (newVal: string) => {
    setInput(newVal);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (newVal.trim()) {
          localStorage.setItem('dente_copilot_draft_text', newVal);
        } else {
          localStorage.removeItem('dente_copilot_draft_text');
        }
      }
    } catch {
      // ignore storage access errors
    }
  };

  const handleReset = () => {
    setInput('');
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('dente_copilot_draft_text');
      }
    } catch {
      // ignore storage access errors
    }
    onReset();
  };

  const handleSendEnriched = (textToSend: string) => {
    if (!textToSend.trim() || busy) return;
    const enriched = enrichMessage(textToSend);
    onSend(enriched);
  };

  const handleSubmit = () => {
    if (!input.trim() || busy) return;
    const text = input.trim();
    handleSendEnriched(text);
    setInput('');
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('dente_copilot_draft_text');
      }
    } catch {
      // ignore storage access errors
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat' && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [isOpen, messages, activeTab]);

  if (!isOpen) return null;

  const pendingCount = pending ? 1 : messages.filter((m) => m.kind === 'confirmation' && !m.resolved).length;

  const content = (
    <aside className="copilot-drawer open" aria-label="ДЕНТА — Клинический ассистент">
      {/* Header */}
      <header className="copilot-header">
        <div className="copilot-header-brand">
          <div className="copilot-header-icon">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="copilot-header-title">
              <span>ДЕНТА — Клинический ассистент</span>
              <span className="copilot-header-badge">ИИ-ассистент</span>
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
              {busy ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--teal)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  {phase === 'working' ? 'Выполняет инструменты...' : 'Печатает ответ...'}
                </span>
              ) : (
                <span>Готов к работе • Split-View</span>
              )}
            </div>
          </div>
        </div>

        <div className="copilot-header-actions">
          <button
            type="button"
            onClick={handleReset}
            className="copilot-icon-btn"
            title="Начать новый диалог"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="copilot-icon-btn"
            title="Свернуть панель"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {/* Context Awareness Telemetry Bar */}
      <div
        className="copilot-context-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          padding: '6px 16px',
          backgroundColor: 'var(--paper-soft, rgba(15, 118, 110, 0.04))',
          borderBottom: '1px solid var(--line, rgba(15, 118, 110, 0.12))',
          fontSize: '12px',
          color: 'var(--ink, #0f172a)',
        }}
        data-testid="copilot-context-bar"
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 600,
            color: 'var(--teal-dark, #0f766e)',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'var(--teal-soft, #ccfbf1)',
            border: '1px solid var(--teal-surface, rgba(13, 148, 136, 0.2))',
          }}
          title={`Активный экран: ${uiContext.viewLabel || uiContext.view}`}
        >
          <Activity size={12} />
          <span>{uiContext.viewLabel || uiContext.view}</span>
        </span>

        {uiContext.activeTooth !== null && uiContext.activeTooth !== undefined && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--paper-strong, #ffffff)',
              border: '1px solid var(--line, rgba(15, 118, 110, 0.15))',
            }}
            title={`Выбранный зуб FDI: ${uiContext.activeTooth}`}
          >
            <span>{`Зуб #${uiContext.activeTooth}`}</span>
          </span>
        )}

        {uiContext.patientId && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--paper-strong, #ffffff)',
              border: '1px solid var(--line, rgba(15, 118, 110, 0.15))',
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={uiContext.patientName ? `Пациент: ${uiContext.patientName}` : `Пациент ID: ${uiContext.patientId}`}
          >
            <User size={12} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {uiContext.patientName ?? `Пациент #${uiContext.patientId.slice(0, 6)}`}
            </span>
          </span>
        )}

        {uiContext.activeDoctor && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'var(--paper-strong, #ffffff)',
              border: '1px solid var(--line, rgba(15, 118, 110, 0.15))',
              color: 'var(--muted, #64748b)',
            }}
            title={`Лечащий врач: ${uiContext.activeDoctor}`}
          >
            <span>{uiContext.activeDoctor}</span>
          </span>
        )}
      </div>

      {/* Tab Controls */}
      <div className="copilot-tabs">
        <button
          type="button"
          onClick={() => onTabChange('chat')}
          className={`copilot-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
        >
          <MessageSquare size={16} />
          <span>Чат</span>
          {messages.length > 0 && (
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '1px 7px', borderRadius: '9999px', background: 'var(--paper-soft)', border: '1px solid var(--line)' }}>
              {messages.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => onTabChange('pending')}
          className={`copilot-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
        >
          <CheckSquare size={16} />
          <span>Задачи</span>
          {pendingCount > 0 && (
            <span className="copilot-badge-count">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {/* Proactive Nudges Bar */}
      <CopilotNudges
        nudges={nudges}
        onDismiss={onDismissNudge}
        onAct={handleSendEnriched}
      />

      {/* Body Content / Chat Feed */}
      <div className="copilot-feed" ref={feedRef}>
        {activeTab === 'chat' ? (
          <>
            {messages.length === 0 ? (
              <CopilotSuggestions onPick={handleSendEnriched} />
            ) : (
              messages.map((msg, idx) => (
                <CopilotMessage
                  key={idx}
                  message={msg}
                  nameCache={nameCache}
                  onConfirm={onConfirm}
                  onSelectPatient={onSelectPatient}
                  onSelectAppointment={onSelectAppointment}
                  onBookSlot={onBookSlot}
                />
              ))
            )}
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pending ? (
              <CopilotConfirmCard
                callId={pending.callId}
                name={pending.name}
                args={pending.args}
                nameCache={nameCache}
                onConfirm={onConfirm}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 16px', fontSize: '13px', color: 'var(--muted)' }}>
                Нет ожидающих подтверждений. Все клинические действия выполнены.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Composer Footer */}
      <CopilotComposer
        value={input}
        busy={busy}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onReset={handleReset}
        patientId={uiContext.patientId ?? null}
      />
    </aside>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};
