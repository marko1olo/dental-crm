/**
 * index.ts — SanPiN Sterilization and Infection Control Tools Module.
 *
 * Sweet Spot: ~35 lines.
 */

import type { ToolRegistry } from "../registry.js";
import {
	verifyKraftPackSchema,
	verifyKraftPackTool,
	type KraftPackDetails,
	type VerifyKraftPackInput,
	type VerifyKraftPackResult,
} from "./kraftPackVerificationTool.js";
import {
	recordSterilizationTestSchema,
	recordSterilizationTestTool,
	type RecordSterilizationTestInput,
} from "./sterilizationTestTool.js";

export {
	verifyKraftPackSchema,
	verifyKraftPackTool,
	recordSterilizationTestSchema,
	recordSterilizationTestTool,
	type KraftPackDetails,
	type VerifyKraftPackInput,
	type VerifyKraftPackResult,
	type RecordSterilizationTestInput,
};

/**
 * Registers all sterilization and infection control tools into the registry.
 */
export function registerSanpinTools(
	registry: ToolRegistry,
	moduleName = "sanpin",
): void {
	registry.register(verifyKraftPackTool, moduleName);
	registry.register(recordSterilizationTestTool, moduleName);
}
