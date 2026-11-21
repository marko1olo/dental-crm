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

import type {
	TaxDeductionCertificateParams,
	TaxDeductionBatchParams,
} from "../finance/tax/types.js";
import { TAX_DEDUCTION_RELATIONSHIP_MAP } from "../finance/tax/constants.js";
import {
	calculateTaxDeductionSummary,
	normalizePaymentsForTaxCertificate,
} from "../finance/tax/calculation.js";
import { resolveTaxDeductionCategoryShared } from "../finance/tax/classification.js";

function parseFioParts(fullName: string) {
	const parts = (fullName || "").trim().split(/\s+/);
	return {
		family: parts[0] || "",
		given: parts[1] || "",
		patronymic: parts.slice(2).join(" ") || undefined,
	};
}

export function mapCertificateParamsToFnsTaxPayload(
	params: TaxDeductionCertificateParams,
	filePrefix: "UT_SVOPLMEDUSL" | "NO_MEDOPL" = "UT_SVOPLMEDUSL",
): FnsTaxPayload {
	const rel = TAX_DEDUCTION_RELATIONSHIP_MAP[params.payer.relationship] || TAX_DEDUCTION_RELATIONSHIP_MAP.patient;
	const isSamePerson = rel.samePatientFlag === "1";

	const payerFio = parseFioParts(params.payer.fullName);
	const patientFio = isSamePerson ? payerFio : parseFioParts(params.patient.fullName);

	const summary = calculateTaxDeductionSummary(params.payments);
	const targetYear = summary.yearsSummary.find((y) => y.taxYear === params.taxYear) || {
		code01Kopecks: 0,
		code02Kopecks: 0,
		totalKopecks: 0,
	};

	const yearPayments = normalizePaymentsForTaxCertificate(params.payments, params.taxYear);
	const docDate = params.issueDateIso.slice(0, 10);
	const isIp = params.clinic.isSoleProprietor ?? (params.clinic.inn.replace(/\D/g, "").length === 12);

	return {
		filePrefix,
		taxInspectionCode: params.taxOfficeCode || "7701",
		documentDate: docDate,
		taxYear: params.taxYear,
		documentNumber: params.certificateNumber || "1",
		certificateKind: "1",
		clinic: {
			inn: params.clinic.inn,
			kpp: params.clinic.kpp,
			ogrn: params.clinic.ogrn || "1027700132195",
			name: params.clinic.legalName || "ООО СТОМАТОЛОГИЯ ДЕНТЕ",
			isIndividualEntrepreneur: isIp,
			ipFullName: isIp ? parseFioParts(params.clinic.chiefDoctorName || params.clinic.legalName) : undefined,
			license: params.clinic.licenseNumber
				? {
						number: params.clinic.licenseNumber,
						date: params.clinic.licenseDate || docDate,
				  }
				: undefined,
		},
		payer: {
			inn: params.payer.inn,
			snils: params.payer.snils,
			birthDate: params.payer.birthDate ? params.payer.birthDate.slice(0, 10) : "1980-01-01",
			fullName: payerFio,
			identityDocument: params.payer.identityDocumentNumber
				? {
						docTypeCode: "21",
						seriesAndNumber: `${params.payer.identityDocumentSeries ? params.payer.identityDocumentSeries + " " : ""}${params.payer.identityDocumentNumber}`.trim(),
						issueDate: params.payer.identityDocumentIssueDate,
						issuedBy: params.payer.identityDocumentIssuedBy,
				  }
				: undefined,
		},
		patient: {
			patientKinshipCode: rel.code as any,
			fullName: patientFio,
			birthDate: params.patient.birthDate ? params.patient.birthDate.slice(0, 10) : undefined,
			inn: params.patient.inn,
			snils: params.patient.snils,
			identityDocument: params.patient.identityDocumentNumber
				? {
						docTypeCode: "21",
						seriesAndNumber: `${params.patient.identityDocumentSeries ? params.patient.identityDocumentSeries + " " : ""}${params.patient.identityDocumentNumber}`.trim(),
				  }
				: undefined,
		},
		expenses: {
			code1AmountKopecks: targetYear.code01Kopecks,
			code2AmountKopecks: targetYear.code02Kopecks,
		},
		receipts: yearPayments.map((p, idx) => ({
			id: p.id || `rec-${idx + 1}`,
			receiptNumber: p.receiptNumber || String(idx + 1),
			fiscalDocumentNumber: p.fiscalDocumentNumber || String(idx + 1),
			fiscalSign: p.fiscalSign || "",
			receiptDate: p.dateIso.slice(0, 10),
			serviceName: p.serviceName,
			code804n: p.code804n,
			deductionCode: ((p.taxCode === "2" || p.taxCode === "1")
				? p.taxCode
				: resolveTaxDeductionCategoryShared(p.code804n, p.serviceName)) as "1" | "2",
			amountRub: p.amountRub,
			amountKopecks: p.amountKopecks ?? Math.round(p.amountRub * 100),
		})),
		signatory: {
			signatoryRole: (params.signer?.signerType || "1") as "1" | "2",
			fullName: parseFioParts(params.signer?.fullName || params.clinic.chiefDoctorName || "Главный врач"),
		},
	};
}

export function generateFnsTaxDeductionXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	const payload = mapCertificateParamsToFnsTaxPayload(params, "UT_SVOPLMEDUSL");
	const res = baseBuildFnsKnd1151156Xml(payload);
	return {
		fileName: res.fileName,
		fileId: res.fileId,
		xmlContent: res.xmlContent,
	};
}

export function generateFnsNoMedoplXml(params: TaxDeductionCertificateParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
} {
	const payload = mapCertificateParamsToFnsTaxPayload(params, "NO_MEDOPL");
	const res = baseBuildFnsKnd1151156Xml(payload);
	return {
		fileName: res.fileName,
		fileId: res.fileId,
		xmlContent: res.xmlContent,
	};
}

export function generateFnsTaxDeductionBatchXml(batch: TaxDeductionBatchParams): {
	fileName: string;
	fileId: string;
	xmlContent: string;
	certificatesCount: number;
} {
	if (!batch.certificates || batch.certificates.length === 0) {
		throw new Error("Пакет налоговых справок пуст");
	}
	const primaryCert = batch.certificates[0]!;
	const primaryPayload = mapCertificateParamsToFnsTaxPayload(primaryCert, "UT_SVOPLMEDUSL");
	const firstRes = baseBuildFnsKnd1151156Xml(primaryPayload);

	if (batch.certificates.length === 1) {
		return {
			fileName: firstRes.fileName,
			fileId: firstRes.fileId,
			xmlContent: firstRes.xmlContent,
			certificatesCount: 1,
		};
	}

	const docBlocks: string[] = [];
	for (const cert of batch.certificates) {
		const payload = mapCertificateParamsToFnsTaxPayload(cert, "UT_SVOPLMEDUSL");
		const res = baseBuildFnsKnd1151156Xml(payload);
		const match = res.xmlContent.match(/<Документ[\s\S]*?<\/Документ>/);
		if (match) {
			docBlocks.push(match[0]);
		}
	}

	const batchXml = `<?xml version="1.0" encoding="UTF-8"?>\n<Файл ИдФайл="${firstRes.fileId}" ВерсПрог="DentalMIS_FNS_Gateway_v2.4.0" ВерсФорм="5.01">\n${docBlocks.join("\n")}\n</Файл>`;

	return {
		fileName: firstRes.fileName,
		fileId: firstRes.fileId,
		xmlContent: batchXml,
		certificatesCount: batch.certificates.length,
	};
}

