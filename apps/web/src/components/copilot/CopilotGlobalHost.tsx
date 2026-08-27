import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useCopilot } from './useCopilot';
import { CopilotDrawer } from './CopilotDrawer';
import type { CopilotUiMessage, PendingConfirmation } from './copilotTypes';

declare global {
  interface Window {
    __denteCopilot?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      setMessages: (messages: CopilotUiMessage[]) => void;
      setPending: (pending: PendingConfirmation | null) => void;
      setActiveTab: (tab: 'chat' | 'pending') => void;
    };
  }
}

export const CopilotGlobalHost: React.FC = () => {
  const {
    isOpen,
    messages,
    busy,
    phase,
    pending,
    nameCache,
    nudges,
    activeTab,
    openDrawer,
    closeDrawer,
    toggle,
    setActiveTab,
    send,
    confirm,
    reset,
    dismissNudge,
  } = useCopilot();

  const [customMessages, setCustomMessages] = useState<CopilotUiMessage[] | null>(null);
  const [customPending, setCustomPending] = useState<PendingConfirmation | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('copilot') === 'open' || window.location.hash.includes('copilot')) {
      openDrawer();
    }

    window.__denteCopilot = {
      open: openDrawer,
      close: closeDrawer,
      toggle: toggle,
      setMessages: (msgs) => setCustomMessages(msgs),
      setPending: (pend) => setCustomPending(pend),
      setActiveTab: (tab) => setActiveTab(tab),
    };

    const handleCustomToggle = () => toggle();
    window.addEventListener('dente:toggle-copilot', handleCustomToggle);

    return () => {
      window.removeEventListener('dente:toggle-copilot', handleCustomToggle);
      delete window.__denteCopilot;
    };
  }, [openDrawer, closeDrawer, toggle, setActiveTab]);

  const effectiveMessages = customMessages !== null ? customMessages : messages;
  const effectivePending = customPending !== null ? customPending : pending;

  return (
    <>
      {/* Floating Trigger Button (Desktop only; on mobile Copilot is accessible via topbar/toolbar to avoid card occlusion) */}
      {!isOpen && (
        <button
          id="dente-copilot-trigger-btn"
          type="button"
          onClick={openDrawer}
          className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--teal,#0284c7)] hover:bg-[var(--teal-strong,#0369a1)] text-white shadow-lg hover:shadow-xl transition-all font-medium text-sm border border-white/20 active:scale-95"
          title="Открыть DENTE Copilot"
        >
          <Sparkles size={18} className="animate-pulse" />
          <span>Copilot</span>
        </button>
      )}

      {/* Copilot Drawer */}
      <CopilotDrawer
        isOpen={isOpen}
        messages={effectiveMessages}
        busy={busy}
        phase={phase}
        pending={effectivePending}
        nameCache={nameCache}
        nudges={nudges}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={closeDrawer}
        onSend={send}
        onConfirm={confirm}
        onReset={reset}
        onDismissNudge={dismissNudge}
      />
    </>
  );
};
