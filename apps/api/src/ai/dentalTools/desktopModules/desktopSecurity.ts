/**
 * @file desktopSecurity.ts
 * @description Валидаторы путей, расширений и команд рабочего места (Red Team Guard).
 */

import path from "node:path";
import type { DentalToolContext } from "../types.js";
import {
	DANGEROUS_COMMAND_PATTERNS,
	FORBIDDEN_EXECUTABLE_EXTENSIONS,
	FORBIDDEN_SYSTEM_PATHS,
} from "./securityConstants.js";

export function checkIsLocalWorkstation(context: DentalToolContext): boolean {
	if (context.runtimeMode === "web_browser") {
		return false;
	}
	return (
		process.platform === "win32" ||
		process.env.WORKSTATION_MODE === "true" ||
		context.runtimeMode === "desktop_native" ||
		context.allowLocalExecution === true
	);
}

export const DESKTOP_DENIED_RESPONSE = {
	success: false,
	error:
		"Отказ: данная операция (управление ПК/визиографом/процессами) доступна только в режиме локальной станции врача (DENTE Desktop / EXE на Windows). В облачном браузере доступно управление CRM и клиническими протоколами.",
	availableInWeb: false,
};

export function isPathSafe(filePath: string): boolean {
	const normalized = path
		.normalize(filePath)
		.toLowerCase()
		.replace(/\\/g, "/");
	const resolved = path
		.resolve(filePath)
		.toLowerCase()
		.replace(/\\/g, "/");
	for (const forbidden of FORBIDDEN_SYSTEM_PATHS) {
		const lowerForbidden = forbidden.toLowerCase().replace(/\\/g, "/");
		if (
			normalized.includes(lowerForbidden) ||
			resolved.includes(lowerForbidden)
		) {
			return false;
		}
	}
	return true;
}

export function isExtensionSafe(filePath: string): boolean {
	const ext = path.extname(filePath).toLowerCase();
	return !FORBIDDEN_EXECUTABLE_EXTENSIONS.includes(ext);
}

export function isCommandSafe(cmd: string): boolean {
	for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
		if (pattern.test(cmd)) {
			return false;
		}
	}
	return true;
}

export function getTenantDropzonePath(
	organizationId: string,
	patientId?: string,
): string {
	const baseDropzone =
		process.env.DENTAL_DROPZONE_PATH ||
		path.join(process.env.SYSTEMDRIVE || "C:", "DentalClinic", "XRayDropzone");

	const orgSafe = organizationId.replace(/[^a-zA-Z0-9_-]/g, "_");
	if (!patientId) {
		return path.join(baseDropzone, orgSafe);
	}
	const patientSafe = patientId.replace(/[^a-zA-Z0-9_-]/g, "_");
	return path.join(baseDropzone, orgSafe, patientSafe);
}
