/**
 * patientSentimentComputation.ts — Расчет профиля надежности и лояльности пациента (Мандат 8ap).
 * Тотальный запрет псевдонаучного regex-скоринга заметок: расчет опирается строго на
 * нормализованные реляционные поля БД (визиты, неявки no_show_count, чистые оплаты totalPaidKopecks).
 */

import { kopecksToRub } from "@dental/shared";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";
import {
	getSentimentDescriptor,
	type PatientSentimentInfo,
	type PatientSentimentType,
} from "./sentimentConfig";

export type { PatientSentimentInfo, PatientSentimentType };

export interface PatientSentimentSubject {
	readonly id?: string | null | undefined;
	readonly fullName?: string | null | undefined;
	readonly sentimentType?: PatientSentimentType | null | undefined;
	readonly totalSpentRub?: number | null | undefined;
	readonly ltvRub?: number | null | undefined;
	readonly totalPaidRub?: number | null | undefined;
	readonly totalPaidKopecks?: number | null | undefined;
	readonly total_paid_kopecks?: number | null | undefined;
	readonly loyaltyTier?: string | null | undefined;
	readonly tier?: string | null | undefined;
	readonly administrativeProfile?: {
		readonly loyaltyTier?: string | null | undefined;
		readonly taxpayerInn?: string | null | undefined;
		readonly snils?: string | null | undefined;
		readonly identityDocument?: string | null | undefined;
		readonly [key: string]: unknown;
	} | null | undefined;
	readonly allergies?: string | readonly string[] | null | undefined;
	readonly allergiesList?: string | readonly string[] | null | undefined;
	readonly clinicalSafety?: {
		readonly allergies?: string | readonly string[] | null | undefined;
		readonly [key: string]: unknown;
	} | null | undefined;
	readonly clinicalSafetyProfile?: {
		readonly hasCriticalStopFlags?: boolean | null | undefined;
		readonly activeFlags?: readonly unknown[] | null | undefined;
		readonly [key: string]: unknown;
	} | null | undefined;
	readonly hasSevereAllergies?: boolean | null | undefined;
	readonly requiresStrictInformedConsent?: boolean | null | undefined;
	readonly no_show_count?: number | null | undefined;
	readonly noShowsCount?: number | null | undefined;
	readonly cancellationsCount?: number | null | undefined;
	readonly completedVisitsCount?: number | null | undefined;
	readonly completed_visits_count?: number | null | undefined;
	readonly visitsCount?: number | null | undefined;
	readonly history?: {
		readonly noShows?: number | null | undefined;
		readonly cancellations?: number | null | undefined;
		readonly attended?: number | null | undefined;
		readonly [key: string]: unknown;
	} | null | undefined;
	readonly noShowProbability?: number | null | undefined;
	readonly [key: string]: unknown;
}

export function computePatientSentiment(
	patient?: PatientSentimentSubject | null | undefined,
	overrides?: { sentiment?: PatientSentimentType | null | undefined; ltvRub?: number | null | undefined; complianceScore?: number | null | undefined } | undefined,
): PatientSentimentInfo {
	if (!patient && !overrides?.sentiment) {
		return getSentimentDescriptor("standard", overrides?.ltvRub ?? 0, overrides?.complianceScore ?? 100);
	}

	const forcedType = overrides?.sentiment || patient?.sentimentType;
	const ltv = overrides?.ltvRub ?? (
		typeof patient?.totalSpentRub === "number" ? patient.totalSpentRub :
		typeof patient?.ltvRub === "number" ? patient.ltvRub :
		typeof patient?.totalPaidRub === "number" ? patient.totalPaidRub :
		typeof patient?.totalPaidKopecks === "number" ? kopecksToRub(patient.totalPaidKopecks) :
		typeof patient?.total_paid_kopecks === "number" ? kopecksToRub(patient.total_paid_kopecks) : 0
	);
	const tier = String(patient?.loyaltyTier || patient?.administrativeProfile?.loyaltyTier || patient?.tier || "").toLowerCase();

	const rawAllergies = patient?.allergies ?? patient?.clinicalSafety?.allergies ?? patient?.allergiesList;
	const hasNormalizedAllergies = Array.isArray(rawAllergies)
		? rawAllergies.length > 0
		: typeof rawAllergies === "string" && rawAllergies.trim().length > 0 && !isNegativeAllergyStatement(rawAllergies);

	const hasSafetyStopFlags = Boolean(
		patient?.hasSevereAllergies ||
		patient?.requiresStrictInformedConsent ||
		patient?.clinicalSafetyProfile?.hasCriticalStopFlags ||
		(Array.isArray(patient?.clinicalSafetyProfile?.activeFlags) && patient.clinicalSafetyProfile.activeFlags.length > 0),
	);
	const hasSevereAllergies = hasNormalizedAllergies || hasSafetyStopFlags;

	// Нормализованные счетчики неявок и отмен (Мандат 8ap)
	const noShows = typeof patient?.no_show_count === "number"
		? patient.no_show_count
		: typeof patient?.noShowsCount === "number"
			? patient.noShowsCount
			: typeof patient?.history?.noShows === "number"
				? patient.history.noShows
				: 0;

	const cancellations = typeof patient?.cancellationsCount === "number"
		? patient.cancellationsCount
		: typeof patient?.history?.cancellations === "number"
			? patient.history.cancellations
			: 0;

	const completedVisits = typeof patient?.completedVisitsCount === "number"
		? patient.completedVisitsCount
		: typeof patient?.completed_visits_count === "number"
			? patient.completed_visits_count
			: typeof patient?.visitsCount === "number"
				? patient.visitsCount
				: typeof patient?.history?.attended === "number"
					? patient.history.attended
					: 0;

	const hasCancelRisk = (typeof patient?.noShowProbability === "number" && patient.noShowProbability > 0.3) ||
		noShows >= 2 ||
		(noShows >= 1 && cancellations >= 2);

	let type: PatientSentimentType = "standard";
	if (forcedType) {
		type = forcedType;
	} else if (hasSevereAllergies || patient?.requiresStrictInformedConsent) {
		type = "strict_ids_required";
	} else if (hasCancelRisk) {
		type = "cancellation_risk";
	} else if (tier === "platinum" || tier === "gold" || tier === "vip" || ltv >= 100000 || (completedVisits >= 10 && noShows === 0)) {
		type = "loyal_vip";
	}

	return getSentimentDescriptor(type, ltv, overrides?.complianceScore);
}
