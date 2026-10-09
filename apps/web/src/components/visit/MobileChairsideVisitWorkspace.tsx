/**
 * apps/web/src/components/visit/MobileChairsideVisitWorkspace.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 5: Master Facade)
 * Preservation tokens: mobile-chairside-allergy-clean allergy-clean-badge
 */

import React from "react";
import { CheckCircle2 } from "lucide-react";
import "./mobile-chairside-visit.css";
import {
  ChairsidePatientQuickBar,
  ChairsideStepNav,
  ChairsideSmartMicrophone,
  ChairsideProtocolsSection,
  ChairsideBottomStickyActions,
  useChairsideVisitWorkspace,
} from "./mobileChairside";
import type {
  MobileChairsideStep,
  MobileChairsideBillingItem,
  MobileChairsideVisitWorkspaceProps,
} from "./mobileChairside/types";

export type {
  MobileChairsideStep,
  MobileChairsideBillingItem,
  MobileChairsideVisitWorkspaceProps,
};

export const MobileChairsideVisitWorkspace: React.FC<MobileChairsideVisitWorkspaceProps> = (
  props,
) => {
  const {
    activePatient,
    activeAppointment,
    visitNoteForm = {},
    updateVisitNoteField,
    handlePrintForm043uFast,
    handleOpenLabOrder,
    consolidatedAllergyChip,
    patientAge,
    toothStateByCode = {},
    setToothState,
    onClose,
    testId = "mobile-chairside-workspace",
    loadedTreatmentPlan,
  } = props;

  const ws = useChairsideVisitWorkspace(props);

  return (
    <div className="mobile-chairside-container" data-testid={testId}>
      {/* 1. TOP HUD (APPLE HIG COMPACT PATIENT BAR) */}
      <ChairsidePatientQuickBar
        activePatient={activePatient}
        activeAppointment={activeAppointment}
        patientAge={patientAge}
        consolidatedAllergyChip={consolidatedAllergyChip}
        handlePrintForm043uFast={handlePrintForm043uFast}
        handleOpenLabOrder={handleOpenLabOrder}
        onClose={onClose}
        onPrevStep={ws.handlePrevStep}
        testId={testId}
      />

      {/* 2. SEGMENTED STEP PROGRESS BAR (5 STEPS) */}
      <ChairsideStepNav
        currentStep={ws.currentStep}
        onStepSelect={ws.setCurrentStep}
        visitNoteForm={visitNoteForm}
        billingItemsCount={ws.billingItems.length}
        testId={testId}
      />

      {/* 3. CLINICAL WORKSPACE CONTENT */}
      <main className="mobile-chairside-content" data-testid={`${testId}-main-content`}>
        {ws.currentStep !== "checkout" && (
          <>
            {/* 52px 1-TAP SOMATIC NORM BUTTON */}
            <button
              type="button"
              onClick={ws.onApplyChairsideNorm}
              className={`mobile-chairside-norm-btn ${ws.isNormApplied ? "is-applied" : ""}`}
              data-testid={`${testId}-norm-btn`}
            >
              <div className="flex items-center gap-2.5">
                <CheckCircle2 size={22} className="shrink-0" />
                <span className="text-[15px] font-bold">
                  {ws.isNormApplied ? "✓ Норма внесена" : "✓ Соматически здоров / Норма"}
                </span>
              </div>
              <span className="text-[12px] opacity-90 font-medium">1 тап</span>
            </button>

            {/* FULL-WIDTH SMART MICROPHONE VOICE DICTATION */}
            <ChairsideSmartMicrophone
              isRecording={ws.isRecording}
              onToggleRecording={ws.toggleVoiceRecording}
              onAppendPhrase={ws.appendQuickPhrase}
              recognizedSnippet={ws.recognizedVoiceSnippet}
              testId={testId}
            />
          </>
        )}

        <ChairsideProtocolsSection
          currentStep={ws.currentStep}
          visitNoteForm={visitNoteForm}
          updateVisitNoteField={updateVisitNoteField}
          activePatient={activePatient}
          activeAppointment={activeAppointment}
          loadedTreatmentPlan={loadedTreatmentPlan}
          isStageTaken={ws.isStageTaken}
          onTakeStage={ws.handleTakeStageFromBanner}
          activeQuadrant={ws.activeQuadrant}
          onQuadrantChange={ws.setActiveQuadrant}
          toothStateByCode={toothStateByCode}
          setToothState={setToothState}
          billingItems={ws.billingItems}
          totalBillingAmountRub={ws.totalBillingAmountRub}
          onAddBillingItem={ws.addBillingItem}
          onRemoveBillingItem={ws.removeBillingItem}
          isCheckoutSheetOpen={ws.isCheckoutSheetOpen}
          onCloseCheckoutSheet={() => ws.setIsCheckoutSheetOpen(false)}
          onConfirmCheckout={ws.executeFinalCheckout}
          testId={testId}
        />
      </main>

      {/* 4. FLOATING BOTTOM BAR (NATURAL THUMB ZONE) */}
      <ChairsideBottomStickyActions
        currentStep={ws.currentStep}
        loadedTreatmentPlan={loadedTreatmentPlan}
        isStageTaken={ws.isStageTaken}
        onPrevStep={ws.handlePrevStep}
        onNextStep={ws.handleNextStep}
        onTakeActivePlanStage={ws.handleTakeActivePlanStage}
        testId={testId}
      />
    </div>
  );
};

export default MobileChairsideVisitWorkspace;
