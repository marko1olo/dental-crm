/**
 * @dental/shared/hardware - Layer 1: SLIDA (Sidexis Link Interface for Dental Applications) Protocol Bridge.
 *
 * Compliance: THE HAMMER, Mandates 2 (Zero Mocks), 8e (Doctor Autonomy), 8s (Anti-bloat), 8n (Solo Doctor Sovereignty).
 */

import type { SlidaPatientDescriptor, SlidaResponse } from "./types.js";

function escapeXml(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/**
 * Generates SLIDA .ini content (Sidexis Link Interface for Dental Applications).
 */
export function generateSlidaIniContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const action = patient.command || "OpenPatient";
	const genderCode = patient.gender === "F" ? "F" : "M";

	const lines = [
		"[Patient]",
		`Id=${patient.patientId}`,
		`LastName=${patient.lastName}`,
		`FirstName=${patient.firstName}`,
		`MiddleName=${patient.middleName || ""}`,
		`BirthDate=${birthDate}`,
		`Sex=${genderCode}`,
		"",
		"[Destination]",
		"Application=Sidexis",
		`Action=${action}`,
	];

	if (patient.toothCode) {
		lines.push("", "[Picture]", `Tooth=${patient.toothCode}`);
		if (patient.modality) {
			lines.push(`Modality=${patient.modality}`);
		}
	}

	return `${lines.join("\r\n")}\r\n`;
}

/**
 * Generates SLIDA XML format descriptor (used by modern Sidexis 4 and Romexis Link bridges).
 */
export function generateSlidaXmlContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "1980-01-01").replace(/\./g, "-");
	const birthDate = rawBirth.length === 8 ? `${rawBirth.slice(0, 4)}-${rawBirth.slice(4, 6)}-${rawBirth.slice(6, 8)}` : rawBirth;
	const action = patient.command || "OpenPatient";
	const genderCode = patient.gender === "F" ? "F" : "M";
	const toothAttr = patient.toothCode ? ` tooth="${patient.toothCode}"` : "";
	const modalityAttr = patient.modality ? ` modality="${patient.modality}"` : "";

	return `<?xml version="1.0" encoding="UTF-8"?>
<SlidaRequest version="1.0">
  <Patient id="${escapeXml(patient.patientId)}">
    <LastName>${escapeXml(patient.lastName)}</LastName>
    <FirstName>${escapeXml(patient.firstName)}</FirstName>
    <MiddleName>${escapeXml(patient.middleName || "")}</MiddleName>
    <BirthDate>${escapeXml(birthDate)}</BirthDate>
    <Sex>${genderCode}</Sex>
  </Patient>
  <Command action="${action}"${toothAttr}${modalityAttr} />
</SlidaRequest>
`;
}

/**
 * Parses SLIDA INI response file returned by imaging software.
 */
export function parseSlidaIniResponse(iniContent: string): SlidaResponse {
	if (!iniContent || typeof iniContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty INI content" };
	}
	const lines = iniContent.split(/\r?\n/);
	let patientId: string | undefined;
	let toothCode: string | undefined;
	let modality: string | undefined;
	let status = "OK";
	const imagePaths: string[] = [];

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(";") || trimmed.startsWith("#") || trimmed.startsWith("[")) continue;
		const eqIndex = trimmed.indexOf("=");
		if (eqIndex === -1) continue;
		const key = trimmed.slice(0, eqIndex).trim().toLowerCase();
		const val = trimmed.slice(eqIndex + 1).trim();

		if (key === "status") {
			status = val.toUpperCase();
		} else if (key === "id" || key === "chartno" || key === "patientid") {
			patientId = val;
		} else if (key === "tooth" || key === "toothno") {
			toothCode = val;
		} else if (key === "modality") {
			modality = val.toUpperCase();
		} else if (key === "file" || key === "image" || key === "path" || key === "filepath") {
			imagePaths.push(val);
		}
	}

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality: modality as any,
		imagePaths,
	};
}

/**
 * Parses SLIDA XML response descriptor.
 */
export function parseSlidaXmlResponse(xmlContent: string): SlidaResponse {
	if (!xmlContent || typeof xmlContent !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty XML content" };
	}
	const statusMatch = xmlContent.match(/status=["']([^"']+)["']/i);
	const status = statusMatch ? statusMatch[1]!.toUpperCase() : "OK";

	const patMatch = xmlContent.match(/<Patient[^>]*id=["']([^"']+)["']/i) || xmlContent.match(/<Id>([^<]+)<\/Id>/i);
	const patientId = patMatch ? patMatch[1]!.trim() : undefined;

	const picToothMatch = xmlContent.match(/tooth=["']([^"']+)["']/i) || xmlContent.match(/<Tooth>([^<]+)<\/Tooth>/i);
	const toothCode = picToothMatch ? picToothMatch[1]!.trim() : undefined;

	const fileMatches: string[] = [];
	const fileAttrRegex = /(?:file|path|image)=["']([^"']+)["']/gi;
	let match: RegExpExecArray | null;
	while ((match = fileAttrRegex.exec(xmlContent)) !== null) {
		fileMatches.push(match[1]!);
	}
	const fileTagRegex = /<(?:File|Path|Image)>([^<]+)<\/(?:File|Path|Image)>/gi;
	while ((match = fileTagRegex.exec(xmlContent)) !== null) {
		fileMatches.push(match[1]!.trim());
	}

	const modalityMatch = xmlContent.match(/modality=["']([^"']+)["']/i) || xmlContent.match(/<Modality>([^<]+)<\/Modality>/i);
	const modality = modalityMatch ? (modalityMatch[1]!.trim().toUpperCase() as any) : undefined;

	return {
		success: status === "OK" || status === "SUCCESS",
		status,
		patientId,
		toothCode,
		modality,
		imagePaths: Array.from(new Set(fileMatches)),
	};
}

/**
 * Universal SLIDA response parser (auto-detects XML or INI).
 */
export function parseSlidaResponse(content: string): SlidaResponse {
	if (!content || typeof content !== "string") {
		return { success: false, status: "ERROR", imagePaths: [], error: "Empty content" };
	}
	if (content.trim().startsWith("<")) {
		return parseSlidaXmlResponse(content);
	}
	return parseSlidaIniResponse(content);
}

/**
 * Generates EzDent-i Link.ini content for Vatech bridge.
 */
export function generateEzDentLinkContent(patient: SlidaPatientDescriptor): string {
	const rawBirth = (patient.birthDate || "19800101").replace(/[-.]/g, "");
	const birthDate = rawBirth.slice(0, 8);
	const fullName = [patient.lastName, patient.firstName, patient.middleName].filter(Boolean).join(" ");
	const genderCode = patient.gender === "F" ? "F" : "M";

	const lines = [
		"[Patient]",
		`ChartNo=${patient.patientId}`,
		`Name=${fullName}`,
		`BirthDay=${birthDate}`,
		`Gender=${genderCode}`,
		"",
		"[Command]",
		"Execute=PatientView",
	];

	if (patient.toothCode) {
		lines.push(`ToothNo=${patient.toothCode}`);
	}

	return `${lines.join("\r\n")}\r\n`;
}
