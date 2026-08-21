/**
 * DENTE Dental CRM — Periodontal Protocol 043/u Generator
 *
 * Provides automatic PSR/CPITN sextant analysis, ICD-10 periodontal
 * diagnosis derivation (AAP/EFP 2018 & МКБ-10), and structured
 * clinical protocol generation for Form 043/u (Форма 043/у).
 */

import {
	type PerioChartSummary,
	type PerioToothRecord,
	type PsrSextantResult,
} from "@dental/shared";
import {
	derivePeriodontalDiagnosis as deriveDiagInternal,
	formatPsrSextantsSummary as formatPsrInternal,
	generateComprehensivePerio043Text,
	type PeriodontalDiagnosisDetail,
} from "./periodontalMath";

export interface PeriodontalDiagnosisResult {
	readonly icd10Code: string;
	readonly diagnosisNameRu: string;
	readonly stageDescriptionRu: string;
	readonly severity: "intact" | "gingivitis" | "mild" | "moderate" | "severe";
	readonly isGeneralized: boolean;
	readonly hasSuppuration: boolean;
}

export function derivePeriodontalDiagnosis(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary | undefined,
): PeriodontalDiagnosisResult {
	return deriveDiagInternal(teeth, summary);
}

export function formatPsrSextantsSummary(psr: Record<string, PsrSextantResult>): string {
	return formatPsrInternal(psr);
}

export function generatePerio043DiaryText(
	teeth: readonly PerioToothRecord[],
	summary?: PerioChartSummary | undefined,
	options?: { readonly doctorName?: string | undefined; readonly customNotes?: string | undefined } | undefined,
): string {
	return generateComprehensivePerio043Text(teeth, summary, options);
}
