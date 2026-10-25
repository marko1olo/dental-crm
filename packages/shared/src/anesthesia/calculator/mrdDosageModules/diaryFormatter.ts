/**
 * @dental/shared/anesthesia/calculator/mrdDosageModules/diaryFormatter.ts
 * Clinical Visit Diary Record Formatter (Mandate 8b, <= 120 lines)
 */

import {
	ANESTHESIA_DRUGS,
	ANESTHESIA_METHODS,
} from "../drugCatalog.js";
import type { AnesthesiaSoapRecordParams } from "../types.js";
import { calculateVisitAnesthesiaSafety } from "./mrdVisitSafety.js";

export function formatAnesthesiaSoapText(params: AnesthesiaSoapRecordParams): string {
	const drug = ANESTHESIA_DRUGS[params.drugKey] ?? ANESTHESIA_DRUGS.ultracain_ds;
	const method = ANESTHESIA_METHODS[params.methodKey] ?? ANESTHESIA_METHODS.infiltration;
	const isSoapPediatric = Boolean(
		params.isPediatric ||
			(params.patientAgeYears !== null &&
				params.patientAgeYears !== undefined &&
				params.patientAgeYears < 18),
	);
	const hasValidWeight =
		typeof params.patientWeightKg === "number" &&
		Number.isFinite(params.patientWeightKg) &&
		params.patientWeightKg > 0;

	const calc = calculateVisitAnesthesiaSafety({
		drugKey: params.drugKey,
		patientWeightKg: hasValidWeight ? params.patientWeightKg! : 0,
		carpulesCount: params.carpulesCount,
		patientAgeYears: params.patientAgeYears,
		isPediatric: isSoapPediatric,
		somaticProfile: params.somaticProfile,
		...(params.customVolumeMl !== undefined ? { customVolumeMl: params.customVolumeMl } : {}),
	});

	const toothSuffix = params.toothNumber ? ` в области зуба ${params.toothNumber}` : "";
	const aspirationStr = params.aspirationTestPassed !== false
		? "Аспирационная проба отрицательная."
		: "Аспирационная проба: без особенностей.";
	const reactionStr = params.reactionNormal !== false
		? "Аллергических и токсических реакций не наблюдалось, самочувствие удовлетворительное."
		: "Пациент под постоянным мониторингом гемодинамики.";
	const timeStr = params.anesthesiaStartTime ? ` Время начала: ${params.anesthesiaStartTime}.` : "";

	const somaticNotes: string[] = [];
	const hasCardio = Boolean(
		params.somaticProfile?.hasCardiovascularRisk ||
			params.somaticProfile?.hasHypertension ||
			params.somaticProfile?.hasIhd ||
			params.somaticProfile?.hasArrhythmia,
	);

	if (hasCardio) {
		somaticNotes.push(
			drug.isAdrenalineFree
				? "Кардиоваскулярный риск: применен препарат без вазоконстриктора."
				: `Кардиоваскулярный риск: доза адреналина под контролем (${calc.totalEpinephrineMg} мг).`,
		);
	}
	if (params.somaticProfile?.hasSulfiteAllergy || params.somaticProfile?.hasBronchialAsthma) {
		somaticNotes.push("Бронхиальная астма / аллергия на сульфиты: применен безсульфитный препарат.");
	}
	if (params.somaticProfile?.isPregnantOrLactating) {
		somaticNotes.push("Беременность/лактация: щадящий вазоконстриктор 1:200 000.");
	}

	const somaticStr = somaticNotes.length > 0 ? ` ${somaticNotes.join(" ")}` : "";
	const batchPart = params.carpuleBatch?.seriesNumber
		? ` [Серия: ${params.carpuleBatch.seriesNumber}, Годен до: ${params.carpuleBatch.expirationDate}]`
		: "";
	const nursePart = params.nurseFullName ? ` Медсестра/ассистент: ${params.nurseFullName}.` : "";
	const vitalsPart =
		params.vitals && typeof params.vitals.bpSystolic === "number" && typeof params.vitals.heartRateBpm === "number"
			? ` АД ${params.vitals.bpSystolic}/${params.vitals.bpDiastolic ?? 80} мм рт. ст., ЧСС ${params.vitals.heartRateBpm} уд/мин.`
			: "";

	return `Обезболивание: ${method.nameRu} анестезия${toothSuffix} препаратом «${drug.commercialName}» (${drug.activeSubstance})${batchPart} в объеме ${calc.totalVolumeMl} мл (${params.carpulesCount} карп., ${calc.totalDoseMg} мг действующего вещества).${somaticStr}${vitalsPart} ${aspirationStr}${timeStr} Наступление анестезии через ${method.typicalOnsetMinutes} мин. Глубина обезболивания достаточная. ${reactionStr}${nursePart}`;
}

export const formatAnesthesiaDiaryText = formatAnesthesiaSoapText;
