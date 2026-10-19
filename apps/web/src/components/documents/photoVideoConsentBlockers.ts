import type { PhotoVideoConsentMaterial } from "@dental/shared";

/**
 * photoVideoConsentBlockers.ts
 *
 * Soft Guiding & Safe Defaults Engine for Photo & Video Consent (Mandates 8e, 8n).
 * Печать согласия и сохранение НИКОГДА не блокируются:
 * незаполненные отметки можно отметить вручную на распечатанном бланке.
 */

export interface PhotoVideoConsentBlocker {
	field: string;
	label: string;
	hint: string;
	isSoftGuide?: boolean;
}

export interface PhotoVideoConsentBlockersReview {
	requiredCount: number;
	blockers: PhotoVideoConsentBlocker[];
	canPrint: boolean;
	isSoftGuiding: boolean;
}

export interface PhotoVideoConsentBlockersInput {
	materials: readonly PhotoVideoConsentMaterial[];
	clinicalRecordUseConfirmed: boolean;
	anonymizationConfirmed: boolean;
	revocationChannel: string;
	recognizablePublicationAllowed: boolean;
	marketingUseAllowed: boolean;
	educationUseAllowed: boolean;
}

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
	input: Partial<PhotoVideoConsentBlockersInput>,
): PhotoVideoConsentBlockersInput {
	return {
		materials: input.materials && input.materials.length > 0
			? input.materials
			: PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.materials,
		clinicalRecordUseConfirmed: input.clinicalRecordUseConfirmed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.clinicalRecordUseConfirmed,
		anonymizationConfirmed: input.anonymizationConfirmed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.anonymizationConfirmed,
		revocationChannel: String(input.revocationChannel ?? "").trim() || PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.revocationChannel,
		recognizablePublicationAllowed: input.recognizablePublicationAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.recognizablePublicationAllowed,
		marketingUseAllowed: input.marketingUseAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.marketingUseAllowed,
		educationUseAllowed: input.educationUseAllowed ?? PHOTO_VIDEO_CONSENT_SAFE_DEFAULTS.educationUseAllowed,
	};
}

export function photoVideoConsentBlockersReview(
	input: PhotoVideoConsentBlockersInput,
	options?: { allowBlankForPrint?: boolean; isCito?: boolean },
): PhotoVideoConsentBlockersReview {
	if (options?.allowBlankForPrint || options?.isCito) {
		return {
			requiredCount: 4,
			blockers: [],
			canPrint: true,
			isSoftGuiding: true,
		};
	}
	const checks: Array<PhotoVideoConsentBlocker & { ok: boolean }> = [
		{
			field: "photoVideoMaterials",
			label: "Виды материалов",
			hint: "рекомендуется отметить виды фото/видео (по умолчанию: интраоральные фото и КТ)",
			isSoftGuide: true,
			ok: input.materials.length > 0,
		},
		{
			field: "photoVideoClinicalRecordUseConfirmed",
			label: "Внесение в медицинскую карту",
			hint: "рекомендуется подтвердить хранение снимков в карте пациента",
			isSoftGuide: true,
			ok: input.clinicalRecordUseConfirmed,
		},
		{
			field: "photoVideoAnonymizationConfirmed",
			label: "Обезличивание вне клиники",
			hint: "рекомендуется подтвердить обезличивание при внешнем использовании",
			isSoftGuide: true,
			ok: input.anonymizationConfirmed,
		},
		{
			field: "photoVideoRevocationChannel",
			label: "Как пациент отзывает согласие",
			hint: "рекомендуется указать порядок отзыва (по умолчанию: заявление в клинику)",
			isSoftGuide: true,
			ok: String(input.revocationChannel ?? "").trim() !== "",
		},
		{
			field: "photoVideoRecognizablePublicationAllowed",
			label: "Узнаваемая публикация лица или улыбки",
			hint: "отметьте обучение или маркетинг либо снимите узнаваемую публикацию",
			isSoftGuide: true,
			ok:
				!input.recognizablePublicationAllowed ||
				input.marketingUseAllowed ||
				input.educationUseAllowed,
		},
	];

	return {
		requiredCount: checks.length,
		blockers: checks
			.filter((check) => !check.ok)
			.map(({ field, label, hint, isSoftGuide }) => ({ field, label, hint, isSoftGuide })),
		canPrint: true,
		isSoftGuiding: true,
	};
}
