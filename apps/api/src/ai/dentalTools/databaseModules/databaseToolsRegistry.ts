/**
 * databaseToolsRegistry.ts — Реестр и словарь всех инструментов базы данных CRM для ИИ-ассистента.
 * Мандаты: 8b (<= 120 строк), 8e (автономия врача), 8n (соло-практика).
 */

import type { AnyDentalToolEntry } from "../types.js";
import { configureClinicSetupTool } from "./configureClinicSetupTool.js";
import { createAppointmentTool } from "./createAppointmentTool.js";
import { createInvoiceDraftTool } from "./createInvoiceDraftTool.js";
import { importClinicDataFileTool } from "./importClinicDataFileTool.js";
import { patientEmkTool, getPatientEmrTool } from "./patientEmkTool.js";
import { patientSearchTool } from "./patientSearchTool.js";
import { printDocumentTool } from "./printDocumentTool.js";
import { searchServicesTool } from "./servicePriceListTool.js";
import { treatmentRecordTool } from "./treatmentRecordTool.js";
import { updateToothStatusTool } from "./updateToothStatusTool.js";

/**
 * Полный список инструментов взаимодействия с базой данных CRM
 */
export const databaseToolsRegistry: readonly AnyDentalToolEntry[] = [
	getPatientEmrTool,
	searchServicesTool,
	updateToothStatusTool,
	createAppointmentTool,
	createInvoiceDraftTool,
	patientSearchTool,
	treatmentRecordTool,
	printDocumentTool,
	configureClinicSetupTool,
	importClinicDataFileTool,
] as const;

/**
 * Словарь инструментов базы данных для O(1) поиска по имени
 */
export const databaseToolsMap: Readonly<Record<string, AnyDentalToolEntry>> = Object.freeze(
	databaseToolsRegistry.reduce(
		(acc, tool) => {
			acc[tool.name] = tool;
			return acc;
		},
		{} as Record<string, AnyDentalToolEntry>,
	),
);

export {
	getPatientEmrTool,
	patientEmkTool,
	searchServicesTool,
	updateToothStatusTool,
	createAppointmentTool,
	createInvoiceDraftTool,
	patientSearchTool,
	treatmentRecordTool,
	printDocumentTool,
	configureClinicSetupTool,
	importClinicDataFileTool,
};
