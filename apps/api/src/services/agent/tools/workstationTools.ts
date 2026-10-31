/**
 * workstationTools.ts — Antigravity Workstation & Local Windows Hardware Agent Tools Facade.
 *
 * Mandate 8b: Decomposed into ./workstation/ sub-modules.
 * Retained for backwards compatibility across existing imports.
 */

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
	registerWorkstationTools,
} from "./workstation/index.js";
