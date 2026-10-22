import {
	type DentalLabConstructionType,
	DENTAL_LAB_CONSTRUCTIONS,
	toIsoDate,
	addWorkingDaysRu,
} from "../dentalLabOrderEngine";

export interface ConstructionDefaultsResult {
	patientPriceRub: number;
	ztlCostRub: number;
	deadlineDate: string;
}

export function computeConstructionDefaults(
	val: string,
	sentDate: string,
): ConstructionDefaultsResult | null {
	if (val === "crown_pmma" || val === "wt_009") {
		return {
			patientPriceRub: 3500,
			ztlCostRub: 1200,
			deadlineDate: toIsoDate(addWorkingDaysRu(sentDate, 2)),
		};
	}
	if (val === "custom_abutment_zirconia" || val === "wt_014") {
		return {
			patientPriceRub: 35000,
			ztlCostRub: 12000,
			deadlineDate: toIsoDate(addWorkingDaysRu(sentDate, 7)),
		};
	}
	if (val === "inlay_onlay" || val === "wt_006") {
		return {
			patientPriceRub: 18000,
			ztlCostRub: 6000,
			deadlineDate: toIsoDate(addWorkingDaysRu(sentDate, 4)),
		};
	}
	const def = DENTAL_LAB_CONSTRUCTIONS[val as DentalLabConstructionType];
	if (def) {
		return {
			patientPriceRub: def.defaultPatientPriceKopecks / 100,
			ztlCostRub: def.defaultZtlCostKopecks / 100,
			deadlineDate: toIsoDate(addWorkingDaysRu(sentDate, def.standardTurnaroundDays)),
		};
	}
	return null;
}
