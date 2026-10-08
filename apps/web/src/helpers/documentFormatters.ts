/**
 * @file apps/web/src/helpers/documentFormatters.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type DocumentIngestionResponse,
	type DocumentIngestionTarget,
	type DocumentVoidReasonCode,
	type GeneratedDocument,
	type ImportSourceKind,
	type PhotoVideoConsentMaterial,
	type PostVisitCareTopic,
	type ProcedureSpecificConsentProcedure,
	type TaxDeductionApplicationDeliveryChannel,
	type TaxDeductionApplicationForm,
	type TaxDeductionApplicationRelationship,
	documentKindMetadata,
} from "@dental/shared";
import {
	defaultUiPreferences,
} from "../utils/preferencesUtils";
import {
	postVisitCareTopicOptions,
} from "../workspaceStaticOptions";
import {
	isOptionValue,
	isRecordKey,
} from "./guardUtils";
import {
	type MedicalDocumentReleaseChannel,
} from "./types";

export const documentVoidReasonLabels: Record<DocumentVoidReasonCode, string> =
	{
		draft_error: "Ошибка в черновике",
		issued_in_error: "Документ выдан с ошибкой",
		patient_request: "Запрос пациента или представителя",
		duplicate_document: "Дубль документа",
		tax_certificate_correction: "Коррекция налоговой справки",
		medical_release_correction: "Коррекция выдачи меддокументов",
		payment_correction: "Коррекция оплаты или чека",
		other: "Другая причина",
	};

export const importSourceLabels: Record<
	ImportSourceKind,
	{ title: string; detail: string }
> = {
	csv_text: {
		title: "Таблица / Excel",
		detail: "Копипаст таблицы или списка с разделителями.",
	},
	xlsx_copy: {
		title: "Excel-вставка",
		detail: "Строки из Excel или Google Sheets без ручной подготовки.",
	},
	mis_export: {
		title: "Экспорт старой МИС",
		detail:
			"32top, IDENT, Cliniccards, Open Dental и другие форматы через адаптеры.",
	},
	image_ocr: {
		title: "Фото журнала",
		detail:
			"OCR/vision распознает фото бумажного журнала, затем показывает предпросмотр.",
	},
	voice_dictation: {
		title: "Диктовка",
		detail: "Надиктовка администратора превращается в строки пациентов.",
	},
	free_text: {
		title: "Свободный текст",
		detail: "Умный разбор: ФИО, телефон, дата рождения, комментарий.",
	},
};

export const ingestionTargetLabels: Record<DocumentIngestionTarget, string> = {
	smart_import: "Умный импорт",
	patients: "Пациенты",
	imaging: "Снимки",
	pricelist: "Прайс",
	plain_text: "Текст",
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

export function documentDetectedKindLabel(kind: string) {
	return documentDetectedKindLabels[kind] ?? "файл";
}

export const medicalDocumentReleaseChannelLabels: Record<
	MedicalDocumentReleaseChannel,
	string
> = {
	paper: "Бумага",
	pdf: "PDF",
	dicom_archive: "архив снимков",
	secure_link: "Защищенная ссылка",
	physical_media: "Физический носитель",
	other: "Иной канал",
};

export const taxApplicationRelationshipOptions: Array<{
	value: TaxDeductionApplicationRelationship;
	label: string;
}> = [
	{ value: "self", label: "Пациент сам" },
	{ value: "spouse", label: "Супруг / супруга" },
	{ value: "parent", label: "Родитель" },
	{ value: "child", label: "Ребенок" },
	{ value: "ward", label: "Подопечный" },
];

export const taxApplicationFormOptions: Array<{
	value: TaxDeductionApplicationForm;
	label: string;
}> = [
	{ value: "knd_1151156", label: "Справка для налогового вычета (с 2024)" },
	{ value: "legacy_2021_2023", label: "Старая справка, оплаты 2021-2023" },
];

export const taxApplicationDeliveryChannelOptions: Array<{
	value: TaxDeductionApplicationDeliveryChannel;
	label: string;
}> = [
	{ value: "paper", label: "Бумажно в клинике" },
	{ value: "pdf", label: "PDF после подписи" },
	{ value: "secure_link", label: "Защищенная ссылка" },
	{ value: "email", label: "Email" },
	{ value: "portal", label: "Личный кабинет" },
	{ value: "other", label: "Иной канал" },
];

export function normalizeTaxApplicationRelationship(
	value: string | null | undefined,
): TaxDeductionApplicationRelationship | null {
	const normalized =
		value
			?.trim()
			.toLocaleLowerCase("ru-RU")
			.replaceAll("ё", "е")
			.replace(/[\s_-]+/g, " ") ?? "";
	if (!normalized) return null;
	if (
		[
			"self",
			"patient",
			"пациент",
			"сам пациент",
			"сама пациентка",
			"налогоплательщик",
		].includes(normalized)
	)
		return "self";
	if (
		["spouse", "husband", "wife", "супруг", "супруга", "муж", "жена"].includes(
			normalized,
		)
	)
		return "spouse";
	if (
		[
			"parent",
			"father",
			"mother",
			"родитель",
			"отец",
			"мать",
			"папа",
			"мама",
		].includes(normalized)
	)
		return "parent";
	if (
		[
			"child",
			"son",
			"daughter",
			"ребенок",
			"сын",
			"дочь",
			"усыновленный",
			"усыновленная",
		].includes(normalized)
	)
		return "child";
	if (
		["ward", "подопечный", "подопечная", "опекаемый", "опекаемая"].includes(
			normalized,
		)
	)
		return "ward";
	return null;
}

export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{
		value: "therapy_endo_restoration",
		label: "Терапия, эндодонтия, реставрация",
	},
	{ value: "sedation", label: "Седация (ЗАКС / в/в)" },
	{ value: "surgery_extraction", label: "Хирургия / удаление" },
	{ value: "implantation_bone_graft", label: "Имплантация / костная пластика" },
	{ value: "prosthetics", label: "Ортопедия" },
	{ value: "orthodontics", label: "Ортодонтия" },
	{ value: "hygiene_whitening", label: "Гигиена / отбеливание" },
	{ value: "periodontology", label: "Пародонтология" },
	{ value: "other", label: "Другая процедура" },
];

export const photoVideoMaterialOptions: Array<{
	value: PhotoVideoConsentMaterial;
	label: string;
}> = [
	{ value: "intraoral_photo", label: "Внутриротовые фото" },
	{ value: "face_photo", label: "Фото лица" },
	{ value: "video", label: "Видео" },
	{ value: "xray", label: "Рентген" },
	{ value: "cbct", label: "КЛКТ/КТ" },
	{ value: "scan", label: "Цифровые сканы" },
	{ value: "other", label: "Иные материалы" },
];

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
	return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(
	value: unknown,
): value is DocumentIngestionTarget {
	return isRecordKey(value, ingestionTargetLabels);
}

export function isTaxDocumentYearPreference(value: unknown): value is number {
	if (!Number.isInteger(value)) return false;
	const year = value as number;
	return year >= 2021 && year <= 2100;
}

export function isDocumentKindPreference(
	value: unknown,
): value is GeneratedDocument["kind"] {
	return isRecordKey(value, documentKindMetadata);
}

export function isTaxApplicationFormPreference(
	value: unknown,
): value is TaxDeductionApplicationForm {
	return isOptionValue(value, taxApplicationFormOptions);
}

export function isTaxApplicationDeliveryChannelPreference(
	value: unknown,
): value is TaxDeductionApplicationDeliveryChannel {
	return isOptionValue(value, taxApplicationDeliveryChannelOptions);
}

export function isProcedureSpecificConsentProcedurePreference(
	value: unknown,
): value is ProcedureSpecificConsentProcedure {
	return isOptionValue(value, procedureSpecificConsentProcedureOptions);
}

export function isPostVisitCareTopicPreference(
	value: unknown,
): value is PostVisitCareTopic {
	return isOptionValue(value, postVisitCareTopicOptions);
}

export function normalizedDocumentKind(
	value: unknown,
): GeneratedDocument["kind"] {
	return isDocumentKindPreference(value)
		? value
		: defaultUiPreferences.selectedDocumentKind;
}

export function normalizedTaxApplicationRelationshipSelect(
	value: unknown,
): TaxDeductionApplicationRelationship {
	return isOptionValue(value, taxApplicationRelationshipOptions)
		? value
		: "self";
}

export function normalizedTaxApplicationForm(
	value: unknown,
): TaxDeductionApplicationForm {
	return isTaxApplicationFormPreference(value)
		? value
		: defaultUiPreferences.taxApplicationForm;
}

export function normalizedTaxApplicationDeliveryChannel(
	value: unknown,
): TaxDeductionApplicationDeliveryChannel {
	return isTaxApplicationDeliveryChannelPreference(value)
		? value
		: defaultUiPreferences.taxApplicationDeliveryChannel;
}

export function normalizedProcedureSpecificConsentProcedure(
	value: unknown,
): ProcedureSpecificConsentProcedure {
	return isProcedureSpecificConsentProcedurePreference(value)
		? value
		: defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedPostVisitCareTopic(
	value: unknown,
): PostVisitCareTopic {
	return isPostVisitCareTopicPreference(value)
		? value
		: defaultUiPreferences.postVisitCareTopic;
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return isRecordKey(value, medicalDocumentReleaseChannelLabels)
		? value
		: "paper";
}

export function normalizedDocumentVoidReasonCode(
	value: unknown,
): DocumentVoidReasonCode {
	return isRecordKey(value, documentVoidReasonLabels) ? value : "draft_error";
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
