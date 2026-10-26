/**
 * prescriptionDosageTopicals.ts — Topical Medications (Antiseptics, Gels, Pastes)
 * DENTE Dental CRM (Mandate 8b <= 120 lines).
 */

import type { DosageCalculationResult } from "./prescriptionDosageTypes";

export function getChlorhexidineDosage(isChild: boolean): DosageCalculationResult {
	return {
		drugNameRu: "Хлоргексидина биглюконат 0.05%",
		recommendedDosageRu: "Ротовые ванночки: 10–15 мл раствора",
		standardFrequencyRu: "3 раза в день по 1 минуте после чистки зубов и еды (7–10 дней)",
		maxDailyDoseRu: "Местно, не глотать",
		isPediatric: isChild,
		warningRu: isChild ? "У детей применять только под контролем взрослых. Не глотать!" : undefined,
	};
}

export function getHolisalDosage(isChild: boolean): DosageCalculationResult {
	return {
		drugNameRu: "Холисал стоматологический гель",
		recommendedDosageRu: isChild
			? "Полоска геля 0.5 см на пораженный участок слизистой"
			: "Полоска геля 1 см на пораженный участок слизистой",
		standardFrequencyRu: "2–3 раза в день после еды и перед сном чистым пальцем",
		maxDailyDoseRu: "Местно, до 3–4 раз в сутки",
		isPediatric: isChild,
	};
}

export function getSolcoserylDosage(): DosageCalculationResult {
	return {
		drugNameRu: "Солкосерил дентальная адгезивная паста",
		recommendedDosageRu: "Полоска пасты около 0.5 см тонким слоем на высушенную слизистую",
		standardFrequencyRu: "3–5 раз в день после еды и перед сном (не втирать)",
		maxDailyDoseRu: "Местно, по мере необходимости до эпителизации",
		isPediatric: false,
	};
}
