import {
	publicGeneratedDocumentSchema,
	type GeneratedDocument,
	type PublicGeneratedDocument,
	type TaxDeductionApplicationRelationship,
} from "@dental/shared";
import { repairMojibakeText } from "../../../text/repairMojibake.js";

/**
 * Проекция документа для публичного ответа API с исключением внутренних
 * полей хранения и сырых налоговых/XML снимков перед .strict() валидацией.
 */
export function toPublicGeneratedDocument(
	doc: GeneratedDocument,
): PublicGeneratedDocument {
	return publicGeneratedDocumentSchema.parse({
		id: doc.id,
		organizationId: doc.organizationId,
		patientId: doc.patientId,
		visitId: doc.visitId,
		kind: doc.kind,
		title: doc.title,
		status: doc.status,
		issuedAt: doc.issuedAt,
		totalAmountRub: doc.totalAmountRub,
		totalAmountKopecks: doc.totalAmountKopecks,
		taxYear: doc.taxYear,
		taxPayerInn: doc.taxPayerInn,
		signatureAttestation: doc.signatureAttestation,
		voidAttestation: doc.voidAttestation,
		releaseJournalEntry: doc.releaseJournalEntry,
		issuedSnapshotSha256: doc.issuedSnapshotSha256,
		issuedSnapshotCreatedAt: doc.issuedSnapshotCreatedAt,
		issuedByUserId: doc.issuedByUserId,
		voidedAt: doc.voidedAt,
		voidedByUserId: doc.voidedByUserId,
		signatureSvg: doc.signatureSvg,
		cryptoSignaturePkcs7: doc.cryptoSignaturePkcs7,
		doctorSignaturePkcs7: doc.doctorSignaturePkcs7,
		doctorCertSerial: doc.doctorCertSerial,
		doctorCertSubject: doc.doctorCertSubject,
		doctorSignedAt: doc.doctorSignedAt,
	});
}

export const issuedArchiveIntegrityError =
	"Архивная копия выданного документа отсутствует или не прошла проверку целостности.";

export const documentIssueValidationMessage =
	"Документ не выдан: подтвердите подпись или получение, проверку личности и ответственного сотрудника.";

export const documentVoidValidationMessage =
	"Документ не аннулирован: укажите причину, ответственного сотрудника, архив и проверку статуса.";

export function apiError(message: string, error = "DocumentOperationRejected") {
	return {
		error,
		message: repairMojibakeText(message),
	};
}

export function normalizedDocumentChainValue(
	value: string | null | undefined,
): string {
	return (value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ru-RU");
}

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized = normalizedDocumentChainValue(value);
	if (!normalized) return null;
	if (
		["self", "patient", "пациент", "сам", "сама", "лично"].includes(normalized)
	)
		return "self";
	if (["spouse", "супруг", "супруга", "муж", "жена"].includes(normalized))
		return "spouse";
	if (
		["parent", "родитель", "мать", "отец", "мама", "папа"].includes(normalized)
	)
		return "parent";
	if (["child", "сын", "дочь", "ребенок", "ребёнок"].includes(normalized))
		return "child";
	if (["ward", "опекун", "попечитель", "подопечный"].includes(normalized))
		return "ward";
	return null;
}

export type TaxCertificateAnnualTaxpayerScope = {
	inn: string;
	identityKey: string;
};
