/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FNS STATUTORY MEDICAL TAX DEDUCTION XML ENGINE (ПРИКАЗ ФНС № ЕД-7-11/755@)
 * KND 1151156 / Electronic XML Format KND 1184043 (UT_SVOPLMEDUSL Version 5.01)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Transparent facade delegating to canonical @dental/shared implementation
 * (packages/shared/src/documents/ndflXmlGenerator.ts).
 * Complies with Mandates 8s, 8j, 8l (Single Source of Truth).
 */

import {
	buildFnsKnd1151156Xml,
	cleanDigits,
	escapeXmlAttr,
	type FnsClinicInfo,
	type FnsFiscalReceiptItem,
	type FnsKinshipCode,
	type FnsNdflXmlResult,
	type FnsPatientInfo,
	type FnsPersonInfo,
	type FnsPreflightIssue,
	type FnsTaxPayload,
	formatFnsRuDate,
	generateFnsFileNameAndId,
	generateFnsNdflPrintHtml as sharedGenerateFnsNdflPrintHtml,
	preflightValidatePayload as sharedPreflightValidatePayload,
	rublesFromKopecks,
	type SupportedTaxYear,
} from "@dental/shared";

export {
	cleanDigits,
	escapeXmlAttr,
	formatFnsRuDate,
	rublesFromKopecks,
	type FnsPreflightIssue,
	type FnsNdflXmlResult,
};

export type FnsNdflClinicMetadata = FnsClinicInfo;
export type FnsNdflPayerMetadata = FnsPersonInfo;

export interface FnsNdflPatientMetadata extends Partial<FnsPatientInfo> {
	kinshipCode: FnsKinshipCode;
}

export type FnsNdflFiscalReceiptItem = FnsFiscalReceiptItem;

export interface FnsNdflXmlPayload {
	documentNumber: string;
	documentDate: string | Date;
	taxYear: SupportedTaxYear | number;
	taxInspectionCode?: string | undefined;
	certificateKind?: "1" | "2" | "3" | undefined;
	correctionNumber?: number | undefined;
	softwareVersion?: string | undefined;
	clinic: FnsNdflClinicMetadata;
	payer: FnsNdflPayerMetadata;
	patient: FnsNdflPatientMetadata;
	receipts: FnsNdflFiscalReceiptItem[];
	signatory?: {
		signatoryRole: "1" | "2";
		fullName: {
			family: string;
			given: string;
			patronymic?: string | undefined;
		};
		snils?: string | undefined;
		powerOfAttorneyNumber?: string | undefined;
	} | undefined;
}

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

/**
 * Генерация уникального ИдФайл и имени файла по стандарту ФНС РФ:
 * UT_SVOPLMEDUSL_<КодНО>_<КодНО>_<ИдОтпр>_<ДатаДокГГГГММДД>_<UUID>
 */
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

/**
 * Валидация входных данных перед генерацией XML.
 */
export function preflightValidatePayload(payload: FnsNdflXmlPayload): FnsPreflightIssue[] {
	return sharedPreflightValidatePayload(adaptPayloadToShared(payload));
}

/**
 * Основной генератор XML по Приказу ФНС России № ЕД-7-11/755@ (КНД 1184043).
 */
export function generateFnsNdflXml(
	payload: FnsNdflXmlPayload,
	customUuid?: string,
): FnsNdflXmlResult {
	return buildFnsKnd1151156Xml(adaptPayloadToShared(payload), customUuid);
}

/**
 * Генерация печатного HTML документа "Справка об оплате медицинских услуг"
 * (Приложение № 1 к приказу ФНС России от 08.11.2023 № ЕА-7-11/824@ / форма по КНД 1151156).
 */
export function generateFnsNdflPrintHtml(payload: FnsNdflXmlPayload): string {
	return sharedGenerateFnsNdflPrintHtml(adaptPayloadToShared(payload));
}
