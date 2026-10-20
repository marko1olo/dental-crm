/**
 * apps/web/src/components/cashbox/CashboxView.tsx
 *
 * Re-export of canonical SSOT CashRegisterView from finance domain.
 * Mandate 8b: <10 lines facade.
 */

export * from "../finance/CashRegisterView.js";
export { CashRegisterView as default, CashRegisterView as CashboxView } from "../finance/CashRegisterView.js";
