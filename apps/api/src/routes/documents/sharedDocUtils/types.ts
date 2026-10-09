import type { TaxDeductionApplicationRelationship } from "@dental/shared";
import { repairMojibakeText } from "../../../text/repairMojibake.js";

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
