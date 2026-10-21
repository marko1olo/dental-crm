/**
 * informedConsentBlockers.ts
 *
 * Soft Guiding & Safe Defaults Engine for Informed Consent (Mandate 8e, 8n & Anti-Blockers Law).
 * Re-exports canonical implementation from informedConsentGuiding.ts.
 *
 * Инварианты:
 * 1. Никаких блокирующих капканов: кнопки печати («Печать», «Распечатать») НИКОГДА не блокируются (disabled = false).
 * 2. Вместо блокировок — мягкие подсказки (Soft Guiding) для врача или администратора.
 * 3. При неполном заполнении при нажатии печати подставляются клинически безопасные дефолты
 *    («Санация полости рта», «По плану лечения»).
 */

export * from "./informedConsentGuiding.js";
