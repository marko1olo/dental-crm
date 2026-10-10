/**
 * index.ts — Layer 3: Master Barrel & Registrar for CRM Schedule Tools.
 *
 * Implements Mandate 8b modular structure with strict DAG ordering.
 */

import type { ToolDefinition } from "../tool.js";
import {
	bookAppointmentTool,
	cancelAppointmentTool,
	rescheduleAppointmentTool,
} from "./bookingMutationTools.js";
import {
	getDailyPatientsTool,
	getDoctorScheduleTool,
	getDoctorShiftsTool,
	slotSearchTool,
} from "./slotSearchTool.js";

export * from "./types.js";
export * from "./chairDutyConflictChecker.js";
export * from "./bookingMutationTools.js";
export * from "./slotSearchTool.js";

/**
 * Returns complete array of all CRM Schedule Tools for AI Copilot registration.
 */
export function getCrmScheduleTools(): ToolDefinition<any, any>[] {
	return [
		bookAppointmentTool,
		rescheduleAppointmentTool,
		cancelAppointmentTool,
		getDoctorScheduleTool,
		getDailyPatientsTool,
		getDoctorShiftsTool,
		slotSearchTool,
	];
}
