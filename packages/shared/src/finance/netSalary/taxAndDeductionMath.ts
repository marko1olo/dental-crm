/**
 * taxAndDeductionMath.ts — Precise Kopeck Math, progressive NDFL & IDENT discount distribution.
 * Layer 1: Pure Utilities & Math (0 side effects).
 */

import type { Kopecks } from "../../money.js";
import { kopecksToRub as kopecksToRubles } from "../../fiscal/kopecksArithmetic.js";
import type {
	IdentDiscountSalaryBaseParams,
	IdentDiscountSalaryBaseResult,
} from "./types.js";

/**
 * Вспомогательное преобразование рублей/копеек в гарантированные целочисленные копейки.
 */
export function toKop(rub: number | undefined, kop: Kopecks | undefined): Kopecks {
	if (kop !== undefined) return kop;
	if (rub === undefined || rub === 0) return 0 as Kopecks;
	return Math.round(rub * 100) as Kopecks;
}

/**
 * Расчет расчетной базы врача при скидках и частичной оплате долга по каноническим политикам IDENT.
 */
export function calculateIdentDiscountSalaryBase(
	params: IdentDiscountSalaryBaseParams,
): IdentDiscountSalaryBaseResult {
	const { grossRevenueKop, invoiceTotalKop, paidKop, discountKop, clinicCostsKop, policy } = params;
	const isFullyPaid = paidKop >= invoiceTotalKop;
	const debtKop = Math.max(0, invoiceTotalKop - paidKop) as Kopecks;

	let doctorBaseKop: Kopecks;
	let clinicShareKop: Kopecks;

	switch (policy) {
		case "gross_unconditional": {
			doctorBaseKop = Math.max(0, grossRevenueKop - clinicCostsKop) as Kopecks;
			clinicShareKop = Math.max(0, paidKop - doctorBaseKop) as Kopecks;
			break;
		}
		case "clinic_first": {
			const clinicCovered = Math.min(paidKop, clinicCostsKop);
			doctorBaseKop = Math.max(0, paidKop - clinicCostsKop) as Kopecks;
			clinicShareKop = clinicCovered as Kopecks;
			break;
		}
		case "doctor_first": {
			const targetDoctorBase = Math.max(0, grossRevenueKop - clinicCostsKop) as Kopecks;
			doctorBaseKop = Math.min(paidKop, targetDoctorBase) as Kopecks;
			clinicShareKop = Math.max(0, paidKop - doctorBaseKop) as Kopecks;
			break;
		}
		case "proportional": {
			const targetDoctorBase = Math.max(0, grossRevenueKop - clinicCostsKop - discountKop) as Kopecks;
			if (invoiceTotalKop <= 0 || paidKop <= 0) {
				doctorBaseKop = 0 as Kopecks;
				clinicShareKop = 0 as Kopecks;
			} else {
				const ratio = Math.min(1, paidKop / invoiceTotalKop);
				doctorBaseKop = Math.round(targetDoctorBase * ratio) as Kopecks;
				clinicShareKop = Math.max(0, paidKop - doctorBaseKop) as Kopecks;
			}
			break;
		}
	}

	return {
		doctorBaseKop,
		doctorBaseRub: kopecksToRubles(doctorBaseKop),
		clinicShareKop,
		clinicShareRub: kopecksToRubles(clinicShareKop),
		policyApplied: policy,
		isFullyPaid,
		debtKop,
		debtRub: kopecksToRubles(debtKop),
	};
}
