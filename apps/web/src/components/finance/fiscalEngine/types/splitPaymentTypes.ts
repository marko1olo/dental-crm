/**
 * splitPaymentTypes.ts — Распределение смешанной оплаты (Мандат 8b <= 120 строк).
 */

import type { Kopecks } from "@dental/shared";

export interface SplitPaymentInput {
	readonly cashRub?: number | undefined;
	readonly receivedCashRub?: number | undefined;
	readonly cardRub?: number | undefined;
	readonly sbpRub?: number | undefined;
	readonly depositRub?: number | undefined;
	readonly familyWalletRub?: number | undefined;
	readonly certificateRub?: number | undefined;
	readonly insuranceRub?: number | undefined;
	readonly guaranteeLetterNumber?: string | undefined;
}

export interface SplitPaymentAllocation {
	readonly cashRub: number;
	readonly cashKopecks: Kopecks;
	readonly receivedCashRub: number;
	readonly receivedCashKopecks: Kopecks;
	readonly changeRub: number;
	readonly changeKopecks: Kopecks;
	readonly isCashShortage: boolean;
	readonly cashShortageRub: number;
	readonly cardRub: number;
	readonly cardKopecks: Kopecks;
	readonly sbpRub: number;
	readonly sbpKopecks: Kopecks;
	readonly depositRub: number;
	readonly depositKopecks: Kopecks;
	readonly advanceOffsetRub: number;
	readonly advanceOffsetKopecks: Kopecks;
	readonly familyWalletRub: number;
	readonly familyWalletKopecks: Kopecks;
	readonly certificateRub: number;
	readonly certificateKopecks: Kopecks;
	readonly insuranceRub: number;
	readonly insuranceKopecks: Kopecks;
	readonly patientCoPayRub: number;
	readonly patientCoPayKopecks: Kopecks;
	readonly totalRub: number;
	readonly totalKopecks: Kopecks;
	readonly allocatedKopecks: Kopecks;
	readonly remainingKopecks: Kopecks;
	readonly isFullyAllocated: boolean;
	readonly isOverallocated: boolean;
}
