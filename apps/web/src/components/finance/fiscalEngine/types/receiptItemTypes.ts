/**
 * receiptItemTypes.ts — Позиции фискального чека и номенклатурные этапы (Мандат 8b <= 120 строк).
 */

import type {
	Ffd12CorrectionType,
	Ffd12OperationType,
	Ffd12PaymentMethod,
	Ffd12PaymentSubject,
	Ffd12QuantityMeasure,
	Ffd12VatRate,
	Kopecks,
} from "@dental/shared";

export interface Order804nFiscalReceiptItem {
	readonly id: string;
	readonly name: string;
	readonly code804n: string;
	readonly toothNumber?: number | undefined;
	readonly quantity: number;
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: Kopecks;
	readonly discountRub: number;
	readonly discountKopecks: Kopecks;
	readonly grossRub: number;
	readonly grossKopecks: Kopecks;
	readonly amountRub: number;
	readonly amountKopecks: Kopecks;
	readonly vatRate: Ffd12VatRate;
	readonly taxRateKopecks: Kopecks;
	readonly paymentSubject: Ffd12PaymentSubject;
	readonly paymentMethod: Ffd12PaymentMethod;
	readonly quantityMeasure: Ffd12QuantityMeasure;
	readonly taxDeductionCategory: "1" | "2";
	readonly stageKind?: string | undefined;
	readonly stageNumber?: number | undefined;
	readonly phase?: number | undefined;
	readonly stageCategoryTitle?: string | undefined;
	readonly markingCode?: string | undefined;
	readonly isMarkedItem?: boolean | undefined;
	readonly matchedTradeName?: string | undefined;
	readonly isRetail?: boolean | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly priceRub?: number | undefined;
	readonly category?: string | undefined;
	readonly materials?: string | undefined;
}

export const TREATMENT_STAGE_LABELS: Record<string, string> = {
	stage_1_therapy: "Терапевтический этап (санация)",
	stage_2_surgery: "Хирургический этап (имплантация)",
	stage_3_orthopedics: "Ортопедический этап (протезирование)",
	stage_4_orthodontics: "Ортодонтический этап (исправление прикуса)",
	stage_5_hygiene: "Профгигиена и пародонтология",
};

export const FFD12_OPERATION_LABELS: Record<Ffd12OperationType, string> = {
	income: "Приход",
	income_return: "Возврат прихода",
	expense: "Расход",
	expense_return: "Возврат расхода",
};

export const FFD12_CORRECTION_LABELS: Record<Ffd12CorrectionType, string> = {
	self_initiated: "Самостоятельно",
	by_instruction: "По предписанию налогового органа",
};
