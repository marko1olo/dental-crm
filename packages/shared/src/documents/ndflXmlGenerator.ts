/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML GENERATOR & EDI ENGINE
 * Form KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 * Canonical backward-compatible facade delegating to modular DAG in ./ndfl/
 */

export * from "./ndfl/index.js";
export type * from "./ndfl/index.js";

import {
	buildFnsKnd1151156Xml as baseBuildFnsKnd1151156Xml,
	generateFnsNdflPrintHtml as baseGenerateFnsNdflPrintHtml,
	generateFnsFileNameAndId,
	preflightValidatePayload as basePreflightValidatePayload,
	type FnsKinshipCode,
	type FnsNdflXmlResult,
	type FnsPreflightIssue,
	type FnsNdflPrintSigningOptions,
	type FnsTaxPayload,
} from "./ndfl/index.js";

export type FnsNdflXmlPayload = Omit<FnsTaxPayload, "patient" | "expenses"> & {
	patient: Partial<FnsTaxPayload["patient"]> & { kinshipCode?: string | undefined };
	expenses?: Partial<FnsTaxPayload["expenses"]> | undefined;
	filePrefix?: string | undefined;
};

export function normalizeFnsPayload(raw: FnsTaxPayload | FnsNdflXmlPayload): FnsTaxPayload {
	const p = raw as FnsNdflXmlPayload;
	const kinship: FnsKinshipCode =
		((raw as FnsTaxPayload).patient?.patientKinshipCode ??
		p.patient?.kinshipCode ??
		"1") as FnsKinshipCode;

	return {
		...raw,
		filePrefix: ("filePrefix" in raw && typeof raw.filePrefix === "string" && raw.filePrefix) ? raw.filePrefix : "UT_SVOPLMEDUSL",
		patient: {
			...(raw.patient || {}),
			patientKinshipCode: kinship,
		},
		expenses: raw.expenses || {},
		receipts: raw.receipts || [],
	};
}

export function generateFnsNdflXml(
	payload: FnsTaxPayload | FnsNdflXmlPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	return baseBuildFnsKnd1151156Xml(normalizeFnsPayload(payload), customUuid);
}

export function generateFnsNdflPrintHtml(
	payload: FnsTaxPayload | FnsNdflXmlPayload,
	signingOptions?: FnsNdflPrintSigningOptions | boolean | undefined,
): string {
	return baseGenerateFnsNdflPrintHtml(normalizeFnsPayload(payload), signingOptions);
}

export function preflightValidatePayload(
	payload: FnsTaxPayload | FnsNdflXmlPayload,
): FnsPreflightIssue[] {
	return basePreflightValidatePayload(normalizeFnsPayload(payload));
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
