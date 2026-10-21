import type { Kopecks } from "@dental/shared";
import type { StagePaymentKind, StagePaymentStatus } from "../stagePaymentPresets.js";

export interface TreatmentStageItem {
	readonly id: string;
	readonly name: string;
	readonly code804n?: string;
	readonly toothNumber?: number;
	readonly quantity: number;
	readonly priceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly labCostKopecks?: Kopecks;
	readonly materialCostKopecks?: Kopecks;
}

export interface MilestoneStage {
	readonly id: string;
	readonly stageNumber: number;
	readonly kind: StagePaymentKind;
	readonly title: string;
	readonly status: StagePaymentStatus;
	readonly totalKopecks: Kopecks;
	readonly advanceRequiredKopecks: Kopecks;
	readonly advancePaidKopecks: Kopecks;
	readonly escrowLockedKopecks: Kopecks;
	readonly completionPaidKopecks: Kopecks;
	readonly actSignedAt?: string;
	readonly actNumber?: string;
	readonly directExpensesKopecks: {
		readonly labKopecks: Kopecks;
		readonly materialsKopecks: Kopecks;
		readonly otherKopecks: Kopecks;
	};
	readonly items: readonly TreatmentStageItem[];
	readonly notes?: string;
}

export interface PatientDepositWallet {
	readonly patientId: string;
	readonly availableDepositKopecks: Kopecks;
	readonly lockedEscrowKopecks: Kopecks;
	readonly totalBalanceKopecks: Kopecks;
}

export interface StagePaymentTotals {
	readonly grandTotalKopecks: Kopecks;
	readonly totalAdvanceRequiredKopecks: Kopecks;
	readonly totalAdvancePaidKopecks: Kopecks;
	readonly totalEscrowLockedKopecks: Kopecks;
	readonly totalActCompletedKopecks: Kopecks;
	readonly totalCompletionPaidKopecks: Kopecks;
	readonly totalPaidKopecks: Kopecks;
	readonly remainingDueKopecks: Kopecks;
	readonly progressPercent: number;
}

export interface TerminationExpenseItem {
	readonly title: string;
	readonly category: "lab_cadcam" | "implant_hardware" | "sterilization_materials" | "diagnostic";
	readonly amountKopecks: Kopecks;
	readonly justificationRu: string;
}

export interface TerminationRefundCalculation {
	readonly totalPaidByPatientKopecks: Kopecks;
	readonly completedActsTotalKopecks: Kopecks;
	readonly uncompletedAdvanceKopecks: Kopecks;
	readonly actualClinicExpensesKopecks: Kopecks;
	readonly itemizedExpenses: readonly TerminationExpenseItem[];
	readonly refundableToPatientKopecks: Kopecks;
	readonly clinicRetentionKopecks: Kopecks;
	readonly legalRationaleRu: string;
}

export interface FiscalReceiptItem {
	readonly name: string;
	readonly priceKopecks: Kopecks;
	readonly quantity: number;
	readonly totalKopecks: Kopecks;
	readonly fiscalTag1212: string; // 10: Платеж/Аванс, 4: Услуга
	readonly fiscalTag1214: string; // 1: Предоплата 100%, 2: Предоплата частичная, 4: Полный расчет
}

export interface StageFiscalReceipt54Fz {
	readonly receiptId: string;
	readonly timestamp: string;
	readonly patientName: string;
	readonly clinicInn: string;
	readonly clinicName: string;
	readonly stageTitle: string;
	readonly stageKind: StagePaymentKind;
	readonly calculationSign: "ПРЕДОПЛАТА 100%" | "ПРЕДОПЛАТА" | "ПОЛНЫЙ РАСЧЕТ";
	readonly taxationSystem: "УСН Доходы" | "УСН Доходы-Расходы" | "ОСНО";
	readonly vatRate: string;
	readonly totalAmountKopecks: Kopecks;
	readonly paymentMethod: "CASH" | "BANK_CARD" | "PATIENT_DEPOSIT" | "SBP_QR";
	readonly items: readonly FiscalReceiptItem[];
	readonly qrPayload: string;
	readonly fnNumber: string;
	readonly fdNumber: string;
	readonly fpd: string;
}
