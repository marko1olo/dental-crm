/**
 * apps/web/src/components/finance/modal/payment/splitModules/paymentSplitTypes.ts
 *
 * DENTE Dental CRM — Multi-Tender Split Payment Types & Fiscal Contracts (SSOT).
 * Governed by 54-FZ (FFD 1.2), Mandate 8e (Doctor Autonomy), Mandate 8i (Kopeck Precision).
 */

import type React from "react";
import type { TenderAllocationTarget } from "../../../cashboxOperations.js";
import type { CanonicalTenderType, ValidateTenderParityResult } from "@dental/shared/fiscal";


export type SplitTenderKey =
	| "card"
	| "cash"
	| "sbp"
	| "deposit"
	| "family"
	| "certificate"
	| "bonus"
	| "dms";

export interface SplitAmountsRub {
	readonly card: number;
	readonly cash: number;
	readonly sbp: number;
	readonly deposit: number;
	readonly family: number;
	readonly certificate: number;
	readonly bonus: number;
	readonly dms: number;
}

export interface PaymentSplitViewProps {
	readonly totalDueRub: number;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (v: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (v: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (v: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (v: number) => void;
	readonly splitFamilyRub?: number | undefined;
	readonly setSplitFamilyRub?: ((v: number) => void) | undefined;
	readonly splitCertificateRub: number;
	readonly setSplitCertificateRub: (v: number) => void;
	readonly splitBonusRub: number;
	readonly setSplitBonusRub: (v: number) => void;
	readonly splitDmsRub?: number | undefined;
	readonly setSplitDmsRub?: ((v: number) => void) | undefined;
	readonly availableDmsCoverageRub?: number | undefined;
	readonly dmsGuaranteeLetterNumber?: string | undefined;
	readonly dmsInsurerName?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly applySplitRemainder: (target: TenderAllocationTarget) => void;
	readonly totalAllocatedRub: number;
	readonly isBalanced: boolean;
	readonly sbpStatus: "pending" | "paid";
	readonly sbpQrData: { payload: { sumFormattedRu?: string }; svg: string } | null;
	readonly sbpCheckMessage: string | null;
	readonly handleCheckSbpStatus: (manual?: boolean) => void;
	readonly handleConfirmSbpManual: () => void;
	readonly isCheckingSbp: boolean;
}

export interface PaymentMethodRowProps {
	readonly label: string;
	readonly icon: React.ComponentType<{ size?: number; className?: string }>;
	readonly valueRub: number;
	readonly onChangeRub: (v: number) => void;
	readonly placeholder?: string;
	readonly testId: string;
	readonly badgeText?: string | undefined;
	readonly maxRub?: number | undefined;
	readonly isAccent?: boolean | undefined;
	readonly subLabel?: string | undefined;
	readonly onFillRemainder?: (() => void) | undefined;
}

export interface PaymentFiscalSummaryCardProps {
	readonly totalDueRub: number;
	readonly totalAllocatedRub: number;
	readonly isBalanced: boolean;
	readonly onAutoAlignRemainder: () => void;
	readonly splitCashRub: number;
	readonly splitCardRub: number;
	readonly splitSbpRub: number;
	readonly splitDepositRub: number;
	readonly splitFamilyRub: number;
	readonly splitDmsRub: number;
	readonly splitCertificateRub: number;
	readonly splitBonusRub: number;
}

export interface PaymentSplitPresetsToolbarProps {
	readonly totalDueRub: number;
	readonly availableDmsCoverageRub?: number | undefined;
	readonly patientDepositRub: number;
	readonly patientFamilyBalanceRub: number;
	readonly onAutoAlignRemainder: () => void;
	readonly applySplitRemainder: (target: TenderAllocationTarget) => void;
	readonly setSplitDmsRub?: ((v: number) => void) | undefined;
	readonly setSplitCardRub: (v: number) => void;
	readonly setSplitCashRub: (v: number) => void;
	readonly setSplitDepositRub: (v: number) => void;
	readonly setSplitSbpRub: (v: number) => void;
	readonly setSplitCertificateRub: (v: number) => void;
	readonly setSplitBonusRub: (v: number) => void;
}

export interface PaymentSplitSbpQrPanelProps {
	readonly splitSbpRub: number;
	readonly sbpStatus: "pending" | "paid";
	readonly sbpQrData: { payload: { sumFormattedRu?: string }; svg: string } | null;
	readonly sbpCheckMessage: string | null;
	readonly isCheckingSbp: boolean;
	readonly onCheckSbpStatus: (manual?: boolean) => void;
	readonly onConfirmSbpManual: () => void;
}
