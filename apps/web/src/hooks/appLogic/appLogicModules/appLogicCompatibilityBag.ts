/**
 * DENTE CRM — Master App Logic Compatibility Bag Facade (Layer 5)
 *
 * Preserves legacy monolithic API compatibility for useAppLogic consumers.
 * Delegated to modular compatibility bridge units in ./compatibility/
 */

export { buildAppLogicCompatibilityBag } from "./compatibility/appLogicCompatibilityBag.js";
export type * from "./compatibility/appLogicCompatibilityTypes.js";
