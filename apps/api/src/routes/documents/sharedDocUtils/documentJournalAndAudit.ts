import { createHash, randomUUID } from "node:crypto";
import {
	type DocumentIssueSignatureAttestation,
	type DocumentReleaseJournalEntry,
	type DocumentReleaseMaterialKind,
	type GeneratedDocument,
	type Patient,
	documentAuditFactsSchema,
	documentKindMetadata,
} from "@dental/shared";
import {
	getDocumentRenderContextFromDb,
	readIssuedDocumentSnapshot,
} from "../../../db/documentQuery.js";
import {
	type DocumentRenderContext,
	documentIssueBlockReason,
} from "../../../documents/renderDocument.js";
import { repairMojibakeText } from "../../../text/repairMojibake.js";
import {
	documentHasIssuedArchiveMetadata,
	documentRequiresIssuedArchive,
} from "./archiveAndPdfRenderer.js";
import {
	documentIssueChainBlockReason,
	findIssuedMedicalCopyRequestForRelease,
} from "./documentValidationRules.js";
import { taxXmlSourceSnapshotSha256 } from "./taxCertificateEngine.js";

function releaseMaterialKindForDelivery(
	deliveryMethod: DocumentReleaseJournalEntry["deliveryMethod"],
	documentTypes: readonly string[] = [],
	includeDicomSourceData = false,
): DocumentReleaseMaterialKind {
	if (deliveryMethod === "dicom_archive") return "dicom_archive";
	if (
		includeDicomSourceData ||
		documentTypes.some((type) => /dicom|кт|cbct|сним/i.test(type))
	)
		return "mixed";
	if (deliveryMethod === "other") return "other";
	return "copy";
}

function releaseSourceSnapshotSha256(
	document: GeneratedDocument,
	scope: string,
): string {
	return createHash("sha256")
		.update(
			JSON.stringify({
				schema: "dente.medical-release-source.v1",
				scope,
				documentId: document.id,
				organizationId: document.organizationId,
				patientId: document.patientId,
				visitId: document.visitId,
				kind: document.kind,
				status: document.status,
				issuedAt: document.issuedAt ?? null,
				totalAmountRub: document.totalAmountRub ?? null,
				payload: document.payload ?? null,
			}),
			"utf8",
		)
		.digest("hex");
}

