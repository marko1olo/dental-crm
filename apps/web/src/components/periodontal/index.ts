/**
 * apps/web/src/components/periodontal/index.ts
 *
 * Lightweight shim & re-export facade directing to canonical SSOT in ../perio/
 * Conforms to Mandate 8s (Law of Single Domain Authority) & The Hammer Master Prompt.
 */

export * from "../perio/index";
export { default } from "../perio/PeriodontogramChart";
