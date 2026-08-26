import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, RotateCcw, MessageSquare, CheckSquare, Loader2 } from 'lucide-react';
import type {
  CopilotUiMessage,
  PendingConfirmation,
  CopilotPhase,
  CopilotNudge,
  SelectIdHandler,
  BookSlotHandler,
} from './copilotTypes';
import { CopilotMessage } from './CopilotMessage';
import { CopilotConfirmCard } from './CopilotConfirmCard';
import { CopilotComposer } from './CopilotComposer';
import { CopilotNudges } from './CopilotNudges';
import { CopilotSuggestions } from './CopilotSuggestions';

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
  onConfirm: (callId: string, decision: 'confirm' | 'reject') => void;
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
  const [input, setInput] = useState('');
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && activeTab === 'chat' && feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [isOpen, messages, activeTab]);

  if (!isOpen) return null;

  const pendingCount = pending ? 1 : messages.filter((m) => m.kind === 'confirmation' && !m.resolved).length;

  const content = (
    <>
      <div className="copilot-backdrop open" onClick={onClose} />
      <aside className="copilot-drawer open" aria-label="DENTE Copilot Assistant">
        {/* Header */}
        <header className="copilot-header">
          <div className="copilot-header-brand">
            <div className="copilot-header-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="copilot-header-title">
                <span>DENTE Copilot</span>
                <span className="copilot-header-badge">AI Assistant</span>
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                {busy ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--teal)' }}>
                    <Loader2 size={11} className="animate-spin" />
                    {phase === 'working' ? 'Выполняет инструменты...' : 'Печатает ответ...'}
                  </span>
                ) : (
                  <span>Готов к работе</span>
                )}
              </div>
            </div>
          </div>

          <div className="copilot-header-actions">
            <button
              type="button"
              onClick={onReset}
              className="copilot-icon-btn"
              title="Начать новый диалог"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="copilot-icon-btn"
              title="Закрыть панель"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Tab Controls */}
        <div className="copilot-tabs">
          <button
            type="button"
            onClick={() => onTabChange('chat')}
            className={`copilot-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          >
            <MessageSquare size={15} />
            <span>Чат</span>
            {messages.length > 0 && (
              <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '9999px', background: 'var(--paper-soft)', border: '1px solid var(--line)' }}>
                {messages.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onTabChange('pending')}
            className={`copilot-tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
          >
            <CheckSquare size={15} />
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
          onAct={onSend}
        />

        {/* Body Content / Chat Feed */}
        <div className="copilot-feed" ref={feedRef}>
          {activeTab === 'chat' ? (
            <>
              {messages.length === 0 ? (
                <CopilotSuggestions onPick={onSend} />
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
          onChange={setInput}
          onSubmit={() => {
            if (!input.trim() || busy) return;
            onSend(input.trim());
            setInput('');
          }}
        />
      </aside>
    </>
  );

  if (typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
};
