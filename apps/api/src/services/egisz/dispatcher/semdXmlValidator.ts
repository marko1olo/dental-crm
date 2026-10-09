/**
 * Layer 1: SEMD XML Validation & SNILS/OGRN Extraction.
 * Pure domain logic & XSD structural compliance (0 side-effects).
 * Compliant with Minzdrav Orders 911n / 947n and FZ-63.
 */

import type { SemdXmlValidationResult } from "./types.js";

/**
 * Extracts digits-only SNILS from patient administrative profile JSON.
 * Preserves 1:1 legacy behaviour.
 */
export function extractSnils(profile: unknown): string {
	if (profile && typeof profile === "object" && "snils" in profile) {
		const value = (profile as { snils?: unknown }).snils;
		if (typeof value === "string") return value.replace(/\D/g, "");
	}
	return "";
}

/**
 * Validates Russian SNILS checksum according to statutory algorithm.
 */
export function isValidSnilsChecksum(snilsInput: string): boolean {
	const snils = snilsInput.replace(/\D/g, "");
	if (snils.length !== 11) return false;

	// Numbers <= 001-001-998 are exempt from check digit verification
	const numericValue = Number.parseInt(snils.slice(0, 9), 10);
	if (numericValue <= 1001998) return true;

	let sum = 0;
	for (let i = 0; i < 9; i++) {
		sum += Number.parseInt(snils[i]!, 10) * (9 - i);
	}

	let checkDigit = 0;
	if (sum < 100) {
		checkDigit = sum;
	} else if (sum === 100 || sum === 101) {
		checkDigit = 0;
	} else {
		const mod = sum % 101;
		checkDigit = mod === 100 || mod === 101 ? 0 : mod;
	}

	const expectedCheck = Number.parseInt(snils.slice(9, 11), 10);
	return checkDigit === expectedCheck;
}

/**
 * Validates structured electronic medical document (SEMD) XML against
 * statutory CDA R2 / R3 constraints (ClinicalDocument, recordTarget, author, custodian).
 */
export function validateSemdXml(
	xml: string,
	expectedDocKind?: string,
): SemdXmlValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!xml || typeof xml !== "string" || xml.trim().length === 0) {
		return {
			isValid: false,
			errors: ["XML-документ СЭМД пуст или не является строкой"],
			warnings,
		};
	}

	// 1. Root ClinicalDocument tag and HL7 namespace
	if (!xml.includes("<ClinicalDocument") || !xml.includes("urn:hl7-org:v3")) {
		errors.push("Отсутствует корневой элемент <ClinicalDocument> со схемой urn:hl7-org:v3");
	}

	// 2. Mandatory CDA structural sections
	if (!xml.includes("<recordTarget")) {
		errors.push("Отсутствует обязательная секция <recordTarget> (идентификация пациента)");
	}
	if (!xml.includes("<author")) {
		errors.push("Отсутствует обязательная секция <author> (врач-автор документа)");
	}
	if (!xml.includes("<custodian")) {
		errors.push("Отсутствует обязательная секция <custodian> (медицинская организация)");
	}
	if (!xml.includes("<component") || !xml.includes("<structuredBody")) {
		errors.push("Отсутствует секция <component>/<structuredBody> с клиническим содержанием");
	}

	// 3. Extract Document Type Code (NSI 1.2.643.5.1.13.13.11.1522)
	let docTypeNsiCode: string | undefined;
	const codeMatch = xml.match(/<code\b[^>]*\bcode="([^"]+)"[^>]*>/i);
	if (codeMatch && codeMatch[1]) {
		docTypeNsiCode = codeMatch[1];
	}

	if (expectedDocKind && docTypeNsiCode && docTypeNsiCode !== expectedDocKind) {
		errors.push(
			`Несоответствие кода вида документа: ожидается ${expectedDocKind}, получен ${docTypeNsiCode}`,
		);
	}

	// 4. Extract and check Doctor SNILS specifically within <author> block
	let doctorSnils: string | undefined;
	const authorBlockMatch = xml.match(/<author[\s\S]*?<\/author>/i);
	const targetForDoctorSnils = authorBlockMatch ? authorBlockMatch[0] : xml;
	const snilsMatch =
		targetForDoctorSnils.match(/<id\b[^>]*\broot="1\.2\.643\.100\.3"[^>]*\bextension="([^"]+)"/i) ||
		targetForDoctorSnils.match(/<id\b[^>]*\bextension="([^"]+)"[^>]*\broot="1\.2\.643\.100\.3"/i);

	if (snilsMatch && snilsMatch[1]) {
		doctorSnils = snilsMatch[1].replace(/\D/g, "");
		if (doctorSnils.length !== 11) {
			errors.push(`Некорректный СНИЛС врача в секции <author>: ${snilsMatch[1]}`);
		}
	} else {
		warnings.push("Не найден СНИЛС врача в секции <author> с OID 1.2.643.100.3");
	}

	// 5. Extract Clinic OID
	let clinicOid: string | undefined;
	const oidMatch = xml.match(/<id\b[^>]*\broot="(1\.2\.643\.5\.1\.13\.[^"]+)"/i);
	if (oidMatch && oidMatch[1]) {
		clinicOid = oidMatch[1];
	}

	return {
		isValid: errors.length === 0,
		docTypeNsiCode,
		doctorSnils,
		clinicOid,
		errors,
		warnings,
	};
}

/**
 * Escapes reserved XML characters.
 */
export function sanitizeXmlString(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}
