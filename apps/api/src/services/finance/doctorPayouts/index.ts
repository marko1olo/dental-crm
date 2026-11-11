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

export { generateDoctorPayslipHtml, generateDoctorT51Payslip } from "./doctorPayslip.js";

export { doctorPayouts } from "./reportEngine.js";

export { buildDoctorPayoutAggregateQuery } from "./queries.js";

export {
	type DoctorSalaryModel,
	type DoctorSalaryCalculationInput,
	type DoctorSalaryCalculationResult,
	type DoctorSalaryPriceApplicationMode,
	type DiscountAllocationPolicy,
	type DoctorOneTimeDeduction,
	calculateDoctorSalary,
	calculateStandardDoctorSalary,
	extractDeductibleMaterialsFromWriteoff,
	DOCTOR_SALARY_MODEL_NAMES_RU,
} from "@dental/shared";

