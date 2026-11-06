import { useEffect } from 'react';
import { useAppStore } from '../../../store/appStore';
import type { CopilotUiMessage, PendingConfirmation } from '../copilotTypes';
import type { SpecialtyCategoryKey } from '../../visit/clinicalCatalog/clinicalProtocolsCatalog';

export interface UseCopilotGlobalEventsOptions {
  openDrawer: () => void;
  closeDrawer: () => void;
  toggle: () => void;
  setActiveTab: (tab: 'chat' | 'pending') => void;
  openHud: () => void;
  closeHud: () => void;
  toggleHud: () => void;
  openVoiceModal: () => void;
  closeVoiceModal: () => void;
  openTreatmentPlanCopilot: () => void;
  closeTreatmentPlanCopilot: () => void;
  setCustomMessages: (msgs: CopilotUiMessage[]) => void;
  setCustomPending: (pend: PendingConfirmation | null) => void;
  setCustomContext?: (ctx: { patientName?: string | null; patientId?: string | null; activeTooth?: number | null } | null) => void;
  setCustomBusy?: (busy: boolean) => void;
  setCustomPhase?: (phase: string | null) => void;
  onOpenCatalog: (tooth?: number, category?: SpecialtyCategoryKey) => void;
}

export function useCopilotGlobalEvents(opts: UseCopilotGlobalEventsOptions): void {
  useEffect(() => {
    const checkAndTrigger = () => {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';
      const isCopilotRequested =
        params.get('copilot') === 'drawer' ||
        params.get('copilot') === '1' ||
        params.get('copilot') === 'studio' ||
        params.get('copilot') === 'open' ||
        params.get('ai') === '1' ||
        params.get('assistant') === '1' ||
        ['#copilot', '#copilot-drawer', '#copilot-studio', '#ai', '#assistant', '#chairside-copilot'].includes(hash);

      if (isCopilotRequested) opts.openDrawer();
      if (params.get('hud') === 'open' || hash.includes('chairside-hud')) opts.openHud();
      if (params.get('voice') === 'open' || hash.includes('voice-stenographer')) opts.openVoiceModal();
    };

    checkAndTrigger();

    (window as any).__denteCopilot = {
      open: opts.openDrawer,
      close: opts.closeDrawer,
      toggle: opts.toggle,
      openHud: opts.openHud,
      closeHud: opts.closeHud,
      toggleHud: opts.toggleHud,
      openVoiceModal: opts.openVoiceModal,
      closeVoiceModal: opts.closeVoiceModal,
      openTreatmentPlanCopilot: opts.openTreatmentPlanCopilot,
      closeTreatmentPlanCopilot: opts.closeTreatmentPlanCopilot,
      openAiSettings: () => {
        useAppStore.getState().setCurrentView('settings');
        useAppStore.getState().setSettingsTab('ai');
      },
      setContext: (ctx: { patientName?: string | null; patientId?: string | null; activeTooth?: number | null } | null) => opts.setCustomContext?.(ctx),
      setMessages: (msgs) => opts.setCustomMessages(msgs),
      setPending: (pend) => opts.setCustomPending(pend),
      setBusy: (b: boolean) => opts.setCustomBusy?.(b),
      setPhase: (p: string | null) => opts.setCustomPhase?.(p),
      setActiveTab: (tab) => opts.setActiveTab(tab),
    };

    const handleCustomToggle = () => opts.toggle();
    const handleToggleHud = () => opts.toggleHud();
    const handleOpenCatalog = (e: Event) => {
      const customEvent = e as CustomEvent<{ tooth?: number; query?: string; category?: SpecialtyCategoryKey }>;
      if (customEvent.detail) {
        opts.onOpenCatalog(customEvent.detail.tooth, customEvent.detail.category);
      } else {
        opts.onOpenCatalog();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        opts.toggleHud();
      }
    };

    const handleOpenCopilot = (e?: Event) => {
      const customEvent = e as CustomEvent<{
        messages?: CopilotUiMessage[];
        pending?: PendingConfirmation | null;
        activeTab?: 'chat' | 'pending';
        tooth?: number | null;
        activeTooth?: number | null;
        patientId?: string | null;
        patientName?: string | null;
      }>;
      if (customEvent?.detail) {
        if (customEvent.detail.messages) opts.setCustomMessages(customEvent.detail.messages);
        if (customEvent.detail.pending !== undefined) opts.setCustomPending(customEvent.detail.pending);
        if (customEvent.detail.activeTab) opts.setActiveTab(customEvent.detail.activeTab);
        const tooth = customEvent.detail.activeTooth ?? customEvent.detail.tooth;
        if (tooth !== undefined || customEvent.detail.patientId !== undefined || customEvent.detail.patientName !== undefined) {
          opts.setCustomContext?.({
            patientName: customEvent.detail.patientName,
            patientId: customEvent.detail.patientId,
            activeTooth: tooth,
          });
        }
      }
      opts.openDrawer();
    };

    window.addEventListener('hashchange', checkAndTrigger);
    window.addEventListener('popstate', checkAndTrigger);

    window.addEventListener('dente:toggle-copilot', handleCustomToggle);
    window.addEventListener('dente:open-copilot', handleOpenCopilot);
    window.addEventListener('dente-open-copilot', handleOpenCopilot);
    window.addEventListener('dente:close-copilot', opts.closeDrawer);
    window.addEventListener('dente-close-copilot', opts.closeDrawer);
    window.addEventListener('dente:open-agent-cockpit', handleOpenCopilot);
    window.addEventListener('dente:toggle-chairside-hud', handleToggleHud);
    window.addEventListener('dente:open-chairside-hud', opts.openHud);
    window.addEventListener('dente:close-chairside-hud', opts.closeHud);
    window.addEventListener('dente:open-voice-dictation', opts.openVoiceModal);
    window.addEventListener('dente:close-voice-dictation', opts.closeVoiceModal);
    window.addEventListener('dente:open-treatment-plan-copilot', opts.openTreatmentPlanCopilot);
    window.addEventListener('dente:close-treatment-plan-copilot', opts.closeTreatmentPlanCopilot);
    window.addEventListener('dente:open-protocols-catalog', handleOpenCatalog);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAndTrigger);
      window.removeEventListener('popstate', checkAndTrigger);
      window.removeEventListener('dente:toggle-copilot', handleCustomToggle);
      window.removeEventListener('dente:open-copilot', handleOpenCopilot);
      window.removeEventListener('dente-open-copilot', handleOpenCopilot);
      window.removeEventListener('dente:close-copilot', opts.closeDrawer);
      window.removeEventListener('dente-close-copilot', opts.closeDrawer);
      window.removeEventListener('dente:open-agent-cockpit', handleOpenCopilot);
      window.removeEventListener('dente:toggle-chairside-hud', handleToggleHud);
      window.removeEventListener('dente:open-chairside-hud', opts.openHud);
      window.removeEventListener('dente:close-chairside-hud', opts.closeHud);
      window.removeEventListener('dente:open-voice-dictation', opts.openVoiceModal);
      window.removeEventListener('dente:close-voice-dictation', opts.closeVoiceModal);
      window.removeEventListener('dente:open-treatment-plan-copilot', opts.openTreatmentPlanCopilot);
      window.removeEventListener('dente:close-treatment-plan-copilot', opts.closeTreatmentPlanCopilot);
      window.removeEventListener('dente:open-protocols-catalog', handleOpenCatalog);
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).__denteCopilot;
    };
  }, [opts]);
}
