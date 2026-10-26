import { calculateSha256 } from "./patientWebappCrypto";
import type {
	SignableStatutoryDocument,
	PepSignatureAuditTrail,
} from "./patientWebappSigningTypes";

export function computeDocumentDigest(doc: SignableStatutoryDocument): string {
	const payload = [
		doc.id,
		doc.documentType,
		doc.documentNumber,
		doc.dateIso,
		doc.doctorFullName,
		doc.titleRu,
		doc.summaryTextRu,
		doc.fullTextHtml,
	].join("###");
	return calculateSha256(payload);
}

export function signDocumentWithPep(params: {
	document: SignableStatutoryDocument;
	patientPhone: string;
	smsOtpCode: string;
	signerFullName: string;
	signerPassport?: string;
	ipAddress?: string;
	userAgent?: string;
	timestampMs?: number;
}): SignableStatutoryDocument {
	const now = params.timestampMs ?? Date.now();
	const signedAtIso = new Date(now).toISOString();
	const documentDigest = computeDocumentDigest(params.document);

	let statutoryAct: "323-ФЗ ст. 20 (ИДС)" | "ПП РФ № 736 (Договор)" | "Приказ МЗ РФ № 804н (Акт)" = "323-ФЗ ст. 20 (ИДС)";
	if (params.document.documentType === "contract_736") {
		statutoryAct = "ПП РФ № 736 (Договор)";
	} else if (params.document.documentType === "act_804n") {
		statutoryAct = "Приказ МЗ РФ № 804н (Акт)";
	}

	const rawAuditTrailPayload = [
		params.document.id,
		params.document.documentNumber,
		params.patientPhone,
		params.smsOtpCode,
		params.signerFullName,
		params.signerPassport || "Паспорт РФ",
		now.toString(),
		statutoryAct,
		"63-ФЗ ст. 5, ст. 6 (ПЭП)",
		documentDigest,
	].join("|");

	const integritySha256 = calculateSha256(rawAuditTrailPayload);

	const signatureAudit: PepSignatureAuditTrail = {
		verificationMethod: "sms_63fz_pep",
		phone: params.patientPhone,
		smsOtpCode: params.smsOtpCode,
		integritySha256,
		timestampMs: now,
		signedAtIso,
		legalBasis: "63-ФЗ ст. 5, ст. 6 (ПЭП)",
		statutoryActBasis: statutoryAct,
		signerFullName: params.signerFullName,
		signerPassport: params.signerPassport,
		ipAddress: params.ipAddress || "127.0.0.1 (Web Portal PWA)",
		userAgent: params.userAgent || "DENTE Mobile WebApp / Capacitor PWA",
		documentDigest,
	};

	return {
		...params.document,
		status: "signed",
		signedAtIso,
		signatureAudit,
		pdfDownloadUrl: `/portal/documents/signed/${params.document.id}.pdf`,
	};
}
