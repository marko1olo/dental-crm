/**
 * TreatmentPlanWizard.tsx — Facade re-exporting canonical TreatmentPlanWizard from treatment-plans module.
 * Mandate 8s: Single Source of Truth / Non-divergent Facade.
 */
export * from "../treatment-plans/TreatmentPlanWizard";
export { TreatmentPlanWizard, PlanWizardModal, TreatmentPlanWizard as default } from "../treatment-plans/TreatmentPlanWizard";
