import {
	type DocumentIngestionResponse,
	type DocumentVoidReasonCode,
	type GeneratedDocument,
	documentKindMetadata,
} from "@dental/shared";
import { defaultUiPreferences } from "../../utils/preferencesUtils";

export const documentVoidReasonLabels: Record<DocumentVoidReasonCode, string> = {
	draft_error: "Ошибка в черновике",
	issued_in_error: "Документ выдан с ошибкой",
	patient_request: "Запрос пациента или представителя",
	duplicate_document: "Дубль документа",
	tax_certificate_correction: "Коррекция налоговой справки",
	medical_release_correction: "Коррекция выдачи меддокументов",
	payment_correction: "Коррекция оплаты или чека",
	other: "Другая причина",
};

export const documentIngestionQualityLabels: Record<
	DocumentIngestionResponse["quality"]["extractionQuality"],
	string
> = {
	ready: "Можно открыть предпросмотр",
	review: "Нужна ручная проверка",
	ocr_required: "Нужен OCR / vision",
	unsupported: "Формат не разобран",
};

export const documentDetectedKindLabels: Record<string, string> = {
	archive: "архив",
	csv: "таблица",
	docx: "документ Word",
	html: "веб-страница",
	image: "изображение",
	json: "структурированный текст",
	legacy_database: "старая база",
	legacy_dump: "резервная копия старой базы",
	ods: "таблица",
	odt: "документ",
	pdf: "PDF",
	pptx: "презентация",
	rtf: "текстовый документ",
	spreadsheet: "таблица",
	text: "текст",
	unknown: "не определено",
	xlsx: "таблица Excel",
	xml: "структурированный текст",
	zip: "архив",
};

export function documentDetectedKindLabel(kind: string): string {
	return documentDetectedKindLabels[kind] ?? "файл";
}

export function isDocumentKindPreference(
	value: unknown,
): value is GeneratedDocument["kind"] {
	return typeof value === "string" && value in documentKindMetadata;
}

export function normalizedDocumentKind(
	value: unknown,
): GeneratedDocument["kind"] {
	return isDocumentKindPreference(value)
		? value
		: defaultUiPreferences.selectedDocumentKind;
}

export function normalizedDocumentVoidReasonCode(
	value: unknown,
): DocumentVoidReasonCode {
	return typeof value === "string" && value in documentVoidReasonLabels
		? (value as DocumentVoidReasonCode)
		: "draft_error";
}

export function confirmedDocumentLiteral(value: boolean, label: string): true {
	if (!value) {
		throw new Error(
			`Не подтверждено обязательное условие документа: ${label}.`,
		);
	}
	return true;
}

export function documentTextLines(value: string): string[] {
	return value
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
}

export function compactDocumentText(
	...values: Array<string | null | undefined>
): string {
	return values
		.map((value) => value?.trim() ?? "")
		.filter(Boolean)
		.join("\n");
}
