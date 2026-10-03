import React, { useEffect, useState, useCallback } from 'react';
import { useCopilot } from './useCopilot';
import { CopilotDrawer } from './CopilotDrawer';
import { ChairsideCopilotHUD } from './ChairsideCopilotHUD';
import { useCopilotContextSync } from './CopilotContextSync';
import type { CopilotUiMessage, PendingConfirmation } from './copilotTypes';

declare global {
  interface Window {
    __denteCopilot?: {
      open: () => void;
      close: () => void;
      toggle: () => void;
      openHud: () => void;
      closeHud: () => void;
      toggleHud: () => void;
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

  const { context: uiContext } = useCopilotContextSync();

  const [customMessages, setCustomMessages] = useState<CopilotUiMessage[] | null>(null);
  const [customPending, setCustomPending] = useState<PendingConfirmation | null>(null);
  const [isHudOpen, setIsHudOpen] = useState(false);

  const openHud = useCallback(() => setIsHudOpen(true), []);
  const closeHud = useCallback(() => setIsHudOpen(false), []);
  const toggleHud = useCallback(() => setIsHudOpen((prev) => !prev), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('copilot') === 'open' || window.location.hash.includes('copilot')) {
      openDrawer();
    }
    if (params.get('hud') === 'open' || window.location.hash.includes('chairside-hud')) {
      setIsHudOpen(true);
    }

    window.__denteCopilot = {
      open: openDrawer,
      close: closeDrawer,
      toggle: toggle,
      openHud,
      closeHud,
      toggleHud,
      setMessages: (msgs) => setCustomMessages(msgs),
      setPending: (pend) => setCustomPending(pend),
      setActiveTab: (tab) => setActiveTab(tab),
    };

    const handleCustomToggle = () => toggle();
    const handleToggleHud = () => setIsHudOpen((prev) => !prev);
    const handleOpenHud = () => setIsHudOpen(true);
    const handleCloseHud = () => setIsHudOpen(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") || (e.altKey && e.key.toLowerCase() === "c")) {
        e.preventDefault();
        setIsHudOpen((prev) => !prev);
      }
    };

    window.addEventListener('dente:toggle-copilot', handleCustomToggle);
    window.addEventListener('dente:toggle-chairside-hud', handleToggleHud);
    window.addEventListener('dente:open-chairside-hud', handleOpenHud);
    window.addEventListener('dente:close-chairside-hud', handleCloseHud);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('dente:toggle-copilot', handleCustomToggle);
      window.removeEventListener('dente:toggle-chairside-hud', handleToggleHud);
      window.removeEventListener('dente:open-chairside-hud', handleOpenHud);
      window.removeEventListener('dente:close-chairside-hud', handleCloseHud);
      window.removeEventListener('keydown', handleKeyDown);
      delete window.__denteCopilot;
    };
  }, [openDrawer, closeDrawer, toggle, setActiveTab, openHud, closeHud, toggleHud]);

  const effectiveMessages = customMessages !== null ? customMessages : messages;
  const effectivePending = customPending !== null ? customPending : pending;

  const numericActiveTooth = typeof uiContext.activeTooth === "number"
    ? uiContext.activeTooth
    : uiContext.activeTooth && !Number.isNaN(Number(uiContext.activeTooth))
      ? Number(uiContext.activeTooth)
      : null;

  return (
    <>
      {/* Copilot Drawer (Side Chat) */}
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

      {/* Chairside Copilot HUD (Hands-Free Autonomous Terminal at Chair) */}
      {isHudOpen && (
        <ChairsideCopilotHUD
          initialOpen={true}
          patientId={uiContext.patientId || undefined}
          patientName={uiContext.patientName || undefined}
          patientAllergies={uiContext.allergies}
          activeTooth={numericActiveTooth}
          onClose={closeHud}
        />
      )}
    </>
  );
};
