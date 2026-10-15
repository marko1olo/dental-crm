/**
 * labUnifiedWorkTypes.ts — Единый Single Source of Truth (SSOT) зуботехнических изделий и конструкций.
 * Точный расчет себестоимости в копейках (BIGINT) с вычетом из базы ЗП врача Т-51.
 */

export * from "./labUnifiedWorkTypesData.js";

/**
 * Расчет удержания себестоимости ЗТЛ из базы сдельной оплаты врача Т-51.
 * Выручка клиники минус затраты ЗТЛ = чистая база начисления сдельного процента.
 */
export function calculateLabWageDeductionKopecks(params: {
	readonly patientPriceKopecks: number;
	readonly labCostKopecks: number;
	readonly doctorSharePercent: number;
	readonly isWarranty?: boolean;
}): {
	readonly doctorWageBaseKopecks: number;
	readonly doctorWageKopecks: number;
	readonly clinicMarginKopecks: number;
	readonly isBalanced: boolean;
} {
	if (params.isWarranty) {
		return {
			doctorWageBaseKopecks: 0,
			doctorWageKopecks: 0,
			clinicMarginKopecks: -params.labCostKopecks,
			isBalanced: true,
		};
	}
	const base = Math.max(0, params.patientPriceKopecks - params.labCostKopecks);
	const docPct = Math.max(0, Math.min(100, params.doctorSharePercent));
	const wage = Math.round((base * docPct) / 100);
	const margin = base - wage;
	return {
		doctorWageBaseKopecks: base,
		doctorWageKopecks: wage,
		clinicMarginKopecks: margin,
		isBalanced: wage + margin === base,
	};
}
