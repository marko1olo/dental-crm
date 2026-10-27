/**
 * cashboxDiscounts.ts — Layer 1 & 2: Kopeck-Exact Discounts & Doctor Autonomy Math.
 *
 * Decomposed under discounts/ adhering to Mandate 8b (strictly <= 120 lines):
 * - paymentDiscountMath.ts (Standard & fast checkout discount calculations)
 * - warranty100Checkout.ts (100% warranty & colleague checkout processing)
 */

export * from "./discounts/paymentDiscountMath.js";
export * from "./discounts/warranty100Checkout.js";
