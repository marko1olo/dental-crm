/**
 * @file apps/web/src/helpers/patientFormatters.ts
 * @description Decomposed helper module extracted verbatim from AppHelpers.tsx
 */

import {
	type Dashboard,
	type Patient,
	type PatientIntakePregnancyStatus,
	type UiLanguage,
	type UpdatePatientInput,
} from "@dental/shared";
import {
	nullablePatientDraftValue,
} from "../utils/clinicProfileUtils";
import {
	isOptionValue,
	isRecordKey,
} from "./guardUtils";
import {
	type PatientCoreDraft,
	type PricelistImageMimeType,
	type UiLanguageOption,
} from "./types";

export function patientName(patients: Patient[] | undefined | null, patientId: string | null) {
	if (!patientId) return "Новый пациент";
	if (!Array.isArray(patients)) return "Пациент";
	return (
		patients.find((patient) => patient.id === patientId)?.fullName ?? "Пациент"
	);
}

export function findPatient(patients: Patient[] | undefined | null, patientId: string | null) {
	if (!patientId || !Array.isArray(patients)) return null;
	return patients.find((patient) => patient.id === patientId) ?? null;
}

export const uiLanguageLabels: Record<UiLanguage, string> = {
	ru: "Русский",
	en: "English",
};

export const defaultUiLanguageOption: UiLanguageOption = {
	value: "ru",
	label: uiLanguageLabels.ru,
	detail:
		"Русский интерфейс включен сейчас. Выбор сохраняется автоматически и остается до смены языка.",
};

export const uiLanguageOptions: UiLanguageOption[] = [defaultUiLanguageOption];

export const patientIntakePregnancyStatusOptions: Array<{
	value: PatientIntakePregnancyStatus;
	label: string;
}> = [
	{ value: "not_applicable", label: "Не применимо" },
	{ value: "denied", label: "Со слов пациента нет" },
	{ value: "possible", label: "Возможна беременность" },
	{ value: "confirmed", label: "Беременность подтверждена" },
	{ value: "lactation", label: "Лактация" },
	{ value: "unknown", label: "Не уточнено" },
];

export function isUiLanguage(value: unknown): value is UiLanguage {
	return isRecordKey(value, uiLanguageLabels);
}

export function normalizeUiLanguageInput(value: unknown): UiLanguage {
	return isUiLanguage(value) ? value : "ru";
}

export function normalizedPatientIntakePregnancyStatus(
	value: unknown,
): PatientIntakePregnancyStatus {
	return isOptionValue(value, patientIntakePregnancyStatusOptions)
		? value
		: "unknown";
}

export function uiPreferencesSyncErrorMessage(_error: unknown): string {
	return "Настройки интерфейса сохранены только на этом устройстве. Серверная синхронизация повторится автоматически.";
}

export function patientCoreDraftFromPatient(
	patient: Patient | null,
): PatientCoreDraft {
	return {
		fullName: patient?.fullName ?? "",
		birthDate: patient?.birthDate ?? "",
		phone: patient?.phone ?? "",
		email: patient?.email ?? "",
		notes: patient?.notes ?? "",
	};
}

export function buildPatientCorePayload(
	draft: PatientCoreDraft,
): UpdatePatientInput {
	const rawEmail = nullablePatientDraftValue(draft.email);
	// МАНДАТ 8e: если e-mail указан не по формату, санируем в null чтобы не блокировать сохранение телефона, ФИО и заметок
	const email =
		rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : null;
	return {
		fullName: draft.fullName.trim(),
		birthDate: nullablePatientDraftValue(draft.birthDate),
		phone: nullablePatientDraftValue(draft.phone),
		email,
		notes: nullablePatientDraftValue(draft.notes),
	};
}

export function patientCoreDraftSignature(draft: PatientCoreDraft): string {
	return JSON.stringify(buildPatientCorePayload(draft));
}

export const pricelistImageMimeTypes: PricelistImageMimeType[] = [
	"image/jpeg",
	"image/png",
	"image/webp",
];

export const maxPricelistImageBase64Chars = 3_800_000;

export function readFileAsDataUrl(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Снимок не удалось прочитать"));
		reader.onload = () =>
			resolve(typeof reader.result === "string" ? reader.result : "");
		reader.readAsDataURL(file);
	});
}

export function loadImageFromDataUrl(
	dataUrl: string,
): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error("Снимок не удалось распознать"));
		image.src = dataUrl;
	});
}

export async function preparePricelistImage(file: File): Promise<{
	base64: string;
	mimeType: PricelistImageMimeType;
	note: string;
}> {
	if (!pricelistImageMimeTypes.includes(file.type as PricelistImageMimeType)) {
		throw new Error("Поддерживаются JPEG, PNG или WebP.");
	}

	const dataUrl = await readFileAsDataUrl(file);
	const image = await loadImageFromDataUrl(dataUrl);
	const originalLongestSide = Math.max(image.naturalWidth, image.naturalHeight);
	const outputMimeType: PricelistImageMimeType = "image/jpeg";

	for (const maxSide of [1600, 1200, 900, 720]) {
		const scale = Math.min(1, maxSide / originalLongestSide);
		const width = Math.max(1, Math.round(image.naturalWidth * scale));
		const height = Math.max(1, Math.round(image.naturalHeight * scale));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas недоступен для сжатия изображения.");
		context.fillStyle = "#ffffff";
		context.fillRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of [0.82, 0.72, 0.62]) {
			const compressed = canvas.toDataURL(outputMimeType, quality);
			const base64 = compressed.split(",")[1] ?? "";
			if (base64.length <= maxPricelistImageBase64Chars) {
				const megapixels = ((width * height) / 1_000_000).toFixed(1);
				return {
					base64,
					mimeType: outputMimeType,
					note: `Фото подготовлено: ${width}x${height}, ${megapixels} Мп, JPEG ${Math.round(quality * 100)}%.`,
				};
			}
		}
	}

	throw new Error(
		"Фото прайса слишком большое даже после сжатия. Нужен более четкий фрагмент страницы.",
	);
}

export const patientInsightRiskLabels: Record<
	Dashboard["patientInsights"][number]["riskLevel"],
	string
> = {
	low: "спокойно",
	watch: "контроль",
	high: "срочно",
};
