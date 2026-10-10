/**
 * somaticGuardRules.ts — Somatic Contraindication Alerts & Physiological Norm Guards.
 *
 * Layer 2: Somatic Guard Rules & Drug Interaction Orchestration.
 * Mandate 8e: Non-blocking clinical alerts (isBlocking: false always).
 */

import { randomUUID } from "node:crypto";
import {
	evaluateAllergyAndDrugRules,
	hasRealAllergies,
} from "./allergyAndDrugRules.js";
import type { ChairsideSafetyAlert, DrugAndSomaticCheckResult } from "./types.js";

export const NORM_SOMATIC_MARKERS =
	/(норма|здоров|без патологи|соматически сохранен|не отягощен)/i;

/**
 * Checks whether somatic history contains active medical conditions,
 * filtering out standard clinical norm declarations.
 */
export function hasRealSomaticHistory(somaticHistory: string[]): boolean {
	return (
		somaticHistory.length > 0 &&
		somaticHistory.some(
			(s) => s.trim().length > 0 && !NORM_SOMATIC_MARKERS.test(s),
		)
	);
}

/**
 * Evaluates somatic history contraindications:
 * - Cardiovascular / Hypertension / CAD
 * - Diabetes mellitus
 * - Anticoagulant therapy / bleeding risk
 */
export function evaluateSomaticGuardRules(
	somaticHistory: string[],
): ChairsideSafetyAlert[] {
	const alerts: ChairsideSafetyAlert[] = [];

	// 1. HYPERTENSION & CARDIO CONFLICTS
	const isHypertensive = somaticHistory.some((s) =>
		/(гипертон|давлен|криз|аритми|ибс|стенокарди|ад\s*>|140\/|160\/)/i.test(s),
	);
	if (isHypertensive) {
		alerts.push({
			id: `alert_cardio_${randomUUID()}`,
			severity: "warning",
			alertType: "somatic_contraindication",
			title: "Гипертоническая болезнь / Кардиориск",
			message:
				"Пациент с артериальной гипертензией / ИБС. Опасность гипертонического криза при адреналиновой нагрузке.",
			safeAlternative:
				"Анестетик с пониженным адреналином (Артикаин 1:200 000) либо Мепивакаин 3% без адреналина (Скандонест). Контроль АД перед инъекцией.",
			clinicalRationale:
				"Стандартный раствор с эпинефрином 1:100 000 может вызвать тахикардию и подъем давления.",
			isBlocking: false,
		});
	}

	// 2. DIABETES
	const isDiabetic = somaticHistory.some((s) =>
		/(диабет|инсулин|гликеми)/i.test(s),
	);
	if (isDiabetic) {
		alerts.push({
			id: `alert_diabetes_${randomUUID()}`,
			severity: "info",
			alertType: "somatic_advisory",
			title: "Сахарный диабет",
			message:
				"Сахарный диабет: сниженный иммунный ответ, риск гипогликемии и затяжного заживления.",
			safeAlternative:
				"Прием в утренние часы после еды и медикаментов. Щадящее препарирование с антисептической защитой.",
			isBlocking: false,
		});
	}

	// 3. ANTICOAGULANTS (BLEEDING RISK)
	const isAnticoagulated = somaticHistory.some((s) =>
		/(варфарин|ксарелто|эликвис|тромбоасс|антикоагулянт|аспирин кардио)/i.test(s),
	);
	if (isAnticoagulated) {
		alerts.push({
			id: `alert_bleeding_${randomUUID()}`,
			severity: "warning",
			alertType: "bleeding_risk",
			title: "Антикоагулянтная терапия (риск кровоточивости)",
			message:
				"Пациент принимает антикоагулянты/антиагреганты: риск гематом и кровоточивости десны.",
			safeAlternative:
				"Аспирационная проба при анестезии, применение гемостатических губок (Альвостаз/Коллапол), плотная изоляция коффердамом.",
			isBlocking: false,
		});
	}

	return alerts;
}

/**
 * Builds the default physiological norm alert banner (Mandate 8e).
 */
export function buildPhysiologicalNormAlert(): ChairsideSafetyAlert {
	return {
		id: `alert_norm_${randomUUID()}`,
		severity: "info",
		alertType: "physiological_norm",
		title: "Физиологическая норма",
		message:
			"Соматически здоров, аллергоанамнез не отягощен. Полная клиническая автономия без ограничений.",
		isBlocking: false,
	};
}

/**
 * Orchestrates comprehensive evaluation of drug interactions, allergies, and somatic history.
 */
export function checkDrugInteractionsAndSomatic(
	allergies: string[],
	somaticHistory: string[],
	activeServices: string[],
): DrugAndSomaticCheckResult {
	const hasActiveSomatic = hasRealSomaticHistory(somaticHistory);
	const hasActiveAllergies = hasRealAllergies(allergies);

	const isPhysiologicalNorm = !hasActiveSomatic && !hasActiveAllergies;
	const somaticStatus = isPhysiologicalNorm
		? "Соматически здоров / норма"
		: somaticHistory.join(", ");
	const allergiesStatus = !hasActiveAllergies
		? "Аллергологический анамнез не отягощен"
		: allergies.join(", ");

	const allergyAlerts = evaluateAllergyAndDrugRules(allergies, activeServices);
	const somaticAlerts = evaluateSomaticGuardRules(somaticHistory);

	const alerts: ChairsideSafetyAlert[] = [...allergyAlerts, ...somaticAlerts];

	if (isPhysiologicalNorm) {
		alerts.push(buildPhysiologicalNormAlert());
	}

	return {
		alerts,
		somaticStatus,
		allergiesStatus,
		isPhysiologicalNorm,
	};
}
