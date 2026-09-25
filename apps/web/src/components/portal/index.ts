/**
 * Patient Portal Master Barrel Export
 * (DOMAIN: PORTAL & PATIENT CABINET)
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Unifies patient cabinet, self-checkin, timeline, budget signing,
 * and patient-portal webapp views into single canonical master entry point.
 */

export * from "./patientCabinet";
export * from "./selfCheckin";
export { PatientCabinetModal as PatientPortalModal } from "./patientCabinet";
export * from "./patientPortalEngine";
export * from "./patientPortalPresets";
export * from "./patientPortalTypes";
export { generateQrCodeSvg, generateSha256 } from "./patientCabinet";
export * from "./PatientBudgetSignView";
export * from "../booking/BookingConfirmationView";
export * from "./PatientFriendlyOdontogram.js";
export * from "./PatientPlanView.js";
export * from "./PatientPortalTreatmentStageCard.js";
export * from "./patientWebappEngine.js";
export { default } from "./patientCabinet";
