import { useEffect, useRef } from 'react';
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
  const optsRef = useRef(opts);
  optsRef.current = opts;

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

      if (isCopilotRequested) optsRef.current.openDrawer();
      if (params.get('hud') === 'open' || hash.includes('chairside-hud')) optsRef.current.openHud();
      if (params.get('voice') === 'open' || hash.includes('voice-stenographer')) optsRef.current.openVoiceModal();
    };

    checkAndTrigger();

    (window as any).__denteCopilot = {
      open: () => optsRef.current.openDrawer(),
      close: () => optsRef.current.closeDrawer(),
      toggle: () => optsRef.current.toggle(),
      openHud: () => optsRef.current.openHud(),
      closeHud: () => optsRef.current.closeHud(),
      toggleHud: () => optsRef.current.toggleHud(),
      openVoiceModal: () => optsRef.current.openVoiceModal(),
      closeVoiceModal: () => optsRef.current.closeVoiceModal(),
      openTreatmentPlanCopilot: () => optsRef.current.openTreatmentPlanCopilot(),
      closeTreatmentPlanCopilot: () => optsRef.current.closeTreatmentPlanCopilot(),
      openAiSettings: () => {
        useAppStore.getState().setCurrentView('settings');
        useAppStore.getState().setSettingsTab('ai');
      },
      setContext: (ctx: { patientName?: string | null; patientId?: string | null; activeTooth?: number | null } | null) => optsRef.current.setCustomContext?.(ctx),
      setMessages: (msgs: CopilotUiMessage[]) => optsRef.current.setCustomMessages(msgs),
      setPending: (pend: PendingConfirmation | null) => optsRef.current.setCustomPending(pend),
      setBusy: (b: boolean) => optsRef.current.setCustomBusy?.(b),
      setPhase: (p: string | null) => optsRef.current.setCustomPhase?.(p),
      setActiveTab: (tab: 'chat' | 'pending') => optsRef.current.setActiveTab(tab),
    };

    const handleCustomToggle = () => optsRef.current.toggle();
    const handleToggleHud = () => optsRef.current.toggleHud();
    const handleOpenCatalog = (e: Event) => {
      const customEvent = e as CustomEvent<{ tooth?: number; query?: string; category?: SpecialtyCategoryKey }>;
      if (customEvent.detail) {
        optsRef.current.onOpenCatalog(customEvent.detail.tooth, customEvent.detail.category);
      } else {
        optsRef.current.onOpenCatalog();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c') || (e.altKey && e.key.toLowerCase() === 'c')) {
        e.preventDefault();
        optsRef.current.toggleHud();
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
        if (customEvent.detail.messages) optsRef.current.setCustomMessages(customEvent.detail.messages);
        if (customEvent.detail.pending !== undefined) optsRef.current.setCustomPending(customEvent.detail.pending);
        if (customEvent.detail.activeTab) optsRef.current.setActiveTab(customEvent.detail.activeTab);
        const tooth = customEvent.detail.activeTooth ?? customEvent.detail.tooth;
        if (tooth !== undefined || customEvent.detail.patientId !== undefined || customEvent.detail.patientName !== undefined) {
          optsRef.current.setCustomContext?.({
            ...(customEvent.detail.patientName !== undefined ? { patientName: customEvent.detail.patientName } : {}),
            ...(customEvent.detail.patientId !== undefined ? { patientId: customEvent.detail.patientId } : {}),
            ...(tooth !== undefined ? { activeTooth: tooth } : {}),
          });
        }
      }
      optsRef.current.openDrawer();
    };

    const handleCloseDrawer = () => optsRef.current.closeDrawer();
    const handleOpenHud = () => optsRef.current.openHud();
    const handleCloseHud = () => optsRef.current.closeHud();
    const handleOpenVoiceModal = () => optsRef.current.openVoiceModal();
    const handleCloseVoiceModal = () => optsRef.current.closeVoiceModal();
    const handleOpenTreatmentPlan = () => optsRef.current.openTreatmentPlanCopilot();
    const handleCloseTreatmentPlan = () => optsRef.current.closeTreatmentPlanCopilot();

    window.addEventListener('hashchange', checkAndTrigger);
    window.addEventListener('popstate', checkAndTrigger);

    window.addEventListener('dente:toggle-copilot', handleCustomToggle);
    window.addEventListener('dente:open-copilot', handleOpenCopilot);
    window.addEventListener('dente-open-copilot', handleOpenCopilot);
    window.addEventListener('dente:close-copilot', handleCloseDrawer);
    window.addEventListener('dente-close-copilot', handleCloseDrawer);
    window.addEventListener('dente:open-agent-cockpit', handleOpenCopilot);
    window.addEventListener('dente:toggle-chairside-hud', handleToggleHud);
    window.addEventListener('dente:open-chairside-hud', handleOpenHud);
    window.addEventListener('dente:close-chairside-hud', handleCloseHud);
    window.addEventListener('dente:open-voice-dictation', handleOpenVoiceModal);
    window.addEventListener('dente:close-voice-dictation', handleCloseVoiceModal);
    window.addEventListener('dente:open-treatment-plan-copilot', handleOpenTreatmentPlan);
    window.addEventListener('dente:close-treatment-plan-copilot', handleCloseTreatmentPlan);
    window.addEventListener('dente:open-protocols-catalog', handleOpenCatalog);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('hashchange', checkAndTrigger);
      window.removeEventListener('popstate', checkAndTrigger);
      window.removeEventListener('dente:toggle-copilot', handleCustomToggle);
      window.removeEventListener('dente:open-copilot', handleOpenCopilot);
      window.removeEventListener('dente-open-copilot', handleOpenCopilot);
      window.removeEventListener('dente:close-copilot', handleCloseDrawer);
      window.removeEventListener('dente-close-copilot', handleCloseDrawer);
      window.removeEventListener('dente:open-agent-cockpit', handleOpenCopilot);
      window.removeEventListener('dente:toggle-chairside-hud', handleToggleHud);
      window.removeEventListener('dente:open-chairside-hud', handleOpenHud);
      window.removeEventListener('dente:close-chairside-hud', handleCloseHud);
      window.removeEventListener('dente:open-voice-dictation', handleOpenVoiceModal);
      window.removeEventListener('dente:close-voice-dictation', handleCloseVoiceModal);
      window.removeEventListener('dente:open-treatment-plan-copilot', handleOpenTreatmentPlan);
      window.removeEventListener('dente:close-treatment-plan-copilot', handleCloseTreatmentPlan);
      window.removeEventListener('dente:open-protocols-catalog', handleOpenCatalog);
      window.removeEventListener('keydown', handleKeyDown);
      delete (window as any).__denteCopilot;
    };
  }, []);
}
