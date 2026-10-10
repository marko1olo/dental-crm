/**
 * Zod Schemas & Statutory Validation for 54-FZ FFD 1.2 Fiscal Receipts & Operations.
 * Compliant with Order of FTS Russia No. ED-7-20/662@ and Order of Minzdrav 804n.
 *
 * Canonical Thin Facade (Mandate 8b):
 * Re-exports 100% of fiscal validation API from decomposed ./fiscalValidation submodules.
 */

export * from "./fiscalValidation/index.js";
