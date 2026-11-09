export {
	MAX_PAYOUT_PERIOD_DAYS,
	type ResolvedPayoutPeriod,
	type DoctorPayoutScope,
	type DoctorPayoutState,
	type DoctorPayoutMaterialsState,
	type DoctorPayoutVisitService,
	type DoctorPayoutVisitMaterial,
	type DoctorPayoutVisit,
	type DoctorPayoutLabOrder,
	type DoctorPayoutRow,
	type DoctorPayoutTotals,
	type DoctorPayoutReport,
	type PayoutFormulaInput,
	type PayoutFormulaResult,
} from "./types.js";

export { resolvePayoutPeriod } from "./periods.js";

export { roundMoney, percentOfMoney } from "./math.js";

export {
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
} from "./formula.js";

export {
	extractMedicalCardNumber,
	humanizeRestorationType,
} from "./helpers.js";

export { generateDoctorT51Payslip } from "./t51Payslip.js";

export { doctorPayouts } from "./reportEngine.js";

export {
	type IdentSalaryModel,
	type IdentDoctorSalaryCalculationParams,
	type IdentDoctorSalaryCalculationResult,
	type IdentSalaryPriceApplicationMode,
	type IdentDiscountAllocationPolicy,
	type DoctorOneTimeDeduction,
	calculateIdentDoctorSalary,
	extractDeductibleMaterialsFromWriteoff,
	IDENT_SALARY_MODEL_NAMES_RU,
} from "@dental/shared";
