/**
 * apps/web/src/components/billing/installments/installmentsTypes.ts
 *
 * Types for PatientInstallmentsModal components.
 * Strictly <= 120 lines per Mandate 8b.
 */

import type { InstallmentPlan } from "../installmentsEngine.js";

export interface PatientInstallmentsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly initialPlan?: InstallmentPlan | undefined;
	readonly onPlanUpdate?: (plan: InstallmentPlan) => void;
	readonly onOpenBankInstallment?: () => void | undefined;
}

export type InstallmentsSubView = "schedule" | "quick_pay" | "reminder" | "create_preset";
