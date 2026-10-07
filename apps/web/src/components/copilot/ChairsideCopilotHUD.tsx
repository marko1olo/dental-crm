/**
 * ChairsideCopilotHUD.tsx — Autonomous AI Copilot HUD for Chairside Dentist & Staff.
 *
 * Transfers the experience of an autonomous agent into the chairside doctor workspace:
 * - Collapsible Thought Stream (ReAct reasoning steps, allergy check, 804n calculation, ICD-10 match).
 * - Action Proposal Cards (Odontogram update, 804n services estimate, 043/u SOAP diary, Safety alert).
 * - 1-Click Apply-All control bar (Instant application without modal barriers).
 * - Doctor autonomy (Mandate 8e: Doctor is in 100% control, zero disabled buttons, reversible actions).
 * - 7 Deadly Sins checklist compliance (1-line toolbar 32-36px, <=2 buttons/card, zero emojis, WCAG AAA tokens).
 * - Architecture: Decomposed into modular subcomponents <= 500 lines (Mandate 8b), HUD <= 800 lines.
 */

import React from "react";
import { Sparkles } from "lucide-react";

// Subcomponents and shared types
import {
  type ChairsideThoughtStep,
  type ChairsideToothProposal,
  type ChairsideServiceProposal,
  type ChairsideSoapProposal,
  type ChairsideAnestheticProposal,
  type ChairsideConsentProposal,
  type ChairsideSafetyAlert,
  type ChairsideCopilotHUDProps,
  type ClinicalPreset,
  mapToCanonicalToothState,
  CLINICAL_PRESETS,
} from "./chairside/chairsideTypes";
import { ChairsideStatusCapsule, ChairsideActionFooter } from "./chairside/ChairsideStatusCapsule";
import { ChairsideClinicalInsights } from "./chairside/ChairsideClinicalInsights";
import { ChairsideProposalCards } from "./chairside/ChairsideProposalCards";
import { ChairsideVoiceAssistant } from "./chairside/ChairsideVoiceAssistant";
import { useChairsideCopilotState } from "./chairside/useChairsideCopilotState";
import "./ChairsideCopilotHUD.css";

// Re-export types and canonical mapper for complete backwards compatibility
export {
  type ChairsideThoughtStep,
  type ChairsideToothProposal,
  type ChairsideServiceProposal,
  type ChairsideSoapProposal,
  type ChairsideAnestheticProposal,
  type ChairsideConsentProposal,
  type ChairsideSafetyAlert,
  type ChairsideCopilotHUDProps,
  type ClinicalPreset,
  mapToCanonicalToothState,
  CLINICAL_PRESETS,
};

export const ChairsideCopilotHUD: React.FC<ChairsideCopilotHUDProps> = (props) => {
  const {
    patientName = "Пациент",
    activeTooth = 16,
    onClose,
    className = "",
  } = props;

  const state = useChairsideCopilotState(props);

  if (!state.isOpen) {
    return null;
  }

  // Minimized state pill
  if (state.isMinimized) {
    return (
      <div
        className={`chairside-copilot-hud ${state.isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
        data-testid="chairside-copilot-hud-minimized"
      >
        <button
          type="button"
          className="chairside-hud-pill"
          onClick={() => state.setIsMinimized(false)}
          title="Развернуть ИИ-Копилот у кресла"
          data-testid="btn-chairside-hud-expand"
        >
          <div className="chairside-hud-pill-icon">
            <Sparkles size={14} />
          </div>
          <span>Копилот у кресла</span>
          {state.isThinking ? (
            <span className="chairside-hud-pill-badge chairside-hud-pill-badge--busy">
              Анализ...
            </span>
          ) : (
            <span className="chairside-hud-pill-badge">
              Готов
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`chairside-copilot-hud ${state.isDocked ? "chairside-copilot-hud--docked" : "chairside-copilot-hud--floating"} ${className}`}
      aria-label="Кресельный ИИ-Копилот ДЕНТА"
      data-testid="chairside-copilot-hud"
    >
      <div className={`chairside-hud-panel ${!state.isDrawerOpen ? "chairside-hud-panel--compact" : ""}`}>
        {/* Header Capsule Bar (Mandates 8l & 8p: Height <= 44-48px, Zero CLS) */}
        <ChairsideStatusCapsule
          patientName={patientName}
          isListening={state.isListening}
          audioVolume={state.audioVolume}
          onToggleVoice={state.handleToggleVoice}
          isDrawerOpen={state.isDrawerOpen}
          onToggleDrawer={() => state.setIsDrawerOpen((d) => !d)}
          isDocked={state.isDocked}
          onToggleDock={() => state.setIsDocked((d) => !d)}
          onMinimize={() => state.setIsMinimized(true)}
          onOpenDrawerChat={() => {
            state.setIsOpen(false);
            if (onClose) onClose();
            window.dispatchEvent(new CustomEvent("dente:toggle-copilot"));
          }}
          onCloseHUD={() => {
            state.setIsOpen(false);
            if (onClose) onClose();
          }}
          toothProposal={state.toothProposal}
          onApplyTooth={state.handleApplyTooth}
          onRemoveToothPill={state.handleRemoveToothPill}
          soapProposal={state.soapProposal}
          onRemoveDiagnosisPill={state.handleRemoveDiagnosisPill}
          anestheticProposal={state.anestheticProposal}
          onRemoveAnestheticPill={state.handleRemoveAnestheticPill}
          servicesProposal={state.servicesProposal}
          servicesTotalPrice={state.servicesTotalPrice}
          onRemoveServicesPill={state.handleRemoveServicesPill}
        />

        {state.isDrawerOpen && (
          <>
            {/* Scrollable Body */}
            <div className="chairside-hud-body" data-testid="chairside-hud-body">
              {/* Clinical Insights (Presets, Verdict, ReAct Thoughts, Catalog Protocol) */}
              <ChairsideClinicalInsights
                activePresetIndex={state.activePresetIndex}
                onLoadPreset={state.loadPreset}
                verdict={state.verdict}
                thoughts={state.thoughts}
                isThoughtsExpanded={state.isThoughtsExpanded}
                onToggleThoughts={() => state.setIsThoughtsExpanded((exp) => !exp)}
                isThinking={state.isThinking}
                completedStepsCount={state.completedStepsCount}
                totalThoughtDuration={state.totalThoughtDuration}
                matchedProtocol={state.matchedProtocol}
                activeTooth={activeTooth}
              />

              {/* Action Proposals Section (HITL Cards) */}
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
                onToggleEditSoap={() => state.setIsEditingSoap((prev) => !prev)}
                onSoapChange={state.setSoapProposal}
                onApplySoap={state.handleApplySoap}
                onUndoSoap={state.handleUndoSoap}
                anestheticProposal={state.anestheticProposal}
                isEditingAnesthetic={state.isEditingAnesthetic}
                onToggleEditAnesthetic={() => state.setIsEditingAnesthetic((prev) => !prev)}
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

            {/* Footer & 1-Click Action Bar */}
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
        )}
      </div>
    </aside>
  );
};
