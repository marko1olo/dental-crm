import { kopecksToRub } from "@dental/shared";
import { isNegativeAllergyStatement } from "../../utils/somaticNorm";

export type PatientSentimentType = "loyal_vip" | "cancellation_risk" | "strict_ids_required" | "standard";

export interface PatientSentimentInfo {
	type: PatientSentimentType;
	label: string;
	shortLabel: string;
	badgeEmoji: string;
	colorTheme: "emerald" | "amber" | "rose" | "slate";
	description: string;
	clinicalDirective: string;
	calculatedLtvRub: number;
	complianceScorePercent: number;
	riskFactors: string[];
}

export function computePatientSentiment(
	// biome-ignore lint/suspicious/noExplicitAny: flexible patient record
	patient: any,
	overrides?: { sentiment?: PatientSentimentType | null | undefined; ltvRub?: number | null | undefined; complianceScore?: number | null | undefined } | undefined,
): PatientSentimentInfo {
	if (!patient && !overrides?.sentiment) {
		return {
			type: "standard",
			label: "Стандартный профиль",
			shortLabel: "Стандарт",
			badgeEmoji: "",
			colorTheme: "slate",
			description: "Стандартный профиль обслуживания пациента.",
			clinicalDirective: "Стандартный клинический протокол приёма и оформления медицинской карты.",
			calculatedLtvRub: overrides?.ltvRub ?? 0,
			complianceScorePercent: overrides?.complianceScore ?? 100,
			riskFactors: [],
		};
	}

	const forcedType = overrides?.sentiment || patient?.sentimentType;
	const ltv = overrides?.ltvRub ?? (
		typeof patient?.totalSpentRub === "number" ? patient.totalSpentRub :
		typeof patient?.ltvRub === "number" ? patient.ltvRub :
		typeof patient?.totalPaidRub === "number" ? patient.totalPaidRub :
		typeof patient?.totalPaidKopecks === "number" ? kopecksToRub(patient.totalPaidKopecks) : 0
	);
	const tier = String(patient?.loyaltyTier || patient?.administrativeProfile?.loyaltyTier || patient?.tier || "").toLowerCase();

	// Mandate 8ao: Расчет строго по нормализованным клиническим полям, ноль парсинга заметок регулярками
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

	const noShows = typeof patient?.noShowsCount === "number" ? patient.noShowsCount : typeof patient?.history?.noShows === "number" ? patient.history.noShows : 0;
	const cancellations = typeof patient?.cancellationsCount === "number" ? patient.cancellationsCount : typeof patient?.history?.cancellations === "number" ? patient.history.cancellations : 0;
	const hasCancelRisk = (typeof patient?.noShowProbability === "number" && patient.noShowProbability > 0.3) || noShows >= 2 || (noShows >= 1 && cancellations >= 2);

	let type: PatientSentimentType = "standard";
	if (forcedType) type = forcedType;
	else if (hasSevereAllergies || patient?.requiresStrictInformedConsent) type = "strict_ids_required";
	else if (hasCancelRisk) type = "cancellation_risk";
	else if (tier === "platinum" || tier === "gold" || tier === "vip" || ltv >= 100000) type = "loyal_vip";

	if (type === "loyal_vip") {
		return {
			type: "loyal_vip",
			label: "Лояльный профиль / VIP",
			shortLabel: "VIP • Лояльный",
			badgeEmoji: "",
			colorTheme: "emerald",
			description: "Постоянный пациент с высокой лояльностью.",
			clinicalDirective: "Приоритетная запись в удобное время, персональный менеджер куратора.",
			calculatedLtvRub: ltv,
			complianceScorePercent: overrides?.complianceScore ?? 95,
			riskFactors: [],
		};
	}
	if (type === "cancellation_risk") {
		return {
			type: "cancellation_risk",
			label: "Риск неявки (расписание)",
			shortLabel: "Риск неявки",
			badgeEmoji: "",
			colorTheme: "amber",
			description: "Повышенная вероятность пропуска приёма по объективной статистике.",
			clinicalDirective: "Контрольный звонок администратора за 24 ч + SMS-напоминание утром в день приёма.",
			calculatedLtvRub: ltv,
			complianceScorePercent: overrides?.complianceScore ?? 65,
			riskFactors: ["Повышенная вероятность срыва записи по данным расписания"],
		};
	}
	if (type === "strict_ids_required") {
		return {
			type: "strict_ids_required",
			label: "Соматический стоп-фактор (ИДС)",
			shortLabel: "Аллергоанамнез",
			badgeEmoji: "",
			colorTheme: "rose",
			description: "Особое внимание: отягощенный аллергоанамнез.",
			clinicalDirective: "Оформление расширенного согласия на лечение, протоколирование мер безопасности.",
			calculatedLtvRub: ltv,
			complianceScorePercent: overrides?.complianceScore ?? 80,
			riskFactors: ["Отягощенный аллергоанамнез: подбор гипоаллергенной анестезии, обязательное согласие на лечение (ИДС)"],
		};
	}
	return {
		type: "standard",
		label: "Стандартный профиль",
		shortLabel: "Норма",
		badgeEmoji: "",
		colorTheme: "slate",
		description: "Соматически сохранный профиль, норма.",
		clinicalDirective: "Стандартный клинический протокол приёма и оформления медицинской карты.",
		calculatedLtvRub: ltv,
		complianceScorePercent: overrides?.complianceScore ?? 100,
		riskFactors: [],
	};
}
