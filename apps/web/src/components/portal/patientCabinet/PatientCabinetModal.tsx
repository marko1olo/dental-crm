/**
 * Patient Personal Portal & SMS/OTP Cabinet Modal Facade
 * (DOMAIN: PORTAL PATIENT CABINET)
 *
 * Mandate 8b / Decomposer Standard: Thin canonical facade (<= 150 lines)
 * delegating 100% of implementation to modular DAG layers in ./modal/index.js.
 */

import { PatientPlanView } from "../PatientPlanView.js";

export { PatientPlanView };
export * from "./modal/index.js";
export { PatientCabinetModal as default } from "./modal/index.js";
