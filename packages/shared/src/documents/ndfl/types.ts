/**
 * FNS Statutory Medical Tax Deduction Types & DTO Contracts (Layer 0)
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 */

import type {
	FnsPreflightIssue,
	FnsTaxPayload,
	SupportedTaxYear,
} from "../fnsSchema1151156.js";

export type { FnsTaxPayload, SupportedTaxYear };

/** Результат сборки XML и расчета вычета */
export interface FnsNdflXmlResult {
	xmlContent: string;
	fileName: string;
	fileId: string;
	code1Kopecks: number;
	code2Kopecks: number;
	totalKopecks: number;
	code1Rub: number;
	code2Rub: number;
	totalRub: number;
	estimatedTaxRefundRub: number;
	estimatedTaxRefund15Rub: number;
	preflightIssues: FnsPreflightIssue[];
	isValidForSubmission: boolean;
}

/** Параметры нанесения официального штампа УКЭП клиники по ГОСТ Р 7.0.97-2016 */
export interface FnsNdflPrintSigningOptions {
	certificateSerialNumber?: string | undefined;
	certificateSubject?: string | undefined;
	certificateIssuer?: string | undefined;
	validFrom?: string | undefined;
	validTo?: string | undefined;
	signedAt?: string | undefined;
	signatureType?: "ukep" | "unep" | undefined;
}

/** Результат строгой валидации контрольных сумм фискальных чеков */
export interface FnsReceiptsChecksumValidationResult {
	isValid: boolean;
	totalReceiptsCount: number;
	code1ReceiptsCount: number;
	code2ReceiptsCount: number;
	calculatedCode1Kopecks: number;
	calculatedCode2Kopecks: number;
	calculatedTotalKopecks: number;
	declaredCode1Kopecks?: number | undefined;
	declaredCode2Kopecks?: number | undefined;
	declaredTotalKopecks?: number | undefined;
	code1DiscrepancyKopecks: number;
	code2DiscrepancyKopecks: number;
	totalDiscrepancyKopecks: number;
	errors: string[];
	warnings: string[];
}
