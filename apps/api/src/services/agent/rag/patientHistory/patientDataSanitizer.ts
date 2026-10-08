/**
 * patientDataSanitizer.ts — Layer 1 152-FZ Personal Data Sanitizer.
 * 
 * Anonymizes sensitive personal identifiable information (PII) such as
 * phone numbers, email addresses, Russian passports, SNILS, OMS insurance
 * numbers, bank cards, and direct patient names prior to LLM synthesis.
 */

import type { PatientHistoryMemoryChunk } from "./types.js";

const PHONE_REGEX = /(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}\b/g;
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const PASSPORT_RF_REGEX = /\b\d{2}\s*\d{2}\s*\d{6}\b/g;
const SNILS_REGEX = /\b\d{3}[-\s]?\d{3}[-\s]?\d{3}[-\s]?\d{2}\b/g;
const OMS_POLIS_REGEX = /\b\d{16}\b/g;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[ -]?){3}\d{4}\b/g;

/**
 * Anonymizes phone numbers, emails, passports, SNILS, OMS, and card numbers
 * in clinical text in compliance with 152-FZ.
 */
export function sanitizePatientHistoryPii(text: string): string {
	if (!text || typeof text !== "string") return "";

	let sanitized = text;

	// 1. Phone numbers
	sanitized = sanitized.replace(PHONE_REGEX, "[ТЕЛЕФОН_СКРЫТ]");

	// 2. Email addresses
	sanitized = sanitized.replace(EMAIL_REGEX, "[EMAIL_СКРЫТ]");

	// 3. Russian Passports
	sanitized = sanitized.replace(PASSPORT_RF_REGEX, "[ПАСПОРТ_СКРЫТ]");

	// 4. SNILS
	sanitized = sanitized.replace(SNILS_REGEX, "[СНИЛС_СКРЫТ]");

	// 5. OMS Insurance Policy
	sanitized = sanitized.replace(OMS_POLIS_REGEX, "[ОМС_СКРЫТ]");

	// 6. Bank / credit card numbers
	sanitized = sanitized.replace(CREDIT_CARD_REGEX, "[КАРТА_СКРЫТА]");

	return sanitized;
}

/**
 * Anonymizes exact patient name occurrences in clinical text.
 */
export function maskPatientNameInText(
	text: string,
	patientFullName?: string,
): string {
	if (!text || !patientFullName || patientFullName.trim().length === 0) {
		return text;
	}

	let result = text;
	const trimmedName = patientFullName.trim();
	const parts = trimmedName.split(/\s+/).filter((p) => p.length >= 2);

	// Mask full name
	const fullEscaped = trimmedName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	result = result.replace(new RegExp(fullEscaped, "gi"), "[ПАЦИЕНТ]");

	// Mask individual surname and name parts
	for (const part of parts) {
		if (part.length >= 3) {
			const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "[ПАЦИЕНТ]");
		}
	}

	return result;
}

/**
 * Sanitizes a clinical memory chunk for safe inclusion into LLM prompts (152-FZ).
 */
export function sanitizeClinicalChunkForLlm(
	chunk: PatientHistoryMemoryChunk,
	patientFullName?: string,
): PatientHistoryMemoryChunk {
	let sanitizedSummary = sanitizePatientHistoryPii(chunk.summary);
	let sanitizedContent = sanitizePatientHistoryPii(chunk.rawContent);

	if (patientFullName) {
		sanitizedSummary = maskPatientNameInText(sanitizedSummary, patientFullName);
		sanitizedContent = maskPatientNameInText(sanitizedContent, patientFullName);
	}

	return {
		...chunk,
		summary: sanitizedSummary,
		rawContent: sanitizedContent,
	};
}
