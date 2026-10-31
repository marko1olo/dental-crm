/**
 * sanpinTools.ts — Sterilization & Infection Control Tools Facade.
 *
 * Mandate 8b: Decomposed into ./sanpin/ sub-modules.
 * Retained for backwards compatibility across existing imports.
 */

export {
	verifyKraftPackSchema,
	verifyKraftPackTool,
	recordSterilizationTestSchema,
	recordSterilizationTestTool,
	type KraftPackDetails,
	type VerifyKraftPackInput,
	type VerifyKraftPackResult,
	type RecordSterilizationTestInput,
	registerSanpinTools,
} from "./sanpin/index.js";
