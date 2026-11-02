import type {
	DocumentIngestionTarget,
	ImagingSourceKind,
	ImagingStudyKind,
	ImportSourceKind,
	SmartImportMode,
	XrayCbctReferralPregnancyStatus,
	XrayCbctReferralPriority,
	XrayCbctReferralStudyType,
} from "@dental/shared";
import {
	imagingKindLabels,
	imagingSourceLabels,
} from "../../imagingUiLabels";
import {
	isRecordKey,
	isOptionValue,
	isStringUnionValue,
} from "../uiFormatters.js";
import {
	importSourceLabels,
	ingestionTargetLabels,
	smartImportModeLabels,
} from "./imagingViewerHelpers.js";

export const xrayPriorityOptions: readonly XrayCbctReferralPriority[] = [
	"routine",
	"urgent",
];

export const xrayStudyTypeOptions: Array<{
	value: XrayCbctReferralStudyType;
	label: string;
}> = [
	{ value: "rvg", label: "RVG / прицельный" },
	{ value: "opg", label: "ОПТГ" },
	{ value: "cbct", label: "КЛКТ / КТ" },
	{ value: "trg", label: "ТРГ" },
	{ value: "tmj", label: "ВНЧС" },
	{ value: "sinus", label: "Пазуха" },
	{ value: "photo_protocol", label: "Фотопротокол" },
	{ value: "other", label: "Другое" },
];

export const xrayPregnancyStatusOptions: Array<{
	value: XrayCbctReferralPregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна" },
	{ value: "confirmed", label: "Подтверждена" },
	{ value: "unknown", label: "Не уточнено" },
];

export function isImportSourceKind(value: unknown): value is ImportSourceKind {
	return isRecordKey(value, importSourceLabels);
}

export function isDocumentIngestionTarget(
	value: unknown,
): value is DocumentIngestionTarget {
	return isRecordKey(value, ingestionTargetLabels);
}

export function isImagingSourceKind(
	value: unknown,
): value is ImagingSourceKind {
	return isRecordKey(value, imagingSourceLabels);
}

export function isSmartImportMode(value: unknown): value is SmartImportMode {
	return isRecordKey(value, smartImportModeLabels);
}

export function isImagingKindFilter(
	value: unknown,
): value is ImagingStudyKind | "all" {
	return value === "all" || isRecordKey(value, imagingKindLabels);
}

export function normalizedXrayStudyType(
	value: unknown,
): XrayCbctReferralStudyType {
	return isOptionValue(value, xrayStudyTypeOptions) ? value : "cbct";
}

export function normalizedXrayPriority(
	value: unknown,
): XrayCbctReferralPriority {
	return isStringUnionValue(value, xrayPriorityOptions) ? value : "routine";
}

export function normalizedXrayPregnancyStatus(
	value: unknown,
): XrayCbctReferralPregnancyStatus {
	return isOptionValue(value, xrayPregnancyStatusOptions) ? value : "unknown";
}