export async function buildMedicalDocumentReleaseJournalEntry(
	document: GeneratedDocument,
	issuedAt: string,
	signatureAttestation: DocumentIssueSignatureAttestation,
): Promise<DocumentReleaseJournalEntry | null> {
	const responsibleStaff =
		`${signatureAttestation.staffRole} ${signatureAttestation.staffFullName}`.trim();
	if (document.kind === "medical_record_copy_request") {
		const payload = document.payload?.medicalRecordCopyRequest;
		if (!payload) return null;
		return {
			id: randomUUID(),
			entryKind: "request_registered",
			documentId: document.id,
			sourceRequestDocumentId: null,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId,
			materialKind: releaseMaterialKindForDelivery(
				payload.requestedFormat,
				payload.requestedDocumentTypes,
				payload.includeDicomSourceData,
			),
			deliveryMethod: payload.requestedFormat,
			documentTypes: payload.requestedDocumentTypes,
			periodStart: payload.periodStart ?? null,
			periodEnd: payload.periodEnd ?? null,
			recipientFullName: payload.recipientFullName,
			recipientIdentityDocument: payload.recipientIdentityDocument,
			recipientAuthority: payload.recipientAuthority,
			deliveredAt: payload.requestedAt,
			retentionPolicy: `Запрос зарегистрирован в DENTE; ответственный: ${responsibleStaff}. Фактическая выдача закрывается отдельной распиской о передаче медицинской документации.`,
			sourceSnapshotSha256: releaseSourceSnapshotSha256(
				document,
				"copy_request",
			),
			createdAt: issuedAt,
			createdByUserId: null,
		};
	}

	if (document.kind === "medical_record_extract") {
		const payload = document.payload?.medicalRecordExtract;
		if (!payload) return null;
		return {
			id: randomUUID(),
			entryKind: "extract_issued",
			documentId: document.id,
			sourceRequestDocumentId: null,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId,
			materialKind: "extract",
			deliveryMethod: "paper",
			documentTypes: ["Выписка из медицинской карты"],
			periodStart: payload.periodStart,
			periodEnd: payload.periodEnd,
			recipientFullName: payload.recipientFullName,
			recipientIdentityDocument: null,
			recipientAuthority: payload.recipientAuthority,
			deliveredAt: payload.issuedAt || issuedAt,
			retentionPolicy: `Выданная выписка и отметка подписания хранятся вместе с неизменяемым HTML/PDF архивом документа; ответственный: ${responsibleStaff}.`,
			sourceSnapshotSha256: releaseSourceSnapshotSha256(
				document,
				"medical_record_extract",
			),
			createdAt: issuedAt,
			createdByUserId: null,
		};
	}

	if (document.kind === "medical_document_release_receipt") {
		const payload = document.payload?.medicalDocumentReleaseReceipt;
		if (!payload) return null;
		const sourceRequest =
			await findIssuedMedicalCopyRequestForRelease(document);
		return {
			id: randomUUID(),
			entryKind: "release_completed",
			documentId: document.id,
			sourceRequestDocumentId: payload.sourceRequestDocumentId,
			organizationId: document.organizationId,
			patientId: document.patientId,
			visitId: document.visitId,
			materialKind: releaseMaterialKindForDelivery(
				payload.releaseChannel,
				payload.documentTypes,
			),
			deliveryMethod: payload.releaseChannel,
			documentTypes: payload.documentTypes,
			periodStart: payload.periodStart ?? null,
			periodEnd: payload.periodEnd ?? null,
			recipientFullName: payload.recipientFullName,
			recipientIdentityDocument: payload.recipientIdentityDocument,
			recipientAuthority: payload.recipientAuthority,
			deliveredAt: payload.deliveredAt,
			retentionPolicy:
				payload.releaseChannel === "secure_link"
					? `Защищенная ссылка и срок доступа фиксируются в расписке${payload.accessExpiresAt ? ` до ${payload.accessExpiresAt}` : ""}; ответственный: ${responsibleStaff}.`
					: `Факт передачи, состав документов и канал выдачи хранятся с архивной распиской DENTE; ответственный: ${responsibleStaff}.`,
			sourceSnapshotSha256:
				sourceRequest?.issuedSnapshotSha256 ??
				releaseSourceSnapshotSha256(document, "release_receipt"),
			createdAt: issuedAt,
			createdByUserId: null,
		};
	}

	return null;
}

export async function resolveDocumentRenderContext(
	organizationId: string,
	patientId?: string,
): Promise<DocumentRenderContext> {
	try {
		return (await getDocumentRenderContextFromDb(
			organizationId,
			patientId,
		)) as DocumentRenderContext;
	} catch (error) {
		console.error("[documents] Не удалось собрать контекст рендеринга:", error);
		return {};
	}
}

