import type { DocumentKind, GeneratedDocument } from "@dental/shared";

export function computeNavCategoryCounts(params: {
	typedActiveDocuments: GeneratedDocument[];
	intakeKinds: Set<DocumentKind>;
	clinicalKinds: Set<DocumentKind>;
	financeTaxKinds: Set<DocumentKind>;
	certificatesSanpinKinds: Set<DocumentKind>;
}) {
	return {
		all: params.typedActiveDocuments.length,
		intake: params.typedActiveDocuments.filter((d) => params.intakeKinds.has(d.kind)).length,
		clinical: params.typedActiveDocuments.filter((d) => params.clinicalKinds.has(d.kind)).length,
		finance_tax: params.typedActiveDocuments.filter((d) => params.financeTaxKinds.has(d.kind)).length,
		certificates_sanpin: params.typedActiveDocuments.filter((d) =>
			params.certificatesSanpinKinds.has(d.kind),
		).length,
	};
}

export function computeDocumentIssueMissingSteps(params: {
	documentIssueSignedAt?: string;
	documentIssueRecipientFullName?: string;
	documentIssueRecipientRole?: string;
}): string[] {
	return [
		!String(params.documentIssueSignedAt || "").trim() ? "укажите дату и время подписи" : null,
		!String(params.documentIssueRecipientFullName || "").trim() ? "укажите получателя" : null,
		!String(params.documentIssueRecipientRole || "").trim() ? "укажите статус получателя" : null,
	].filter(Boolean) as string[];
}
