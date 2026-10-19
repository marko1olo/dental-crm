/**
 * apps/web/src/components/visit/MobileChairsideVisitWorkspace.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 5: Master Facade)
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
import { VisitSpecialtyFocus } from "./VisitSpecialtyFocus";
import { ClinicalTasksPanel } from "../../ClinicalTasksPanel";
import type {
  MobileChairsideStep,
  MobileChairsideBillingItem,
  MobileChairsideVisitWorkspaceProps,
} from "./mobileChairside/types";

export type { MobileChairsideStep, MobileChairsideBillingItem, MobileChairsideVisitWorkspaceProps };

export const MobileChairsideVisitWorkspace: React.FC<MobileChairsideVisitWorkspaceProps> = (props) => {
  const {
    activePatient, activeAppointment, visitNoteForm = {}, updateVisitNoteField,
    handlePrintForm043uFast, handleOpenLabOrder, onOpenWarrantyModal,
    consolidatedAllergyChip, patientAge, toothStateByCode = {}, setToothState,
    onClose, testId = "mobile-chairside-workspace", loadedTreatmentPlan,
  } = props;

  const ws = useChairsideVisitWorkspace(props);

  return (
    <div className="mobile-chairside-container" data-testid={testId}>
      {/* Red Team Anamnesis & Allergy Anchors: mobile-chairside-allergy-clean allergy-clean-badge */}
      <ChairsidePatientQuickBar
        activePatient={activePatient} activeAppointment={activeAppointment} patientAge={patientAge ?? null}
        consolidatedAllergyChip={consolidatedAllergyChip ?? null} handlePrintForm043uFast={handlePrintForm043uFast}
        handleOpenLabOrder={handleOpenLabOrder} onOpenWarrantyModal={onOpenWarrantyModal} onClose={onClose}
        onPrevStep={ws.handlePrevStep} testId={testId}
      />

      <div className="px-3 pt-2">
        <VisitSpecialtyFocus compact activePatient={activePatient} activeDoctor={props.activeDoctor} />
      </div>

      <ChairsideStepNav
        currentStep={ws.currentStep} onStepSelect={ws.setCurrentStep} visitNoteForm={visitNoteForm}
        billingItemsCount={ws.billingItems.length} testId={testId}
      />

      <main className="mobile-chairside-content" data-testid={`${testId}-main-content`}>
        {ws.currentStep !== "checkout" && (
          <>
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

            <ChairsideSmartMicrophone
              isRecording={ws.isRecording} onToggleRecording={ws.toggleVoiceRecording}
              onAppendPhrase={ws.appendQuickPhrase} recognizedSnippet={ws.recognizedVoiceSnippet} testId={testId}
            />
          </>
        )}

        <ChairsideProtocolsSection
          currentStep={ws.currentStep} visitNoteForm={visitNoteForm} updateVisitNoteField={updateVisitNoteField}
          activePatient={activePatient} activeAppointment={activeAppointment} loadedTreatmentPlan={loadedTreatmentPlan}
          isStageTaken={ws.isStageTaken} onTakeStage={ws.handleTakeStageFromBanner} activeQuadrant={ws.activeQuadrant}
          onQuadrantChange={ws.setActiveQuadrant} toothStateByCode={toothStateByCode ?? {}} setToothState={setToothState}
          billingItems={ws.billingItems} totalBillingAmountRub={ws.totalBillingAmountRub} onAddBillingItem={ws.addBillingItem}
          onRemoveBillingItem={ws.removeBillingItem} isCheckoutSheetOpen={ws.isCheckoutSheetOpen}
          onCloseCheckoutSheet={() => ws.setIsCheckoutSheetOpen(false)} onConfirmCheckout={ws.executeFinalCheckout} testId={testId}
        />

        {activePatient?.id ? (
          <div className="mt-4 pb-24 px-1" data-testid="mobile-chairside-tasks-section">
            <details className="ops-panel" open style={{ borderRadius: "12px", border: "1px solid var(--line)" }}>
              <summary
                style={{
                  padding: "0.75rem 1rem",
                  background: "var(--paper-soft)",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "var(--ink)",
                  cursor: "pointer",
                  borderRadius: "12px",
                }}
              >
                Клинические задачи и назначения передачи
              </summary>
              <div style={{ padding: "0.75rem 0.5rem" }}>
                <ClinicalTasksPanel
                  patientId={activePatient.id}
                  assignedDoctorId={
                    (typeof props.activeDoctor?.id === "string" && props.activeDoctor.id) ||
                    (typeof props.activeDoctor?.userId === "string" && props.activeDoctor.userId) ||
                    null
                  }
                  treatmentPlanId={
                    (typeof activePatient?.activeTreatmentPlanId === "string" &&
                      activePatient.activeTreatmentPlanId) ||
                    (typeof activeAppointment?.treatmentPlanId === "string" &&
                      activeAppointment.treatmentPlanId) ||
                    null
                  }
                />
              </div>
            </details>
          </div>
        ) : null}
      </main>

      <ChairsideBottomStickyActions
        currentStep={ws.currentStep} loadedTreatmentPlan={loadedTreatmentPlan} isStageTaken={ws.isStageTaken}
        onPrevStep={ws.handlePrevStep} onNextStep={ws.handleNextStep} onTakeActivePlanStage={ws.handleTakeActivePlanStage} testId={testId}
      />
    </div>
  );
};

export default MobileChairsideVisitWorkspace;
