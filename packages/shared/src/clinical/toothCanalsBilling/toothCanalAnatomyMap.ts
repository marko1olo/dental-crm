/**
 * DENTE Dental CRM — Anatomical Root Canals & FDI Tooth Map (Facade SSOT)
 * Canonical implementation resides in packages/shared/src/clinical/endo/canalAnatomyRules.ts
 *
 * Re-exports canonical canal anatomy functions and map to guarantee 100% backward
 * compatibility for billing, tests, and clinical calculation engines without code duplication (DEF-THER-05).
 */

export {
	TOOTH_CANAL_ANATOMY_MAP,
	getAnatomicalRootCanalCount,
	getCanalCountForTooth,
	getToothCanalsCount,
	isMultiRootedTooth,
} from "../endo/canalAnatomyRules.js";

export type { AnatomicalCanalCount, ToothCanalConfig } from "./types.js";
