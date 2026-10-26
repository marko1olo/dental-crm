import React from 'react';
import { ChairsideCopilotHUD } from '../ChairsideCopilotHUD';
import { ClinicalProtocolsCatalogModal } from '../../visit/clinicalCatalog/ClinicalProtocolsCatalogModal';
import { VoiceDictationAssistantModal } from '../../voice/VoiceDictationAssistantModal';
import { useVisitStore } from '../../../store/visitStore';
import type { VisitNoteFieldsPatch, SpecialtyCategoryKey } from '../../visit/clinicalCatalog/clinicalProtocolsCatalog';

export interface CopilotGlobalModalsProps {
  isHudOpen: boolean;
  closeHud: () => void;
  isCatalogModalOpen: boolean;
  closeCatalogModal: () => void;
  catalogTooth: number | null;
  catalogSpecialty: SpecialtyCategoryKey;
  onApplyCatalogPatch: (patch: VisitNoteFieldsPatch, successMessage: string) => void;
  isVoiceModalOpen: boolean;
  closeVoiceModal: () => void;
  patientId?: string | undefined;
  patientName?: string | undefined;
  patientAllergies?: string[] | undefined;
  activeTooth: number | null;
}

export const CopilotGlobalModals: React.FC<CopilotGlobalModalsProps> = ({
  isHudOpen,
  closeHud,
  isCatalogModalOpen,
  closeCatalogModal,
  catalogTooth,
  catalogSpecialty,
  onApplyCatalogPatch,
  isVoiceModalOpen,
  closeVoiceModal,
  patientId,
  patientName,
  patientAllergies,
  activeTooth,
}) => {
  return (
    <>
      {isHudOpen && (
        <ChairsideCopilotHUD
          initialOpen={true}
          patientId={patientId}
          patientName={patientName}
          patientAllergies={patientAllergies}
          activeTooth={activeTooth}
          onClose={closeHud}
        />
      )}

      {isCatalogModalOpen && (
        <ClinicalProtocolsCatalogModal
          isOpen={isCatalogModalOpen}
          onClose={closeCatalogModal}
          activeTooth={catalogTooth ?? activeTooth ?? 16}
          currentNoteForm={useVisitStore.getState().visitNoteForm}
          onApplyPatch={onApplyCatalogPatch}
          initialSpecialty={catalogSpecialty}
        />
      )}

      {isVoiceModalOpen && (
        <VoiceDictationAssistantModal
          isOpen={isVoiceModalOpen}
          onClose={closeVoiceModal}
          activeToothNumber={activeTooth}
        />
      )}
    </>
  );
};
