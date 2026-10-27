/**
 * @file index.ts
 * @description Сборка и экспорт системных десктопных инструментов рабочей станции DENTE CRM.
 */

import type { AnyDentalToolEntry } from "../types.js";
import { launchWorkstationAppTool } from "./appLauncherTools.js";
import {
	listPatientStudyDirectoryTool,
	openPatientDropzoneFolderTool,
	readClinicalFileTool,
	readLocalClinicalFileTool,
	replaceFileContentTool,
	searchWorkstationFilesTool,
	writeClinicalFileTool,
} from "./fileIoTools.js";
import {
	callLocalMcpToolTool,
	listLocalMcpToolsTool,
	readLocalMcpResourceTool,
} from "./hardwareMcpBridgeTools.js";
import { runWorkstationCommandTool } from "./processExecutionTools.js";
import { scheduleTool } from "./scheduleEngineTools.js";
import { captureWorkstationScreenTool } from "./screenCaptureTools.js";
import { manageTaskTool } from "./taskEngineTools.js";

export * from "./appLauncherPaths.js";
export * from "./appLauncherTools.js";
export * from "./desktopSecurity.js";
export * from "./desktopTypes.js";
export * from "./fileIoTools.js";
export * from "./hardwareMcpBridge.js";
export * from "./hardwareMcpBridgeTools.js";
export * from "./mcpFiscalHandlers.js";
export * from "./mcpRegistry.js";
export * from "./mcpSensorHandlers.js";
export * from "./processExecutionHelper.js";
export * from "./processExecutionTools.js";
export * from "./scheduleEngineTools.js";
export * from "./scheduleManager.js";
export * from "./screenCaptureHelper.js";
export * from "./screenCaptureTools.js";
export * from "./securityConstants.js";
export * from "./taskEngineTools.js";
export * from "./taskManager.js";
export * from "./taskProcessActions.js";

/**
 * Полный реестр инструментов рабочей станции врача DENTE Desktop (.EXE / Native)
 */
export const desktopSystemTools: readonly AnyDentalToolEntry[] = [
	readClinicalFileTool,
	readLocalClinicalFileTool,
	writeClinicalFileTool,
	replaceFileContentTool,
	searchWorkstationFilesTool,
	listPatientStudyDirectoryTool,
	openPatientDropzoneFolderTool,
	runWorkstationCommandTool,
	manageTaskTool,
	scheduleTool,
	launchWorkstationAppTool,
	captureWorkstationScreenTool,
	callLocalMcpToolTool,
	listLocalMcpToolsTool,
	readLocalMcpResourceTool,
] as const;
