/**
 * apps/web/src/components/visit/MobileChairsideVisitWorkspace.tsx
 * DENTE Dental CRM — Sovereign Mobile Chairside Visit Workspace (Layer 5: Master Facade)
 */

import React from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
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
import { MobileBottomSheet } from "../mobile/MobileBottomSheet";
import { showToast } from "../GlobalToast";
import type {
  MobileChairsideStep,
  MobileChairsideBillingItem,
  MobileChairsideVisitWorkspaceProps,
} from "./mobileChairside/types";

export type { MobileChairsideStep, MobileChairsideBillingItem, MobileChairsideVisitWorkspaceProps };

export const MobileChairsideVisitWorkspace: React.FC<MobileChairsideVisitWorkspaceProps> = (props) => {
  const {
    activePatient, activeAppointment, visitNoteForm = {}, updateVisitNoteField,
    handlePrintForm043uFast, handleOpenPrescription, handleOpenLabOrder, onOpenWarrantyModal,
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
        handleOpenPrescription={handleOpenPrescription}
        handleOpenLabOrder={handleOpenLabOrder} onOpenWarrantyModal={onOpenWarrantyModal}
        onOpenDiarySheet={() => ws.setIsDiarySheetOpen(true)} onClose={onClose}
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

      {/* Native iOS Bottom Sheet: Клинический дневник приёма (SOAP) */}
      <MobileBottomSheet
        isOpen={ws.isDiarySheetOpen}
        onClose={() => ws.setIsDiarySheetOpen(false)}
        title="Дневник приёма (SOAP)"
        subtitle="Клиническая карта осмотра и лечения"
        testId={`${testId}-diary-sheet`}
        footer={
          <div className="w-full flex items-center gap-2 pt-2 pb-1">
            <button
              type="button"
              onClick={() => {
                ws.setIsDiarySheetOpen(false);
                if (props.flushPendingVisitSaves) {
                  props.flushPendingVisitSaves();
                }
                showToast("Дневник приёма сохранён", "success");
              }}
              className="w-full inline-flex items-center justify-center gap-2 h-12 min-h-[48px] rounded-xl bg-[var(--teal,#0d9488)] text-white text-[15px] font-bold shadow-md active:scale-[0.98] transition-transform cursor-pointer"
              data-testid={`${testId}-diary-sheet-save-btn`}
            >
              <CheckCircle2 size={18} className="stroke-[2.5]" />
              <span>Сохранить дневник приёма</span>
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 pb-2">
          {/* 1-Tap Norm Button */}
          <button
            type="button"
            onClick={ws.onApplyChairsideNorm}
            className={`mobile-chairside-norm-btn ${ws.isNormApplied ? "is-applied" : ""}`}
            data-testid={`${testId}-diary-sheet-norm-btn`}
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={20} className="shrink-0" />
              <span className="text-[14px] font-bold">
                {ws.isNormApplied ? "✓ Норма внесена" : "✓ Соматически здоров / Норма"}
              </span>
            </div>
            <span className="text-[11px] opacity-90 font-medium">1 тап</span>
          </button>

          {/* Passive Non-blocking Allergy Warning (Mandates 8e, 8y) */}
          {Boolean(activePatient?.allergies?.length || consolidatedAllergyChip) && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold"
              data-testid={`${testId}-diary-sheet-allergy-alert`}
            >
              <AlertTriangle size={15} className="shrink-0 text-amber-500" />
              <span>
                Аллергии: {consolidatedAllergyChip || (Array.isArray(activePatient?.allergies) ? activePatient.allergies.join(", ") : String(activePatient?.allergies || "Отягощен"))}
              </span>
            </div>
          )}

          {/* SOAP Grouped Cards */}
          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Жалобы (Subjective)</div>
            <textarea
              value={visitNoteForm?.complaint || ""}
              onChange={(e) => updateVisitNoteField("complaint", e.target.value)}
              placeholder="Жалобы пациента..."
              className="mobile-chairside-textarea"
              rows={2}
              data-testid={`${testId}-diary-sheet-complaint`}
            />
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Анамнез жизни и соматика</div>
            <textarea
              value={visitNoteForm?.anamnesis || ""}
              onChange={(e) => updateVisitNoteField("anamnesis", e.target.value)}
              placeholder="Анамнез, сопутствующие заболевания..."
              className="mobile-chairside-textarea"
              rows={2}
              data-testid={`${testId}-diary-sheet-anamnesis`}
            />
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Объективный статус (Objective)</div>
            <textarea
              value={visitNoteForm?.objectiveStatus || ""}
              onChange={(e) => updateVisitNoteField("objectiveStatus", e.target.value)}
              placeholder="Данные осмотра полости рта..."
              className="mobile-chairside-textarea"
              rows={2}
              data-testid={`${testId}-diary-sheet-objective`}
            />
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Диагноз (Assessment)</div>
            <input
              type="text"
              value={visitNoteForm?.diagnosis || ""}
              onChange={(e) => updateVisitNoteField("diagnosis", e.target.value)}
              placeholder="Диагноз МКБ-10..."
              className="w-full text-sm font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] px-3 py-2 text-[var(--ink)]"
              data-testid={`${testId}-diary-sheet-diagnosis`}
            />
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Лечение и протокол (Plan)</div>
            <textarea
              value={visitNoteForm?.treatmentPlan || ""}
              onChange={(e) => updateVisitNoteField("treatmentPlan", e.target.value)}
              placeholder="Проведённое лечение и манипуляции..."
              className="mobile-chairside-textarea"
              rows={3}
              data-testid={`${testId}-diary-sheet-treatment`}
            />
          </div>

          <div className="mobile-chairside-grouped-card">
            <div className="mobile-chairside-card-title">Рекомендации и назначения</div>
            <textarea
              value={visitNoteForm?.recommendations || ""}
              onChange={(e) => updateVisitNoteField("recommendations", e.target.value)}
              placeholder="Рекомендации пациенту..."
              className="mobile-chairside-textarea"
              rows={2}
              data-testid={`${testId}-diary-sheet-recommendations`}
            />
          </div>
        </div>
      </MobileBottomSheet>

      <ChairsideBottomStickyActions
        currentStep={ws.currentStep} loadedTreatmentPlan={loadedTreatmentPlan} isStageTaken={ws.isStageTaken}
        onPrevStep={ws.handlePrevStep} onNextStep={ws.handleNextStep} onTakeActivePlanStage={ws.handleTakeActivePlanStage} testId={testId}
      />
    </div>
  );
};

export default MobileChairsideVisitWorkspace;
