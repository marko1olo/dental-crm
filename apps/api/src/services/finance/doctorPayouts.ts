/**
 * Canonical Facade: Doctor Payouts Financial Engine.
 *
 * Decomposed into modular DAG architecture (<800 lines per file):
 * - types.ts (Layer 0: DTO contracts & period constraints)
 * - periods.ts (Layer 1: request period resolver)
 * - math.ts (Layer 1: decimal.js rounding & money percentages)
 * - formula.ts (Layer 1: pure payout & commission calculator)
 * - helpers.ts (Layer 1: medical card & ZTL restoration helpers)
 * - t51Payslip.ts (Layer 2: official T-51 payslip HTML renderer)
 * - queries.ts (Layer 3: CTE aggregation SQL query)
 * - drillDown.ts (Layer 3: visits, materials & ZTL orders fetcher)
 * - reportEngine.ts (Layer 3: master payouts report builder)
 * - index.ts (Layer 5: barrel re-export aggregator)
 */

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
	resolvePayoutPeriod,
	roundMoney,
	percentOfMoney,
	computeDoctorPayout,
	materialsStateOf,
	payoutRowNote,
	extractMedicalCardNumber,
	humanizeRestorationType,
	generateDoctorT51Payslip,
	doctorPayouts,
	type IdentSalaryModel,
	type IdentDoctorSalaryCalculationParams,
	type IdentDoctorSalaryCalculationResult,
	type IdentSalaryPriceApplicationMode,
	type IdentDiscountAllocationPolicy,
	type DoctorOneTimeDeduction,
	calculateIdentDoctorSalary,
	extractDeductibleMaterialsFromWriteoff,
	IDENT_SALARY_MODEL_NAMES_RU,
} from "./doctorPayouts/index.js";
