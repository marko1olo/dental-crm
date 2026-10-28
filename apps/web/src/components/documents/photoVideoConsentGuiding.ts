import type { PhotoVideoConsentMaterial } from "@dental/shared";

/**
 * photoVideoConsentGuiding.ts
 * Soft Guiding & Safe Defaults Engine for Photo & Video Consent (Mandates 8e, 8n).
 * Печать согласия и сохранение НИКОГДА не блокируются.
 */
export interface PhotoVideoConsentGuideItem {
	field: string;
	label: string;
	hint: string;
	isSoftGuide?: boolean | undefined;
}

export type PhotoVideoConsentBlocker = PhotoVideoConsentGuideItem;

export interface PhotoVideoConsentGuidanceReview {
	requiredCount: number;
	blockers: PhotoVideoConsentGuideItem[];
	canPrint: boolean;
	canSign: boolean;
	disabled: false;
	isSoftGuiding: boolean;
}

export type PhotoVideoConsentBlockersReview = PhotoVideoConsentGuidanceReview;

export interface PhotoVideoConsentGuideInput {
	materials: readonly PhotoVideoConsentMaterial[];
	clinicalRecordUseConfirmed: boolean;
	anonymizationConfirmed: boolean;
	revocationChannel: string;
	recognizablePublicationAllowed: boolean;
	marketingUseAllowed: boolean;
	educationUseAllowed: boolean;
}

export type PhotoVideoConsentBlockersInput = PhotoVideoConsentGuideInput;

export const PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS = {
	materials: ["intraoral_photo", "cbct"] as const,
	clinicalRecordUseConfirmed: true,
	anonymizationConfirmed: true,
	revocationChannel: "Письменное обращение в клинику",
	recognizablePublicationAllowed: false,
	marketingUseAllowed: false,
	educationUseAllowed: false,
} as const;

export function resolvePhotoVideoConsentSafeDefaults(
	input: Partial<PhotoVideoConsentGuideInput>,
): PhotoVideoConsentGuideInput {
	return {
		materials: input.materials && input.materials.length > 0
			? input.materials : PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.materials,
		clinicalRecordUseConfirmed: input.clinicalRecordUseConfirmed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.clinicalRecordUseConfirmed,
		anonymizationConfirmed: input.anonymizationConfirmed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.anonymizationConfirmed,
		revocationChannel: String(input.revocationChannel ?? "").trim() || PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.revocationChannel,
		recognizablePublicationAllowed: input.recognizablePublicationAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.recognizablePublicationAllowed,
		marketingUseAllowed: input.marketingUseAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.marketingUseAllowed,
		educationUseAllowed: input.educationUseAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.educationUseAllowed,
	};
}

export function photoVideoConsentGuidanceReview(
	input: PhotoVideoConsentGuideInput,
	options?: { allowBlankForPrint?: boolean; isCito?: boolean },
): PhotoVideoConsentGuidanceReview {
	if (options?.allowBlankForPrint || options?.isCito) {
		return { requiredCount: 4, blockers: [], canPrint: true, canSign: true, disabled: false, isSoftGuiding: true };
	}
	const checks: Array<PhotoVideoConsentGuideItem & { ok: boolean }> = [
		{ field: "photoVideoMaterials", label: "Виды материалов", hint: "рекомендуется отметить виды фото/видео (по умолчанию: интраоральные фото и КТ)", isSoftGuide: true, ok: input.materials.length > 0 },
		{ field: "photoVideoClinicalRecordUseConfirmed", label: "Внесение в медицинскую карту", hint: "рекомендуется подтвердить хранение снимков в карте пациента", isSoftGuide: true, ok: input.clinicalRecordUseConfirmed },
		{ field: "photoVideoAnonymizationConfirmed", label: "Обезличивание вне клиники", hint: "рекомендуется подтвердить обезличивание при внешнем использовании", isSoftGuide: true, ok: input.anonymizationConfirmed },
		{ field: "photoVideoRevocationChannel", label: "Как пациент отзывает согласие", hint: "рекомендуется указать порядок отзыва (по умолчанию: заявление в клинику)", isSoftGuide: true, ok: String(input.revocationChannel ?? "").trim() !== "" },
		{ field: "photoVideoRecognizablePublicationAllowed", label: "Узнаваемая публикация лица или улыбки", hint: "отметьте обучение или маркетинг либо снимите узнаваемую публикацию", isSoftGuide: true, ok: !input.recognizablePublicationAllowed || input.marketingUseAllowed || input.educationUseAllowed },
	];

	return {
		requiredCount: checks.length,
		blockers: checks.filter((c) => !c.ok).map(({ field, label, hint, isSoftGuide }) => ({ field, label, hint, isSoftGuide })),
		canPrint: true,
		canSign: true,
		disabled: false,
		isSoftGuiding: true,
	};
}

export const photoVideoConsentBlockersReview = photoVideoConsentGuidanceReview;
