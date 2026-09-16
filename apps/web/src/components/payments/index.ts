/**
 * apps/web/src/components/payments/index.ts
 *
 * Implements Mandate 8s (Law of Single Indivisible Authority):
 * Canonical payments barrel consolidating installment QR, fast checkout,
 * Sber POS terminal integration, cash desk amounts, and fiscal receipt requirements.
 */

export * from "./BankInstallmentQrModal";
export * from "./bankInstallmentEngine";
export * from "./cashDeskAmounts";
export * from "./fiscalReceiptRequirements";
export * from "./checkout";
export * from "./sberPos";
