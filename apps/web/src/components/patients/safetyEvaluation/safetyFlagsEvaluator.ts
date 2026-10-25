import { CLINICAL_SAFETY_CATALOG } from "../clinicalSafetyCatalogData";
import {
	isNegativeAllergyStatement,
	parseSafetyProfileFromText,
	type ClinicalSafetySeverity,
	type PatientClinicalSafetyProfile,
} from "../safetyMath";
import { formatSafetyProfileToDiaryText } from "./safetyDiaryFormatter";
import type { ClinicalSafetyFlag, PatientSafetyEvaluationResult } from "./types";

export function evaluatePatientSafetyFlags(
	input?: Partial<PatientClinicalSafetyProfile> | string | null | undefined,
): PatientSafetyEvaluationResult {
	const profile: Partial<PatientClinicalSafetyProfile> =
		typeof input === "string" ? parseSafetyProfileFromText(input) : (input && typeof input === "object" ? input : {});

	const activeFlags: ClinicalSafetyFlag[] = [];
	const forbiddenSet = new Set<string>();
	const precautionsSet = new Set<string>();
	const anestheticRecsSet = new Set<string>();

	const addCatalog = (id: string, customDetails?: string) => {
		const item = CLINICAL_SAFETY_CATALOG.find((x) => x.id === id);
		if (!item) return;
		activeFlags.push({
			id: item.id,
			category: item.category,
			severity: item.severity,
			shortBadge: item.shortBadge,
			titleRu: item.titleRu,
			description: customDetails ? `${item.fullDescription} Примечание: ${customDetails}` : item.fullDescription,
			forbiddenProcedures: item.forbiddenProcedures,
			mandatoryPrecautions: item.mandatoryPrecautions,
			recommendedAnesthesiaNotes: item.recommendedAnesthesiaNotes ?? undefined,
			source: "structured_profile",
		});
		item.forbiddenProcedures.forEach((p) => forbiddenSet.add(p));
		item.mandatoryPrecautions.forEach((m) => precautionsSet.add(m));
		if (item.recommendedAnesthesiaNotes) anestheticRecsSet.add(item.recommendedAnesthesiaNotes);
	};

	if (profile.hasArticaineAllergy) addCatalog("allergy_articaine");
	if (profile.hasLidocaineAllergy) addCatalog("allergy_lidocaine");
	if (profile.hasMepivacaineAllergy) addCatalog("allergy_mepivacaine");
	if (profile.hasEsterAnestheticsAllergy) addCatalog("allergy_ester_anesthetics");
	if (profile.hasSulfiteAllergy) addCatalog("allergy_sulfites");
	if (profile.hasPacemakerExs) addCatalog("pacemaker_exs");
	if (profile.takesBisphosphonates) addCatalog("bisphosphonates_mronj", profile.bisphosphonateName);
	if (profile.takesAnticoagulants) {
		const extra = profile.anticoagulantName ? `Препарат: ${profile.anticoagulantName}${profile.lastInrValue !== undefined ? `, МНО: ${profile.lastInrValue}` : ""}` : undefined;
		addCatalog("anticoagulants_bleeding", extra);
	}
	if (profile.pregnancyTrimester === "trimester_1") addCatalog("pregnancy_trimester_1");
	else if (profile.pregnancyTrimester === "trimester_2") addCatalog("pregnancy_trimester_2");
	else if (profile.pregnancyTrimester === "trimester_3") addCatalog("pregnancy_trimester_3");

	if (profile.hasHypertension || profile.hasCardiovascularDisease || profile.hasIhd || profile.hasArrhythmia) addCatalog("hypertension_cvd");
	if (profile.hasSevereHypertensionStage3) addCatalog("severe_hypertension_stage_3");
	if (profile.hasPheochromocytoma) addCatalog("pheochromocytoma_catecholamines");
	if (profile.hasThyrotoxicosis) addCatalog("thyrotoxicosis_hyperthyroidism");
	if (profile.takesBetaBlockers) addCatalog("beta_blockers_interaction");
	if (profile.hasDiabetesMellitus) addCatalog("diabetes_mellitus", profile.diabetesType ? `Тип: ${profile.diabetesType}` : undefined);
	if (profile.hasBronchialAsthma) addCatalog("bronchial_asthma");
	if (profile.hasEpilepsy) addCatalog("epilepsy_seizures");
	if (profile.hasHepatitis || profile.hasHiv) addCatalog("hepatitis_hiv_infection");
	if (profile.hasPenicillinAllergy) addCatalog("allergy_penicillin");
	if (profile.hasLatexAllergy) addCatalog("allergy_latex");
	if (profile.hasNsaidAllergy) addCatalog("allergy_nsaid");
	if (profile.hasIodineAllergy) addCatalog("allergy_iodine");

	if (profile.hasAnaphylaxisHistory) {
		activeFlags.push({
			id: "anaphylaxis_history", category: "anesthesia_allergy", severity: "critical", shortBadge: "[СТОП] АНАФИЛАКСИЯ В АНАМНЕЗЕ",
			titleRu: "Отягощенный аллергоанамнез: анафилактический шок", description: "У пациента в анамнезе системные аллергические реакции. Готовность антишок-укладки.",
			forbiddenProcedures: ["Применение аллергенов и полипрагмазия"], mandatoryPrecautions: ["Маркировка медкарты", "Проверка аптечки «Антишок»"], source: "structured_profile",
		});
		forbiddenSet.add("Применение аллергенов и полипрагмазия");
		precautionsSet.add("Проверка аптечки «Антишок»");
	}

	const addCustomAllergy = (notes?: string) => {
		if (!notes?.trim() || isNegativeAllergyStatement(notes)) return;
		const raw = notes.trim();
		activeFlags.push({
			id: `custom_allergy_${raw.slice(0, 10)}`, category: "anesthesia_allergy", severity: "critical", shortBadge: `[АЛЛЕРГИЯ] ${raw.toUpperCase()}`,
			titleRu: `Индивидуальная аллергия: ${raw}`, description: `Зарегистрирована аллергия: ${raw}`,
			forbiddenProcedures: [`Препараты с ${raw}`], mandatoryPrecautions: ["Маркировка медкарты", "Выбор альтернативных препаратов"], source: "structured_profile",
		});
		forbiddenSet.add(`Препараты с ${raw}`);
	};
	addCustomAllergy(profile.customAllergyNotes);
	addCustomAllergy(profile.customAllergiesNotes);

	const hasCriticalStopFlags = activeFlags.some((f) => f.severity === "critical");
	const hasHighRiskFlags = activeFlags.some((f) => f.severity === "high");
	let maxSeverity: ClinicalSafetySeverity = "none";
	if (hasCriticalStopFlags) maxSeverity = "critical";
	else if (hasHighRiskFlags) maxSeverity = "high";
	else if (activeFlags.some((f) => f.severity === "moderate")) maxSeverity = "moderate";
	else if (activeFlags.length > 0) maxSeverity = "info";

	return {
		hasCriticalStopFlags, hasHighRiskFlags, totalAlertCount: activeFlags.length, maxSeverity, activeFlags,
		forbiddenProcedures: Array.from(forbiddenSet), mandatoryPrecautions: Array.from(precautionsSet),
		anestheticRecommendations: Array.from(anestheticRecsSet),
		formattedSummaryLine: activeFlags.length > 0 ? activeFlags.map((f) => f.shortBadge).join(" ") : "Анамнез не отягощен. Критических стоп-факторов не выявлено.",
		formattedDiarySection: formatSafetyProfileToDiaryText(profile),
	};
}
