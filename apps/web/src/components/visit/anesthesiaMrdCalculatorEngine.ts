/**
 * anesthesiaMrdCalculatorEngine.ts
 * Unified Maximum Recommended Dose (MRD) Mathematical Engine & Clinical Safety SSOT.
 * Standards: Минздрав РФ, СтАР, AHA/ADA, Malamed.
 */

import { resolveClinicalDefaultWeightKg } from "@dental/shared";
import { MRD_DRUG_CATALOG, EPINEPHRINE_LIMITS_MG } from "./anesthesiaMrdCatalog.js";
import { evaluateSafeDose, evaluateSafetyZone } from "./anesthesiaMrdDoseEval.js";
import type { MrdCalculationParams, MrdCalculationResult } from "./anesthesiaMrdTypes.js";

export * from "./anesthesiaMrdCatalog.js";
export * from "./anesthesiaMrdFormulas.js";
export * from "./anesthesiaCarpulePresets.js";
export * from "./anesthesiaMrdTypes.js";

export function calculateAnesthesiaMrd(params: MrdCalculationParams): MrdCalculationResult {
	const drug = MRD_DRUG_CATALOG[params.drugId] ?? MRD_DRUG_CATALOG.articaine_1_100k;
	const vol = params.carpuleVolumeMl && params.carpuleVolumeMl > 0 ? params.carpuleVolumeMl : drug.defaultVolumeMl;
	const isPedia = Boolean(params.isPediatric || (params.patientAgeYears != null && params.patientAgeYears < 18) || (typeof params.patientWeightKg === "number" && params.patientWeightKg < 40));
	const weight = resolveClinicalDefaultWeightKg(params.patientWeightKg, params.patientAgeYears, isPedia);
	const carp = Math.max(0, Number.isFinite(params.carpulesCount) ? params.carpulesCount! : 1);

	const mgActive = Math.round(vol * drug.mgPerMlActive * 100) / 100;
	const mgEpi = Math.round(vol * drug.epinephrineMgPerMl * 10000) / 10000;
	const injAct = Math.round(carp * mgActive * 10) / 10;
	const injEpi = Math.round(carp * mgEpi * 10000) / 10000;

	const { maxSafeActiveMg: evaluatedMaxActive, limitingFactor: initLimit, limitingDesc: initDesc } = evaluateSafeDose({
		drug, weight, age: params.patientAgeYears ?? null, isPediatric: isPedia, pediatricFormula: params.pediatricFormula, isCardiacRisk: Boolean(params.isCardiacRisk), injectedActiveMg: injAct, injectedEpiMg: injEpi,
	});

	let maxSafeActiveMg = evaluatedMaxActive;
	let limitingFactor = initLimit;
	let limitingDesc = initDesc;
	const isCardiac = Boolean(params.isCardiacRisk);
	const maxSafeEpi = isCardiac ? EPINEPHRINE_LIMITS_MG.cardiovascularGate : EPINEPHRINE_LIMITS_MG.healthyAdult;

	const maxByAct = mgActive > 0 ? Math.floor((maxSafeActiveMg / mgActive) * 10) / 10 : 0;
	const maxByEpi = (!drug.isAdrenalineFree && mgEpi > 0) ? Math.floor((maxSafeEpi / mgEpi) * 10) / 10 : 999;
	let maxSafeCarp = Math.min(maxByAct, maxByEpi);
	let cardiacGateActive = false;

	if (isCardiac && !drug.isAdrenalineFree && maxByEpi < maxByAct) {
		cardiacGateActive = true;
		maxSafeCarp = maxByEpi;
		limitingFactor = "cardiac_epinephrine_gate";
		limitingDesc = `Лимит строго ограничен кардиологическим шлюзом адреналина (<= 0.04 мг / макс. ${maxSafeCarp} карп.).`;
		maxSafeActiveMg = Math.min(maxSafeActiveMg, Math.round(maxSafeCarp * mgActive * 10) / 10);
	}

	const isOverdose = injAct > maxSafeActiveMg;
	const isEpiOverdose = !drug.isAdrenalineFree && injEpi > maxSafeEpi;
	const warnings: string[] = [];
	const contraindications: string[] = [];
	if (drug.containsSulfites && (params.hasSulfiteAllergy || params.hasBronchialAsthma)) {
		contraindications.push("ПРЕПАРАТ СОДЕРЖИТ СУЛЬФИТЫ (метабисульфит натрия E223). Противопоказан при бронхиальной астме и аллергии на сульфиты! Препарат выбора — Скандонест 3% (Мепивакаин).");
	}
	if (isEpiOverdose) warnings.push(`ПРЕВЫШЕН КАРДИОЛОГИЧЕСКИЙ ЛИМИТ АДРЕНАЛИНА (${injEpi} мг > ${maxSafeEpi} мг). Риск тахикардии, ишемии миокарда и гипертонического криза!`);
	if (isOverdose) warnings.push(`ПРЕВЫШЕНА МАКСИМАЛЬНО ДОПУСТИМАЯ ДОЗА АНЕСТЕТИКА (${injAct} мг > ${maxSafeActiveMg} мг / ${maxSafeCarp} карп.). Риск токсического действия на ЦНС!`);

	const actPct = maxSafeActiveMg > 0 ? Math.round((injAct / maxSafeActiveMg) * 100) : 0;
	const epiPct = !drug.isAdrenalineFree && maxSafeEpi > 0 ? Math.round((injEpi / maxSafeEpi) * 100) : 0;
	const { safetyZone, label: speedoMeterLabelRu, color: speedoMeterColorHex } = evaluateSafetyZone(actPct, epiPct, isOverdose || isEpiOverdose, contraindications.length > 0);

	const epiText = !drug.isAdrenalineFree ? `, вазоконстриктор ${drug.vasoconstrictorNameRu} (${injEpi} мг)` : ", без вазоконстриктора";
	const cardioText = isCardiac ? " [Кардиоконтроль: адреналин <= 0.04 мг]" : "";
	const pediaText = isPedia ? ` [Педиатрический расчет: ${params.pediatricFormula === "young" ? "Янг" : "Кларк"}]` : "";
	const soapDiaryText = `Обезболивание: Препарат «${drug.tradeNamesRu[0]}» (${drug.activeSubstanceRu}), объем ${Math.round(carp * vol * 100) / 100} мл (${carp} карп., ${injAct} мг действ. в-ва${epiText}). МРД для пациента ${weight} кг: ${maxSafeActiveMg} мг (${maxSafeCarp} карп.)${cardioText}${pediaText}. Аспирационная проба отрицательная. Соматических реакций нет.`;

	return {
		drug, patientWeightKg: weight, carpuleVolumeMl: vol, mgActivePerCarpule: mgActive, mgEpiPerCarpule: mgEpi, carpulesCount: carp,
		injectedVolumeMl: Math.round(carp * vol * 100) / 100, injectedActiveMg: injAct, injectedEpinephrineMg: injEpi,
		maxSafeActiveMg, maxSafeEpinephrineMg: maxSafeEpi, maxSafeCarpulesCount: maxSafeCarp, maxSafeVolumeMl: Math.round(maxSafeCarp * vol * 100) / 100,
		remainingSafeActiveMg: Math.max(0, Math.round((maxSafeActiveMg - injAct) * 10) / 10),
		remainingSafeEpinephrineMg: drug.isAdrenalineFree ? 0 : Math.max(0, Math.round((maxSafeEpi - injEpi) * 10000) / 10000),
		remainingSafeCarpules: Math.max(0, Math.round((maxSafeCarp - carp) * 10) / 10),
		activeDosePercent: actPct, epinephrineDosePercent: epiPct, peakUtilizationPercent: Math.max(actPct, epiPct),
		safetyZone, isOverdose, isEpinephrineOverdose: isEpiOverdose, speedoMeterLabelRu, speedoMeterColorHex, limitingFactor, limitingFactorDescriptionRu: limitingDesc,
		isCardiacRestricted: isCardiac && !drug.isAdrenalineFree, cardiacGateActive, isPediatric: isPedia, isPediatricScaled: isPedia,
		pediatricFormulaUsed: isPedia ? (params.pediatricFormula ?? "clark") : null, pediatricScalingFactor: 1.0, warnings, contraindications, soapDiaryText,
	};
}
