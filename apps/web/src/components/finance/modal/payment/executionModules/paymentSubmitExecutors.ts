/**
 * apps/web/src/components/finance/modal/payment/executionModules/paymentSubmitExecutors.ts
 *
 * Dedicated submit executors facade for Cash, Split, and Deposit / Family wallet payments.
 * Complies with 54-FZ FFD 1.2, Mandate 8e (Doctor Autonomy), Mandate 8i (Kopeck Precision).
 */

export type { PaymentExecutorContext } from "./paymentExecutionTypes.js";
export { handleWarranty100Submit } from "./warrantySubmitExecutor.js";
export { executeCashSubmit } from "./cashSubmitExecutor.js";
export { executeSplitSubmit } from "./splitSubmitExecutor.js";
export { executeDepositSubmit } from "./depositSubmitExecutor.js";
