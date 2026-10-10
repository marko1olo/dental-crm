/**
 * allergyAndDrugRules.ts — Allergy Cross-Reactivity & Drug Interaction Detectors.
 *
 * Layer 1: Pure Clinical Safety Rules & Drug Interaction Detectors.
 * Mandate 8e: Non-blocking clinical alerts (isBlocking: false always).
 */

import { randomUUID } from "node:crypto";
import type { ChairsideSafetyAlert } from "./types.js";

export const NORM_ALLERGY_MARKERS =
	/(нет|не отягощен|отсутству|без аллерги|отрицает)/i;

/**
 * Checks whether the allergy history contains real active allergies,
 * filtering out standard clinical norm declarations.
 */
export function hasRealAllergies(allergies: string[]): boolean {
	return (
		allergies.length > 0 &&
		allergies.some((a) => a.trim().length > 0 && !NORM_ALLERGY_MARKERS.test(a))
	);
}

/**
 * Evaluates drug interactions, allergy conflicts, and pharmacological cross-reactivity:
 * - Penicillin allergy vs Amoxicillin / Amoxiclav / Augmentin
 * - NSAID allergy vs Ibuprofen / Ketorol / Nimesulide / Aspirin
 * - Local anesthetic allergies (Novocaine, Lidocaine, Articaine)
 * - Latex allergy (gloves & cofferdam)
 */
export function evaluateAllergyAndDrugRules(
	allergies: string[],
	activeServices: string[],
): ChairsideSafetyAlert[] {
	const alerts: ChairsideSafetyAlert[] = [];

	// 1. PENICILLIN ALLERGY CONFLICT
	const isPenicillinAllergic = allergies.some((a) =>
		/(пенициллин|пеницилин|бета-лактам|penicillin|амоксициллин|амоксиклав|аугментин|ампициллин)/i.test(
			a,
		),
	);
	const isPrescribedPenicillin = activeServices.some((s) =>
		/(амоксициллин|амоксиклав|аугментин|пенициллин|флемоксин|amoxicillin|augmentin|amoxiclav|клавуланат)/i.test(
			s,
		),
	);

	if (isPenicillinAllergic && isPrescribedPenicillin) {
		alerts.push({
			id: `alert_drug_${randomUUID()}`,
			severity: "critical",
			alertType: "drug_allergy_conflict",
			title: "Критический конфликт: Аллергия на пенициллин vs Амоксициллин",
			message:
				"Опасность острой аллергической реакции: у пациента аллергия на пенициллиновый ряд, при этом назначен/планируется Амоксициллин/Амоксиклав.",
			detectedAllergen: "Пенициллиновый ряд (бета-лактамы)",
			conflictingItem: "Амоксициллин / Амоксиклав",
			safeAlternative:
				"Клиндамицин 300 мг (по 1 капсуле 3 раза в день, 5-7 дней) или Кларитромицин 500 мг",
			clinicalRationale:
				"Линкозамиды (Клиндамицин) не обладают перекрестной аллергией с бета-лактамами, имеют высокую тропность к костной ткани челюсти и безопасны для пациента.",
			actionRequired:
				"Заменить пенициллиновый антибиотик на Клиндамицин 300 мг",
			isBlocking: false,
		});
	} else if (isPenicillinAllergic) {
		alerts.push({
			id: `alert_penicillin_${randomUUID()}`,
			severity: "warning",
			alertType: "allergy_notice",
			title: "Аллергия на пенициллиновый ряд",
			message:
				"У пациента отягощен аллергоанамнез: аллергия на пенициллины. При необходимости антибиотикопрофилактики назначить Клиндамицин 300 мг.",
			detectedAllergen: "Пенициллин",
			safeAlternative: "Клиндамицин 300 мг",
			clinicalRationale:
				"Безопасная альтернатива первого выбора при аллергии на бета-лактамы.",
			isBlocking: false,
		});
	}

	// 2. NSAID ALLERGY CONFLICT
	const isNsaidAllergic = allergies.some((a) =>
		/(нпвс|нпвп|аспирин|ибупрофен|кеторол|кетанов|нимесулид|диклофенак|найз)/i.test(
			a,
		),
	);
	const isPrescribedNsaid = activeServices.some((s) =>
		/(нпвс|нпвп|аспирин|ибупрофен|кеторол|кетанов|нимесулид|диклофенак|найз|нурофен)/i.test(
			s,
		),
	);

	if (isNsaidAllergic && isPrescribedNsaid) {
		alerts.push({
			id: `alert_nsaid_${randomUUID()}`,
			severity: "critical",
			alertType: "drug_allergy_conflict",
			title: "Лекарственный конфликт: НПВП / Аспирин",
			message:
				"У пациента зафиксирована непереносимость НПВП (риск бронхоспазма/аспириновой астмы), при этом назначен препарат группы НПВП.",
			detectedAllergen: "НПВП / Салицилаты",
			conflictingItem: "Препарат группы НПВП",
			safeAlternative:
				"Парацетамол 500-1000 мг (до 4 г/сутки) или Трамадол при сильном болевом синдроме",
			clinicalRationale:
				"Парацетамол не ингибирует периферический синтез простагландинов и безопасен при аспириновой триаде.",
			isBlocking: false,
		});
	}

	// 3. LOCAL ANESTHETIC ALLERGY
	const isAnestheticAllergic = allergies.some((a) =>
		/(анестези|новокаин|лидокаин|артикаин|ультракаин|убистезин)/i.test(a),
	);
	if (isAnestheticAllergic) {
		alerts.push({
			id: `alert_anesth_${randomUUID()}`,
			severity: "warning",
			alertType: "anesthetic_allergy_warning",
			title: "Аллергия на местные анестетики",
			message:
				"Анамнез отягощен реакциями на анестетики. Требуется предельная осторожность.",
			safeAlternative:
				"Мепивакаин 3% без вазоконстриктора (Скандонест) после аллергопробы или лечение под седацией",
			isBlocking: false,
		});
	}

	// 4. LATEX ALLERGY
	const isLatexAllergic = allergies.some((a) => /(латекс|latex)/i.test(a));
	if (isLatexAllergic) {
		alerts.push({
			id: `alert_latex_${randomUUID()}`,
			severity: "warning",
			alertType: "latex_allergy_warning",
			title: "Аллергия на латекс",
			message:
				"Запрещено использование латексных изделий (перчатки, латексный коффердам).",
			safeAlternative:
				"Безлатексный коффердам (OptraDam / нитриловые платки) и нитриловые смотровые перчатки",
			isBlocking: false,
		});
	}

	return alerts;
}
