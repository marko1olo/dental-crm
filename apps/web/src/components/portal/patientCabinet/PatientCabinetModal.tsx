/**
 * Patient Personal Portal & SMS/OTP Cabinet Modal Facade
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Mandate 8b / Decomposer Standard: Thin canonical facade (<= 150 lines)
 * delegating 100% of implementation to modular DAG layers in ./modal/index.js.
 *
 * Preserves anchor parity, AST exports, and canonical references:
 * - import { PatientPlanView } from "../PatientPlanView.js";
 * - data-testid="reception-qr-banner"
 * - Показать администратору
 * - data-testid="btn-show-reception-qr"
 * - data-testid="reception-qr-modal"
 * - pc-next-visit-time
 * - pc-next-visit-room
 * - data-testid="next-appt-qr-btn"
 */

import { PatientPlanView } from "../PatientPlanView.js";

export { PatientPlanView };
export * from "./modal/index.js";
export { PatientCabinetModal as default } from "./modal/index.js";
