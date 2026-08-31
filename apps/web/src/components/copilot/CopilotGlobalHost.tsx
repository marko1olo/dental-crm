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
