/**
 * index.ts — Workstation & Desktop Native Hardware Tools Module.
 *
 * Sweet Spot: ~60 lines.
 */

import type { ToolRegistry } from "../registry.js";
import {
	CLOUD_GUARD_DENIAL,
	isCloudEnvironment,
	launchWorkstationAppSchema,
	launchWorkstationAppTool,
	STANDARD_APP_PATHS,
	type LaunchWorkstationAppInput,
} from "./workstationAppTools.js";
import {
	captureWorkstationScreenSchema,
	captureWorkstationScreenTool,
	type CaptureWorkstationScreenInput,
} from "./workstationCaptureTools.js";
import {
	openPatientDropzoneFolderSchema,
	openPatientDropzoneFolderTool,
	readClinicalFileSchema,
	readClinicalFileTool,
	searchWorkstationFilesSchema,
	searchWorkstationFilesTool,
	writeClinicalFileSchema,
	writeClinicalFileTool,
	type OpenPatientDropzoneFolderInput,
	type SearchWorkstationFilesInput,
} from "./workstationFileTools.js";
import {
	checkFiscalHardwarePortSchema,
	checkFiscalHardwarePortTool,
	writeWorkstationClipboardSchema,
	writeWorkstationClipboardTool,
	type CheckFiscalHardwarePortInput,
} from "./workstationHardwareTools.js";

export {
	isCloudEnvironment,
	CLOUD_GUARD_DENIAL,
	launchWorkstationAppSchema,
	launchWorkstationAppTool,
	STANDARD_APP_PATHS,
	type LaunchWorkstationAppInput,
	captureWorkstationScreenSchema,
	captureWorkstationScreenTool,
	type CaptureWorkstationScreenInput,
	openPatientDropzoneFolderSchema,
	openPatientDropzoneFolderTool,
	searchWorkstationFilesSchema,
	searchWorkstationFilesTool,
	readClinicalFileSchema,
	readClinicalFileTool,
	writeClinicalFileSchema,
	writeClinicalFileTool,
	type OpenPatientDropzoneFolderInput,
	type SearchWorkstationFilesInput,
	checkFiscalHardwarePortSchema,
	checkFiscalHardwarePortTool,
	writeWorkstationClipboardSchema,
	writeWorkstationClipboardTool,
	type CheckFiscalHardwarePortInput,
};

/**
 * Registers all workstation tools into the provided tool registry.
 */
export function registerWorkstationTools(
	registry: ToolRegistry,
	moduleName = "workstation",
): void {
	registry.register(launchWorkstationAppTool, moduleName);
	registry.register(openPatientDropzoneFolderTool, moduleName);
	registry.register(captureWorkstationScreenTool, moduleName);
	registry.register(searchWorkstationFilesTool, moduleName);
	registry.register(readClinicalFileTool, moduleName);
	registry.register(writeClinicalFileTool, moduleName);
	registry.register(checkFiscalHardwarePortTool, moduleName);
	registry.register(writeWorkstationClipboardTool, moduleName);
}
