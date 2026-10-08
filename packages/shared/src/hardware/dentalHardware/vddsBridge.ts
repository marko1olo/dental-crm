/**
 * @dental/shared/hardware - Layer 1: VDDS-Media 5/6 Standard Bridge.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type { VddsMediaDescriptor, VddsMediaResponse } from "./types.js";

/**
 * Generates VDDS-Media 5/6 patient exchange file.
 */
export function generateVddsMediaContent(
	patient: VddsMediaDescriptor,
	options: { returnFilePath?: string } = {}
): string {
	const version = patient.version || "5.0";
	const returnFile = options.returnFilePath || patient.returnFilePath || "C:\\Temp\\dente_vdds_return.ini";
	const action = patient.action || (patient.command === "NewImage" ? "ACQUIRE" : "SHOW");
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	let formattedBirth = "01.01.1980";
	if (rawBirth.length === 8) {
		formattedBirth = `${rawBirth.slice(6, 8)}.${rawBirth.slice(4, 6)}.${rawBirth.slice(0, 4)}`;
	}
	const genderCode = patient.gender === "F" ? "2" : patient.gender === "M" ? "1" : "0";
	const modalityCode = patient.modality || "IO";

	const lines = [
		"[VDDS]",
		`Version=${version}`,
		"ProgramName=DENTE Dental CRM",
		"",
		"[Patient]",
		`ID=${patient.patientId}`,
		`NAME=${patient.lastName}`,
		`VORNAME=${patient.firstName}`,
		`GEBDAT=${formattedBirth}`,
		`GESCHL=${genderCode}`,
		"",
		"[XRay]",
		`AUFNAHMEART=${modalityCode}`,
		`AKTION=${action}`,
		`RUECKGABE=${returnFile}`,
	];

	if (patient.toothCode) {
		lines.push(`ZAHN=${patient.toothCode}`);
	}

	return `${lines.join("\r\n")}\r\n`;
}

/**
 * Parses VDDS-Media response file.
 */
export function parseVddsMediaResponse(content: string): VddsMediaResponse {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty VDDS content" };
	}
	const lines = content.split(/\r?\n/);
	let patientId: string | undefined;
	let toothCode: string | undefined;
	let modality: string | undefined;
	let status = "SUCCESS";
	const imagePaths: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toUpperCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "STATUS") {
			status = val.toUpperCase();
		} else if (key === "ID" || key === "PATIENTID") {
			patientId = val;
		} else if (key === "ZAHN" || key === "TOOTH") {
			toothCode = val;
		} else if (key === "AUFNAHMEART" || key === "MODALITY") {
			modality = val.toUpperCase();
		} else if (key === "FILE" || key === "DATEI" || key === "BILD" || key === "IMAGE" || key === "PATH") {
			imagePaths.push(val);
		}
	}

	return {
		success: status === "SUCCESS" || status === "OK" || status === "0",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths,
	};
}
