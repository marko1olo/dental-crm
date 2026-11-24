/**
 * apps/api/src/routes/cashbox/paymentStages/validateAndLockStage.ts
 *
 * Stage 1 Facade: Preserves 100% export parity for decomposed input validation
 * (`validatePaymentInputStage.ts`) and advisory locking/replay (`acquireLockAndReplayStage.ts`).
 */

export {
	validatePaymentInput,
	type ValidationResult,
} from "./validatePaymentInputStage.js";
export { acquireLockAndResolvePatient } from "./acquireLockAndReplayStage.js";
