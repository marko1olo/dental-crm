/**
 * Canonical Facade for Billing Database Operations (DENTE CRM).
 *
 * Decomposed into modular DAG layers under `./billing/`:
 * - types.ts: BillingOverpaymentError, domain interfaces
 * - billingLookups.ts: organization, patient, visit, document lookups
 * - billingTargetBalance.ts: visit & document remaining balance validation
 * - fiscalAccounting.ts: 54-FZ fiscal receipt queue & cashbox operations
 * - refundSettlements.ts: payment refund status settlement synchronization
 * - paymentCreationPipeline.ts: transactional payment creation & fiscalization
 */

export * from "./billing/index.js";
