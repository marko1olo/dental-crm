import React from "react";
import {
  type ChairsideThoughtStep, type ChairsideToothProposal, type ChairsideServiceProposal,
  type ChairsideSoapProposal, type ChairsideAnestheticProposal, type ChairsideConsentProposal,
  type ChairsideSafetyAlert, type ChairsideCopilotHUDProps, type ClinicalPreset,
  mapToCanonicalToothState, CLINICAL_PRESETS,
} from "./chairside/chairsideTypes";
import { ChairsideStatusCapsule } from "./chairside/ChairsideStatusCapsule";
import { ChairsideHUDMinimizedPill } from "./chairside/ChairsideHUDMinimizedPill";
import { ChairsideHUDExpandedPanel } from "./chairside/ChairsideHUDExpandedPanel";
import { useChairsideCopilotState } from "./chairside/useChairsideCopilotState";
import "./ChairsideCopilotHUD.css";

export {
  type ChairsideThoughtStep, type ChairsideToothProposal, type ChairsideServiceProposal,
  type ChairsideSoapProposal, type ChairsideAnestheticProposal, type ChairsideConsentProposal,
  type ChairsideSafetyAlert, type ChairsideCopilotHUDProps, type ClinicalPreset,
  mapToCanonicalToothState, CLINICAL_PRESETS,
};

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = (props) => {
  const { patientName = "Пациент", activeTooth = 16, onClose, className = "" } = props;
  const state = useChairsideCopilotState(props);

  if (!state.isOpen) return null;

  if (state.isMinimized) {
    return (
      <ChairsideHUDMinimizedPill
        isDocked={state.isDocked} className={className} isThinking={state.isThinking}
        onExpand={() => state.setIsMinimized(false)}
      />
    );
  }

  const handleOpenDrawerChat = () => {
    state.setIsOpen(false);
    if (onClose) onClose();
    window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
  };

  const handleCloseHUD = () => {
    state.setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <aside
      className={`chairside-copilot-hud ${state.isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
      aria-label="Кресельный ИИ-Копилот ДЕНТА"
      data-testid="chairside-copilot-hud"
    >
      <div className={`chairside-hud-panel ${!state.isDrawerOpen ? "chairside-hud-panel--compact" : ""}`}>
        <ChairsideStatusCapsule
          patientName={patientName} isListening={state.isListening} audioVolume={state.audioVolume}
          onToggleVoice={state.handleToggleVoice} isDrawerOpen={state.isDrawerOpen}
          onToggleDrawer={() => state.setIsDrawerOpen((d: boolean) => !d)} isDocked={state.isDocked}
          onToggleDock={() => state.setIsDocked((d: boolean) => !d)} onMinimize={() => state.setIsMinimized(true)}
          onOpenDrawerChat={handleOpenDrawerChat} onCloseHUD={handleCloseHUD}
          toothProposal={state.toothProposal} onApplyTooth={state.handleApplyTooth}
          onRemoveToothPill={state.handleRemoveToothPill} soapProposal={state.soapProposal}
          onRemoveDiagnosisPill={state.handleRemoveDiagnosisPill} anestheticProposal={state.anestheticProposal}
          onRemoveAnestheticPill={state.handleRemoveAnestheticPill} servicesProposal={state.servicesProposal}
          servicesTotalPrice={state.servicesTotalPrice} onRemoveServicesPill={state.handleRemoveServicesPill}
        />
        {state.isDrawerOpen && <ChairsideHUDExpandedPanel state={state} activeTooth={activeTooth} />}
      </div>
    </aside>
  );
};
export default ChairsideCopilotHUD;
