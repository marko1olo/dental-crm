/**
 * Patient Personal Portal - Modal Types & Contracts
 * (LAYER 0: TYPES & CONTRACTS - ZERO RUNTIME DEPENDENCIES)
 */

import type React from "react";
import type {
	DentalHealthIndexResult,
	PatientAppointment,
	PatientCabinetSummary,
	PatientDentalPassport,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
	PatientStatutoryConsent,
	PatientTaxDeductionCalculation,
	PatientTreatmentPlan,
	SbpBankMember,
	SbpQrPayload,
	TreatmentPlanStage,
} from "../patientCabinetEngine";
import type { PatientCareMemo } from "../patientCareInstructionsEngine";
import type { TaxDeductionPaymentItem } from "../../../finance/taxDeductionEngine";

export type PatientCabinetTab =
	| "overview"
	| "invoices"
	| "plans"
	| "treatment_plan"
	| "treatmentPlans"
	| "documents"
	| "appointments"
	| "care"
	| "passport"
	| "family";

export function normalizePatientTab(tab?: string): PatientCabinetTab {
	if (!tab) return "overview";
	if (tab === "treatment_plan" || tab === "treatmentPlans" || tab === "plan") return "plans";
	return (tab as PatientCabinetTab) || "overview";
}

export interface PatientCabinetModalProps {
	readonly isOpen?: boolean | undefined;
	readonly onClose?: (() => void) | undefined;
	readonly initialData?: PatientPersonalCabinetData | undefined;
	readonly initialTab?: PatientCabinetTab | undefined;
	readonly initialSigningConsent?: PatientStatutoryConsent | null | undefined;
	readonly initialConsentSignMode?: ("sms_otp" | "cabinet_pep") | undefined;
	readonly token?: string | undefined;
	readonly onInvoicePaid?: ((invoice: PatientInvoiceItem) => void) | undefined;
	readonly onConsentSigned?: ((consent: PatientStatutoryConsent) => void) | undefined;
	readonly onAppointmentBooked?: ((appointmentReq: { specialty: string; preferredDate: string; note: string }) => void) | undefined;
}

export interface AvailableDoctorItem {
	id: string;
	fullName: string;
	specialties?: string[] | null;
}

export interface NavTabItem {
	readonly tab: PatientCabinetTab;
	readonly label: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
	readonly isMatch?: (t: string) => boolean;
	readonly count?: number;
	readonly countBg?: string;
}

export type {
	DentalHealthIndexResult,
	PatientAppointment,
	PatientCabinetSummary,
	PatientDentalPassport,
	PatientInvoiceItem,
	PatientPersonalCabinetData,
	PatientStatutoryConsent,
	PatientTaxDeductionCalculation,
	PatientTreatmentPlan,
	SbpBankMember,
	SbpQrPayload,
	TreatmentPlanStage,
	PatientCareMemo,
	TaxDeductionPaymentItem,
};
