import React, { useState, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { useCopilot } from './useCopilot';
import { CopilotStudioModal } from './CopilotStudioModal';
import { useCopilotContextSync } from './CopilotContextSync';
import type { CopilotUiMessage, PendingConfirmation } from './copilotTypes';
import type { VisitNoteFieldsPatch, SpecialtyCategoryKey } from '../visit/clinicalCatalog/clinicalProtocolsCatalog';
import { useVisitStore } from '../../store/visitStore';
import { useCopilotStore } from '../../store/copilotStore';
import { useCopilotGlobalEvents } from './host/useCopilotGlobalEvents';
import { CopilotGlobalModals } from './host/CopilotGlobalModals';
import './styles/copilotTrigger.css';

export const CopilotGlobalHost: React.FC = () => {
  const copilot = useCopilot();
  const { context: uiContext } = useCopilotContextSync();

  const isStudioOpenStore = useCopilotStore((s) => s.isStudioOpen), isHudOpenStore = useCopilotStore((s) => s.isHudOpen);
  const setIsStudioOpen = useCopilotStore((s) => s.setIsStudioOpen), setIsHudOpen = useCopilotStore((s) => s.setIsHudOpen);
  const expandToStudio = useCopilotStore((s) => s.expandToStudio), collapseToHud = useCopilotStore((s) => s.collapseToHud);

  const [customMessages, setCustomMessages] = useState<CopilotUiMessage[] | null>(null);
  const [customPending, setCustomPending] = useState<PendingConfirmation | null>(null);
  const [customBusy, setCustomBusy] = useState<boolean>(false), [customPhase, setCustomPhase] = useState<string | null>(null);
  const [customContext, setCustomContext] = useState<{ patientName?: string | null; patientId?: string | null; activeTooth?: number | null } | null>(null);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false), [catalogTooth, setCatalogTooth] = useState<number | null>(null);
  const [catalogSpecialty, setCatalogSpecialty] = useState<SpecialtyCategoryKey>('all'), [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const isStudioActive = copilot.isOpen || isStudioOpenStore;
  const isHudActive = isHudOpenStore && !isStudioActive;

  const handleOpenStudio = useCallback(() => { copilot.openDrawer(); expandToStudio(); }, [copilot, expandToStudio]);
  const handleCloseStudio = useCallback(() => { copilot.closeDrawer(); setIsStudioOpen(false); }, [copilot, setIsStudioOpen]);
  const handleToggleStudio = useCallback(() => { if (isStudioActive) handleCloseStudio(); else handleOpenStudio(); }, [isStudioActive, handleCloseStudio, handleOpenStudio]);
  const handleOpenHud = useCallback(() => { handleCloseStudio(); setIsHudOpen(true); }, [handleCloseStudio, setIsHudOpen]);
  const handleCloseHud = useCallback(() => { setIsHudOpen(false); }, [setIsHudOpen]);
  const handleToggleHud = useCallback(() => { if (isHudActive) handleCloseHud(); else { collapseToHud(); copilot.closeDrawer(); } }, [isHudActive, handleCloseHud, collapseToHud, copilot]);

  const openVoiceModal = useCallback(() => setIsVoiceModalOpen(true), []);
  const closeVoiceModal = useCallback(() => setIsVoiceModalOpen(false), []);
  const openTreatmentPlanCopilot = useCallback(() => { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dente:open-treatment-plans')); }, []);
  const closeTreatmentPlanCopilot = useCallback(() => {}, []);

  const handleOpenCatalog = useCallback((tooth?: number, category?: SpecialtyCategoryKey) => {
    if (tooth) setCatalogTooth(tooth);
    if (category) setCatalogSpecialty(category);
    setIsCatalogModalOpen(true);
  }, []);

  const handleApplyCatalogPatch = useCallback((patch: VisitNoteFieldsPatch) => {
    useVisitStore.getState().setVisitNoteForm((prev) => ({
      ...prev,
      complaint: patch.complaint || prev.complaint || '',
      anamnesis: patch.anamnesis || prev.anamnesis || '',
      objectiveStatus: patch.objectiveStatus || prev.objectiveStatus || '',
      treatmentPlan: patch.treatmentPlan || prev.treatmentPlan || '',
      recommendations: patch.recommendations || prev.recommendations || '',
      diagnosis: patch.diagnosis || prev.diagnosis || '',
    }));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dente-apply-soap-protocol', { detail: patch }));
    setIsCatalogModalOpen(false);
  }, []);

  useCopilotGlobalEvents({
    openDrawer: handleOpenStudio,
    closeDrawer: handleCloseStudio,
    toggle: handleToggleStudio,
    setActiveTab: copilot.setActiveTab,
    openHud: handleOpenHud,
    closeHud: handleCloseHud,
    toggleHud: handleToggleHud,
    openVoiceModal,
    closeVoiceModal,
    openTreatmentPlanCopilot,
    closeTreatmentPlanCopilot,
    setCustomMessages,
    setCustomPending,
    setCustomContext,
    setCustomBusy,
    setCustomPhase,
    onOpenCatalog: handleOpenCatalog,
  });

  const effectiveMessages = customMessages !== null ? customMessages : copilot.messages;
  const effectivePending = customPending !== null ? customPending : copilot.pending;
  const numericActiveTooth = typeof uiContext.activeTooth === 'number'
    ? uiContext.activeTooth
    : uiContext.activeTooth && !Number.isNaN(Number(uiContext.activeTooth))
      ? Number(uiContext.activeTooth)
      : null;

  const effectiveActiveTooth = customContext?.activeTooth !== undefined
    ? customContext.activeTooth
    : numericActiveTooth;
  const effectivePatientId = customContext?.patientId !== undefined
    ? customContext.patientId
    : uiContext.patientId;
  const effectivePatientName = customContext?.patientName !== undefined
    ? customContext.patientName
    : uiContext.patientName;

  const isLeadsView =
    uiContext.view?.toLowerCase() === 'leads' ||
    (typeof window !== 'undefined' &&
      (window.location.hash.toLowerCase().includes('leads') ||
        window.location.pathname.toLowerCase().includes('leads')));

  return (
    <>
      <CopilotStudioModal
        isOpen={isStudioActive}
        onClose={handleCloseStudio}
        activeTooth={effectiveActiveTooth}
        patientId={effectivePatientId}
        patientName={effectivePatientName}
        initialTab={copilot.activeTab === 'pending' ? 'actions' : 'dialog'}
        initialMessages={effectiveMessages && effectiveMessages.length > 0 ? effectiveMessages : undefined}
        isThinking={customBusy || copilot.busy}
        thoughtProcess={customPhase || copilot.phase || undefined}
      />
      <CopilotGlobalModals
        isHudOpen={isHudActive}
        closeHud={handleCloseHud}
        isCatalogModalOpen={isCatalogModalOpen}
        closeCatalogModal={() => setIsCatalogModalOpen(false)}
        catalogTooth={catalogTooth}
        catalogSpecialty={catalogSpecialty}
        onApplyCatalogPatch={handleApplyCatalogPatch}
        isVoiceModalOpen={isVoiceModalOpen}
        closeVoiceModal={closeVoiceModal}
        patientId={uiContext.patientId || undefined}
        patientName={uiContext.patientName || undefined}
        patientAllergies={uiContext.allergies}
        activeTooth={numericActiveTooth}
      />
      {!isStudioActive && !isHudActive && !isLeadsView && (
        <button
          type="button"
          onClick={handleOpenStudio}
          className="copilot-trigger-btn"
          aria-label="Открыть ИИ-Ассистент ДЕНТА"
          title="ИИ-Ассистент ДЕНТА (Голос / Команды)"
          data-testid="copilot-floating-trigger"
        >
          <Sparkles size={18} className="shrink-0" />
          <span className="hidden sm:inline font-semibold">ИИ Ассистент</span>
          {effectivePending && (
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--warn,#f59e0b)] animate-pulse" />
          )}
        </button>
      )}
    </>
  );
};
