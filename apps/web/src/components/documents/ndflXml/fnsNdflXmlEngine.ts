/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML ENGINE
 * KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL Version 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 * Transparent facade delegating to canonical @dental/shared implementation.
 */

import {
	buildFnsKnd1151156Xml,
	cleanDigits,
	escapeXmlAttr,
	type FnsKinshipCode,
	type FnsNdflXmlResult,
	type FnsPreflightIssue,
	type FnsTaxPayload,
	formatFnsRuDate,
	generateFnsFileNameAndId,
	generateFnsNdflPrintHtml as sharedGenerateFnsNdflPrintHtml,
	preflightValidatePayload as sharedPreflightValidatePayload,
	rublesFromKopecks,
} from "@dental/shared";
import type { FnsNdflXmlPayload } from "./types";

export * from "./types";
export {
	cleanDigits,
	escapeXmlAttr,
	formatFnsRuDate,
	rublesFromKopecks,
	type FnsPreflightIssue,
	type FnsNdflXmlResult,
};

/** Разделение полного ФИО на Фамилию, Имя, Отчество */
export function parseFio(fullNameStr: string): {
	family: string;
	given: string;
	patronymic?: string | undefined;
} {
	const parts = (fullNameStr || "").trim().split(/\s+/).filter(Boolean);
	return {
		family: parts[0] || "",
		given: parts[1] || "",
		patronymic: parts.slice(2).join(" ") || undefined,
	};
}

export function generateFnsFileName(
	taxOfficeCode: string,
	senderInn: string,
	senderKpp: string | undefined,
	documentDate: string,
	customUuid?: string,
): { fileName: string; fileId: string; uuid: string } {
	return generateFnsFileNameAndId(
		taxOfficeCode,
		senderInn,
		senderKpp,
		documentDate,
		customUuid,
		"UT_SVOPLMEDUSL",
	);
}

function adaptPayloadToShared(payload: FnsNdflXmlPayload): FnsTaxPayload {
	const kinship =
		(payload.patient as unknown as { patientKinshipCode?: FnsKinshipCode }).patientKinshipCode ??
		payload.patient.kinshipCode ??
		"1";

	return {
		documentNumber: payload.documentNumber,
		documentDate: payload.documentDate,
		taxYear: payload.taxYear,
		taxInspectionCode: payload.taxInspectionCode,
		certificateKind: payload.certificateKind,
		correctionNumber: payload.correctionNumber,
		filePrefix: "UT_SVOPLMEDUSL",
		softwareVersion: payload.softwareVersion,
		clinic: payload.clinic,
		payer: payload.payer,
		patient: {
			...payload.patient,
			patientKinshipCode: kinship,
		},
		expenses: {},
		signatory: payload.signatory,
		receipts: payload.receipts,
	};
}

export function preflightValidatePayload(payload: FnsNdflXmlPayload): FnsPreflightIssue[] {
	return sharedPreflightValidatePayload(adaptPayloadToShared(payload));
}

export function generateFnsNdflXml(
	payload: FnsNdflXmlPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	return buildFnsKnd1151156Xml(adaptPayloadToShared(payload), customUuid);
}

export function generateFnsNdflPrintHtml(payload: FnsNdflXmlPayload): string {
	return sharedGenerateFnsNdflPrintHtml(adaptPayloadToShared(payload));
}
