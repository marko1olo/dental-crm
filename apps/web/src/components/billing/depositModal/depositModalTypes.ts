/**
 * apps/web/src/components/billing/depositModal/depositModalTypes.ts
 *
 * Types for DepositTopupModal.
 * Strictly <= 120 lines per Mandate 8b.
 */

import type { DepositTopupPayload, ReceiptDeliveryMode } from "@dental/shared";

export type DepositPaymentMethod = "card" | "sbp" | "cash" | "bank_transfer";

export interface DepositTopupModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patientId: string;
	readonly patientName: string;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly currentDepositRub?: number | undefined;
	readonly isFamilyShared?: boolean | undefined;
	readonly familyGroupId?: string | undefined;
	readonly sponsorPatientId?: string | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicLegalName?: string | undefined;
	readonly onSuccess?: ((payload: DepositTopupPayload) => void) | undefined;
}
