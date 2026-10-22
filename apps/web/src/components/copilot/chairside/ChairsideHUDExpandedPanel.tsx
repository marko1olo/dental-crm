import React from "react";
import { ChairsideClinicalInsights } from "./ChairsideClinicalInsights";
import { ChairsideProposalCards } from "./ChairsideProposalCards";
import { ChairsideVoiceAssistant } from "./ChairsideVoiceAssistant";
import { ChairsideActionFooter } from "./ChairsideStatusCapsule";

interface ChairsideHUDExpandedPanelProps {
  state: any;
  activeTooth?: number | null | undefined;
}

export const ChairsideHUDExpandedPanel: React.FC<ChairsideHUDExpandedPanelProps> = ({
  state,
  activeTooth,
}) => {
  return (
    <>
      <div className="chairside-hud-body" data-testid="chairside-hud-body">
        <ChairsideClinicalInsights
          activePresetIndex={state.activePresetIndex}
          onLoadPreset={state.loadPreset}
          verdict={state.verdict}
          thoughts={state.thoughts}
          isThoughtsExpanded={state.isThoughtsExpanded}
          onToggleThoughts={() => state.setIsThoughtsExpanded((exp: boolean) => !exp)}
          isThinking={state.isThinking}
          completedStepsCount={state.completedStepsCount}
          totalThoughtDuration={state.totalThoughtDuration}
          matchedProtocol={state.matchedProtocol}
          activeTooth={activeTooth}
        />

        <ChairsideProposalCards
          toothProposal={state.toothProposal}
          onApplyTooth={state.handleApplyTooth}
          onUndoTooth={state.handleUndoTooth}
          servicesProposal={state.servicesProposal}
          servicesTotalPrice={state.servicesTotalPrice}
          onApplyServices={state.handleApplyServices}
          onUndoServices={state.handleUndoServices}
          soapProposal={state.soapProposal}
          isEditingSoap={state.isEditingSoap}
          onToggleEditSoap={() => state.setIsEditingSoap((prev: boolean) => !prev)}
          onSoapChange={state.setSoapProposal}
          onApplySoap={state.handleApplySoap}
          onUndoSoap={state.handleUndoSoap}
          anestheticProposal={state.anestheticProposal}
          isEditingAnesthetic={state.isEditingAnesthetic}
          onToggleEditAnesthetic={() => state.setIsEditingAnesthetic((prev: boolean) => !prev)}
          onAnestheticChange={state.setAnestheticProposal}
          onApplyCarpule={state.handleApplyCarpule}
          onUndoCarpule={state.handleUndoCarpule}
          consentProposal={state.consentProposal}
          onApplyConsent={state.handleApplyConsent}
          onUndoConsent={state.handleUndoConsent}
          safetyAlert={state.safetyAlert}
          onAcknowledgeAlert={state.handleAcknowledgeAlert}
        />
      </div>

      <footer className="chairside-hud-footer" data-testid="chairside-hud-footer">
        <ChairsideVoiceAssistant
          isListening={state.isListening}
          audioVolume={state.audioVolume}
          inputText={state.inputText}
          onInputChange={state.setInputText}
          onSubmit={state.handleFormSubmit}
          onToggleVoice={state.handleToggleVoice}
          inputRef={state.inputRef}
        />

        <ChairsideActionFooter
          allApplied={Boolean(state.allApplied)}
          onApplyAll={state.handleApplyAll}
          onUndoAll={state.handleUndoAll}
          onDismissAll={state.handleDismissAll}
        />
      </footer>
    </>
  );
};
