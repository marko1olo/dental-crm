/**
 * shiftCloseTypes.ts — Структура Z-отчета и купюрного расклада закрытия смены (Мандат 8ap, Мандат 8b <= 120 строк).
 */

import type { Kopecks } from "@dental/shared";

export interface DenominationsBreakdown {
	readonly b5000: number;
	readonly b2000: number;
	readonly b1000: number;
	readonly b500: number;
	readonly b200: number;
	readonly b100: number;
	readonly b50: number;
	readonly c10: number;
	readonly c5: number;
	readonly c2: number;
	readonly c1: number;
	readonly coinsFractionalRub: number;
}

export const EMPTY_DENOMINATIONS: DenominationsBreakdown = {
	b5000: 0,
	b2000: 0,
	b1000: 0,
	b500: 0,
	b200: 0,
	b100: 0,
	b50: 0,
	c10: 0,
	c5: 0,
	c2: 0,
	c1: 0,
	coinsFractionalRub: 0,
};

export interface ShiftCloseZReportResult {
	readonly reportNumber: string;
	readonly shiftNumber: number;
	readonly openDateIso: string;
	readonly closeDateIso: string;
	readonly closeDateRu: string;
	readonly clinicLegalName: string;
	readonly clinicInn: string;
	readonly clinicKpp?: string | undefined;
	readonly clinicAddress: string;
	readonly cashierFullName: string;
	readonly cashierInn?: string | undefined;
	readonly kktRegNumber: string;
	readonly kktSerialNumber: string;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: string;
	readonly fiscalSign: string;
	readonly ofdName: string;
	readonly ofdUrl: string;

	// Counters by Operation (ФФД 1.2 Теги 1054, 1081, 1031, 1215)
	readonly incomeCount: number;
	readonly incomeTotalRub: number;
	readonly incomeTotalKopecks: Kopecks;
	readonly incomeCashRub: number;
	readonly incomeCashKopecks: Kopecks;
	readonly incomeCardRub: number;
	readonly incomeCardKopecks: Kopecks;
	readonly incomeSbpRub: number;
	readonly incomeSbpKopecks: Kopecks;
	readonly incomeAdvanceOffsetRub: number;
	readonly incomeAdvanceOffsetKopecks: Kopecks;

	readonly incomeReturnCount: number;
	readonly incomeReturnTotalRub: number;
	readonly incomeReturnTotalKopecks: Kopecks;
	readonly incomeReturnCashRub: number;
	readonly incomeReturnCashKopecks: Kopecks;
	readonly incomeReturnCardRub: number;
	readonly incomeReturnCardKopecks: Kopecks;

	readonly correctionCount: number;
	readonly correctionTotalRub: number;

	readonly totalRevenueRub: number;
	readonly totalRevenueKopecks: Kopecks;

	// Cash drawer & diagnostics
	readonly cashInDrawerCalculatedRub: number;
	readonly unprintedDocumentsCount: number;
	readonly isShiftExpired24h: boolean;
	readonly fnResourceDaysRemaining: number;
}

// Семантический алиас обратной совместимости (Мандат 8ap)
export type ShiftCloseZReport54FzResult = ShiftCloseZReportResult;
