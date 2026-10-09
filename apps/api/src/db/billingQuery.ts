/**
 * Canonical Facade for Billing Database Operations (DENTE CRM).
 *
 * Decomposed into modular DAG layers under `./billing/`:
 * - types.ts: BillingOverpaymentError, Decree659Error, domain interfaces
 * - billingLookups.ts: organization, patient, visit, document lookups
 * - decree659Audit.ts: Decree 659 & price spoofing statutory verification
 * - billingTargetBalance.ts: visit & document remaining balance validation
 * - fiscalAccounting.ts: 54-FZ fiscal receipt queue & cashbox operations
 * - refundSettlements.ts: payment refund status settlement synchronization
 * - paymentCreationPipeline.ts: transactional payment creation & fiscalization
 */

export * from "./billing/index.js";
