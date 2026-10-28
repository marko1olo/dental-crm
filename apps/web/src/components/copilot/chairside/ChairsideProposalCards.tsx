/**
 * ChairsideProposalCards.tsx — HITL Action Proposal Cards for ChairsideCopilotHUD.
 *
 * Compliance:
 * - Mandate 8b: Decomposed container <= 120 lines (Sweet Spot 200-300 overall).
 * - Mandate 8e: Doctor Autonomy (editable before apply, reversible undo, zero blocking gates).
 * - TABOO OF THE CREATOR: STRICTLY PRESERVE ANESTHETIC DOSAGE LOGIC AND PEDIATRICS!
 * - Zero cartoon emojis, strictly Lucide vector icons.
 */

import React from "react";
import type {
  ChairsideToothProposal,
  ChairsideServiceProposal,
  ChairsideSoapProposal,
  ChairsideAnestheticProposal,
  ChairsideConsentProposal,
  ChairsideSafetyAlert,
} from "./chairsideTypes";
import { SafetyAlertProposalCard } from "./proposals/SafetyAlertProposalCard";
import { ToothStateProposalCard } from "./proposals/ToothStateProposalCard";
import { ServicesProposalCard } from "./proposals/ServicesProposalCard";
import { SoapDiaryProposalCard } from "./proposals/SoapDiaryProposalCard";
import { AnestheticProposalCard } from "./proposals/AnestheticProposalCard";
import { ConsentProposalCard } from "./proposals/ConsentProposalCard";

export interface ChairsideProposalCardsProps {
  readonly toothProposal: ChairsideToothProposal;
  readonly onApplyTooth: () => void;
  readonly onUndoTooth: () => void;

  readonly servicesProposal: ChairsideServiceProposal[];
  readonly servicesTotalPrice: number;
  readonly onApplyServices: () => void;
  readonly onUndoServices: () => void;

  readonly soapProposal: ChairsideSoapProposal;
  readonly isEditingSoap: boolean;
  readonly onToggleEditSoap: () => void;
  readonly onSoapChange: (updater: (prev: ChairsideSoapProposal) => ChairsideSoapProposal) => void;
  readonly onApplySoap: () => void;
  readonly onUndoSoap: () => void;

  readonly anestheticProposal: ChairsideAnestheticProposal | null;
  readonly isEditingAnesthetic: boolean;
  readonly onToggleEditAnesthetic: () => void;
  readonly onAnestheticChange: (updater: (prev: ChairsideAnestheticProposal | null) => ChairsideAnestheticProposal | null) => void;
  readonly onApplyCarpule: () => void;
  readonly onUndoCarpule: () => void;

  readonly consentProposal: ChairsideConsentProposal | null;
  readonly onApplyConsent: () => void;
  readonly onUndoConsent: () => void;

  readonly safetyAlert: ChairsideSafetyAlert;
  readonly onAcknowledgeAlert: () => void;
}

export const ChairsideProposalCards: React.FC<ChairsideProposalCardsProps> = ({
  toothProposal,
  onApplyTooth,
  onUndoTooth,
  servicesProposal,
  servicesTotalPrice,
  onApplyServices,
  onUndoServices,
  soapProposal,
  isEditingSoap,
  onToggleEditSoap,
  onSoapChange,
  onApplySoap,
  onUndoSoap,
  anestheticProposal,
  isEditingAnesthetic,
  onToggleEditAnesthetic,
  onAnestheticChange,
  onApplyCarpule,
  onUndoCarpule,
  consentProposal,
  onApplyConsent,
  onUndoConsent,
  safetyAlert,
  onAcknowledgeAlert,
}) => {
  return (
    <section className="chairside-hud-proposals" data-testid="chairside-proposals-section">
      <div className="chairside-hud-section-header">
        <span className="chairside-hud-section-title">Предложенные действия (HITL)</span>
        <span className="text-[11px] text-[var(--muted)] font-medium">Контроль врача</span>
      </div>

      {/* 1. Safety Alert Card */}
      {safetyAlert && (
        <SafetyAlertProposalCard
          safetyAlert={safetyAlert}
          onAcknowledgeAlert={onAcknowledgeAlert}
        />
      )}

      {/* 2. Odontogram Tooth State Card */}
      <ToothStateProposalCard
        toothProposal={toothProposal}
        onApplyTooth={onApplyTooth}
        onUndoTooth={onUndoTooth}
      />

      {/* 3. 804n Services & Estimate Card */}
      <ServicesProposalCard
        servicesProposal={servicesProposal}
        servicesTotalPrice={servicesTotalPrice}
        onApplyServices={onApplyServices}
        onUndoServices={onUndoServices}
      />

      {/* 4. Form 043/u SOAP Diary Card (Mandate 8e: Editable before apply + Undo) */}
      <SoapDiaryProposalCard
        soapProposal={soapProposal}
        isEditingSoap={isEditingSoap}
        onToggleEditSoap={onToggleEditSoap}
        onSoapChange={onSoapChange}
        onApplySoap={onApplySoap}
        onUndoSoap={onUndoSoap}
      />

      {/* 5. Anesthetic Clinical Protocol Card (TABOO: Do NOT alter dosage calculation logic!) */}
      {anestheticProposal && (
        <AnestheticProposalCard
          anestheticProposal={anestheticProposal}
          isEditingAnesthetic={isEditingAnesthetic}
          onToggleEditAnesthetic={onToggleEditAnesthetic}
          onAnestheticChange={onAnestheticChange}
          onApplyCarpule={onApplyCarpule}
          onUndoCarpule={onUndoCarpule}
        />
      )}

      {/* 6. Statutory Informed Consent (IDS) Card */}
      {consentProposal && (
        <ConsentProposalCard
          consentProposal={consentProposal}
          onApplyConsent={onApplyConsent}
          onUndoConsent={onUndoConsent}
        />
      )}
    </section>
  );
};
