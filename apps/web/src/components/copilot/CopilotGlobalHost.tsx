import React, { useState, useCallback } from 'react';
import { useCopilot } from './useCopilot';
import { CopilotDrawer } from './CopilotDrawer';
import { useCopilotContextSync } from './CopilotContextSync';
import type { CopilotUiMessage, PendingConfirmation } from './copilotTypes';
import type { VisitNoteFieldsPatch, SpecialtyCategoryKey } from '../visit/clinicalCatalog/clinicalProtocolsCatalog';
import { useVisitStore } from '../../store/visitStore';
import { useCopilotGlobalEvents } from './host/useCopilotGlobalEvents';
import { CopilotGlobalModals } from './host/CopilotGlobalModals';

export const CopilotGlobalHost: React.FC = () => {
  const copilot = useCopilot();
  const { context: uiContext } = useCopilotContextSync();

  const [customMessages, setCustomMessages] = useState<CopilotUiMessage[] | null>(null);
  const [customPending, setCustomPending] = useState<PendingConfirmation | null>(null);
  const [isHudOpen, setIsHudOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogTooth, setCatalogTooth] = useState<number | null>(null);
  const [catalogSpecialty, setCatalogSpecialty] = useState<SpecialtyCategoryKey>('all');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [, setIsTreatmentPlanCopilotOpen] = useState(false);

  const openHud = useCallback(() => setIsHudOpen(true), []);
  const closeHud = useCallback(() => setIsHudOpen(false), []);
  const toggleHud = useCallback(() => setIsHudOpen((prev) => !prev), []);
  const openVoiceModal = useCallback(() => setIsVoiceModalOpen(true), []);
  const closeVoiceModal = useCallback(() => setIsVoiceModalOpen(false), []);
  const openTreatmentPlanCopilot = useCallback(() => setIsTreatmentPlanCopilotOpen(true), []);
  const closeTreatmentPlanCopilot = useCallback(() => setIsTreatmentPlanCopilotOpen(false), []);

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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dente-apply-soap-protocol', { detail: patch }));
    }
    setIsCatalogModalOpen(false);
  }, []);

  useCopilotGlobalEvents({
    openDrawer: copilot.openDrawer,
    closeDrawer: copilot.closeDrawer,
    toggle: copilot.toggle,
    setActiveTab: copilot.setActiveTab,
    openHud,
    closeHud,
    toggleHud,
    openVoiceModal,
    closeVoiceModal,
    openTreatmentPlanCopilot,
    closeTreatmentPlanCopilot,
    setCustomMessages,
    setCustomPending,
    onOpenCatalog: handleOpenCatalog,
  });

  const effectiveMessages = customMessages !== null ? customMessages : copilot.messages;
  const effectivePending = customPending !== null ? customPending : copilot.pending;
  const numericActiveTooth = typeof uiContext.activeTooth === 'number'
    ? uiContext.activeTooth
    : uiContext.activeTooth && !Number.isNaN(Number(uiContext.activeTooth))
      ? Number(uiContext.activeTooth)
      : null;

  return (
    <>
      <CopilotDrawer
        isOpen={copilot.isOpen}
        messages={effectiveMessages}
        busy={copilot.busy}
        phase={copilot.phase}
        pending={effectivePending}
        nameCache={copilot.nameCache}
        nudges={copilot.nudges}
        activeTab={copilot.activeTab}
        onTabChange={copilot.setActiveTab}
        onClose={copilot.closeDrawer}
        onSend={copilot.send}
        onConfirm={copilot.confirm}
        onReset={copilot.reset}
        onDismissNudge={copilot.dismissNudge}
      />
      <CopilotGlobalModals
        isHudOpen={isHudOpen}
        closeHud={closeHud}
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
    </>
  );
};
