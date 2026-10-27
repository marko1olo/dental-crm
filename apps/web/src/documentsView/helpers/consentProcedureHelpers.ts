import type {
	PhotoVideoConsentMaterial,
	PostVisitCareTopic,
	ProcedureSpecificConsentProcedure,
} from "@dental/shared";
import { defaultUiPreferences } from "../../utils/preferencesUtils";
import { postVisitCareTopicOptions } from "../../workspaceStaticOptions";

export type MedicalDocumentReleaseChannel =
	| "paper"
	| "pdf"
	| "dicom_archive"
	| "secure_link"
	| "physical_media"
	| "other";

export const procedureSpecificConsentProcedureOptions: Array<{
	value: ProcedureSpecificConsentProcedure;
	label: string;
}> = [
	{ value: "local_anesthesia", label: "Местная анестезия" },
	{ value: "therapy_endo_restoration", label: "Терапия, эндодонтия, реставрация" },
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

export function isProcedureSpecificConsentProcedurePreference(
	value: unknown,
): value is ProcedureSpecificConsentProcedure {
	return procedureSpecificConsentProcedureOptions.some((opt) => opt.value === value);
}

export function isPostVisitCareTopicPreference(
	value: unknown,
): value is PostVisitCareTopic {
	return postVisitCareTopicOptions.some((opt) => opt.value === value);
}

export function normalizedProcedureSpecificConsentProcedure(
	value: unknown,
): ProcedureSpecificConsentProcedure {
	return isProcedureSpecificConsentProcedurePreference(value)
		? value
		: defaultUiPreferences.procedureConsentProcedureType;
}

export function normalizedMedicalDocumentReleaseChannel(
	value: unknown,
): MedicalDocumentReleaseChannel {
	return typeof value === "string" && value in medicalDocumentReleaseChannelLabels
		? (value as MedicalDocumentReleaseChannel)
		: "paper";
}
