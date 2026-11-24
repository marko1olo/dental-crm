/**
 * apps/api/src/routes/cashbox/balanceModules/index.ts
 * Barrel exports for patient balance and advance operations.
 */

export {
	creditPersonalAdvanceOp,
	debitAdvanceOp,
	refundPersonalAdvanceOp,
} from "./advanceOperationsService.js";
export { getDetailedPatientBalance } from "./balanceQueryService.js";
export { registerBalanceModuleRoutes } from "./balanceRoutes.js";
export {
	type CreditAdvanceParams,
	type DebitAdvanceParams,
	PatientBalanceError,
	type PatientDetailedBalance,
	type RefundAdvanceParams,
} from "./types.js";