export async function buildDocumentAuditFacts(
	document: GeneratedDocument,
	patient: Patient,
) {
	const renderContext = await getDocumentRenderContextFromDb(
		document.organizationId,
		patient.id,
	);
	const issueBlockReason =
		document.status === "draft"
			? ((await documentIssueBlockReason(document, patient, renderContext)) ??
				(await documentIssueChainBlockReason(document)))
			: null;
	const issuedArchiveRequired = documentRequiresIssuedArchive(document);
	const issuedSnapshot = readIssuedDocumentSnapshot(document);
	const immutableSnapshotReady = Boolean(
		issuedSnapshot &&
			documentHasIssuedArchiveMetadata(document) &&
			issuedArchiveRequired,
	);
	const hasIssueSignatureAttestation = Boolean(document.signatureAttestation);
	const blockers = [
		issueBlockReason,
		issuedArchiveRequired && !immutableSnapshotReady
			? "Архивная HTML-копия выданного документа отсутствует или не прошла проверку sha256."
			: null,
		issuedArchiveRequired && !hasIssueSignatureAttestation
			? "Для PDF/XML выгрузки нужна отметка подписания и получения документа."
			: null,
	]
		.filter((value): value is string => Boolean(value))
		.map(repairMojibakeText);
	const warnings = [
		document.status === "draft"
			? "Документ еще не выдан. HTML доступен как предпросмотр, но не как архивная копия."
			: null,
		document.status === "voided"
			? "Документ аннулирован. Архивная копия сохранена только для проверки истории выдачи."
			: null,
		document.status === "voided" && document.voidAttestation
			? `Причина аннулирования: ${document.voidAttestation.reasonText}`
			: null,
		document.kind === "tax_deduction_certificate"
			? "XML КНД выгружается как проверяемый файл данных. Подпись, отправка в ФНС и XSD-валидация должны выполняться отдельным контуром."
			: null,
	]
		.filter((value): value is string => Boolean(value))
		.map(repairMojibakeText);
	const metadata = documentKindMetadata[document.kind];
	const htmlPreviewUrl = `/api/documents/${document.id}/html`;
	const htmlDownloadUrl = immutableSnapshotReady
		? `${htmlPreviewUrl}?download=1`
		: null;
	const treatmentPlanPdfUrl =
		document.kind === "treatment_plan" && document.status === "draft"
			? `/api/documents/${document.id}/treatment-plan-pdf`
			: null;
	const pdfDownloadUrl =
		treatmentPlanPdfUrl ??
		(immutableSnapshotReady && hasIssueSignatureAttestation
			? `/api/documents/${document.id}/pdf`
			: null);
	const canExportFnsXml =
		document.kind === "tax_deduction_certificate" &&
		document.status === "issued" &&
		immutableSnapshotReady &&
		hasIssueSignatureAttestation &&
		blockers.length === 0;
	const taxXmlSourceSnapshotDigest = taxXmlSourceSnapshotSha256(
		document.taxXmlSourceSnapshot,
	);
	const taxXmlOfficialValidationStatus =
		document.kind === "tax_deduction_certificate" &&
		(taxXmlSourceSnapshotDigest || document.taxXmlSnapshot)
			? "external_validation_required"
			: "not_applicable";
	const taxXmlOfficialValidationNote =
		taxXmlOfficialValidationStatus === "external_validation_required"
			? "DENTE хранит только черновик XML и внутреннюю предпроверку. Официальная XSD-валидация, КЭП и отправка ЭДО/ТКС выполняются вне DENTE."
			: null;

	return documentAuditFactsSchema.parse({
		documentId: document.id,
		organizationId: document.organizationId,
		patientId: document.patientId,
		visitId: document.visitId,
		kind: document.kind,
		title: document.title,
		status: document.status,
		issuedAt: document.issuedAt,
		issuedByUserId: document.issuedByUserId ?? null,
		signatureAttestation: document.signatureAttestation ?? null,
		voidAttestation: document.voidAttestation ?? null,
		releaseJournalEntry: document.releaseJournalEntry ?? null,
		generatedAt: new Date().toISOString(),
		snapshotSha256: document.issuedSnapshotSha256 ?? null,
		snapshotCreatedAt: document.issuedSnapshotCreatedAt ?? null,
		immutableSnapshotReady,
		canPreviewHtml: blockers.length === 0 || immutableSnapshotReady,
		canDownloadHtml: Boolean(htmlDownloadUrl),
		canExportPdf: Boolean(pdfDownloadUrl),
		canExportFnsXml,
		htmlPreviewUrl,
		htmlDownloadUrl,
		pdfDownloadUrl,
		taxXmlDownloadUrl: canExportFnsXml
			? `/api/documents/${document.id}/tax-xml`
			: null,
		taxXmlSourceSnapshotSha256: taxXmlSourceSnapshotDigest,
		taxXmlSnapshotSha256: document.taxXmlSnapshot?.sha256 ?? null,
		taxXmlSnapshotCreatedAt: document.taxXmlSnapshot?.createdAt ?? null,
		taxXmlOfficialValidationStatus,
		taxXmlOfficialValidationNote,
		sourceStatus: metadata.sourceStatus,
		sourceAuthority: metadata.sourceAuthority,
		sourceReference: metadata.sourceReference,
		sourceNote: metadata.sourceNote,
		sourceCheckedAt: metadata.sourceCheckedAt,
		sourceUrls: [...metadata.sourceUrls],
		blockers,
		warnings,
		cryptoSignaturePkcs7: document.cryptoSignaturePkcs7 ?? null,
		doctorCertSerial: document.doctorCertSerial ?? null,
		doctorCertSubject: document.doctorCertSubject ?? null,
		doctorSignedAt: document.doctorSignedAt
			? String(document.doctorSignedAt)
			: null,
	});
}
