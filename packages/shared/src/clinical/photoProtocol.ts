/**
 * packages/shared/src/clinical/photoProtocol.ts
 *
 * Clinical Photo Protocol & Before/After Comparison Engine.
 * Adapted from DentalPin media taxonomy & clinical outpatient photography standards.
 *
 * Compliant with:
 * - DentalPin Media Taxonomy (`photo_taxonomy.py` controlled vocabulary & pairing)
 * - AACD (American Academy of Cosmetic Dentistry) & DSD (Digital Smile Design) photographic standards
 * - Клинические рекомендации СтАР по ортодонтической и ортопедической фотодиагностике
 * - Приказ Минздрава России от 15.12.2014 № 834н (Форма 043/у)
 * - Mandates 8c (Tier 2 Entity Drawer), 8e (Doctor Autonomy), 8i (Outpatient Dentistry), 8k (Friction-Killer), 8s (Zero-Bloat)
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOP-LEVEL MEDIA KINDS & CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

export const MEDIA_KINDS = ["document", "photo", "xray", "scan", "video"] as const;
export const mediaKindSchema = z.enum(MEDIA_KINDS);
export type MediaKind = z.infer<typeof mediaKindSchema>;

export const MEDIA_KIND_LABELS_RU: Record<MediaKind, string> = {
	document: "Медицинский документ",
	photo: "Клиническая фотография",
	xray: "Рентгенограмма",
	scan: "3D-скан (IOS / STL)",
	video: "Клиническое видео",
};

export const MEDIA_CATEGORIES = [
	"intraoral",
	"extraoral",
	"xray",
	"clinical",
	"other",
] as const;
export const mediaCategorySchema = z.enum(MEDIA_CATEGORIES);
export type MediaCategory = z.infer<typeof mediaCategorySchema>;

export const MEDIA_CATEGORY_LABELS_RU: Record<MediaCategory, string> = {
	intraoral: "Внутриротовые снимки",
	extraoral: "Внеротовые / Портретные снимки",
	xray: "Рентгенологические снимки",
	clinical: "Клинические этапы До/После",
	other: "Прочие снимки и сканы",
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. SUBTYPES PER CATEGORY
// ─────────────────────────────────────────────────────────────────────────────

export const MEDIA_SUBTYPES = {
	intraoral: [
		"frontal",
		"frontal_disclusion",
		"occlusal_upper",
		"occlusal_lower",
		"lateral_left",
		"lateral_right",
		"lateral_left_45",
		"lateral_right_45",
		"palatal",
		"lingual",
		"overjet",
		"enamel_macro",
	] as const,
	extraoral: [
		"frontal_face",
		"rest",
		"smile",
		"smile_wide",
		"profile_left",
		"profile_right",
		"three_quarter_left",
		"three_quarter_right",
	] as const,
	xray: [
		"periapical",
		"bitewing",
		"panoramic",
		"cephalometric_lateral",
		"cephalometric_pa",
		"cbct",
		"occlusal_xray",
	] as const,
	clinical: [
		"before",
		"in_progress",
		"after",
		"followup",
		"reference",
	] as const,
	other: [
		"portrait",
		"document_scan",
		"model_photo",
	] as const,
} as const;

export type IntraoralSubtype = (typeof MEDIA_SUBTYPES.intraoral)[number];
export type ExtraoralSubtype = (typeof MEDIA_SUBTYPES.extraoral)[number];
export type XraySubtype = (typeof MEDIA_SUBTYPES.xray)[number];
export type ClinicalSubtype = (typeof MEDIA_SUBTYPES.clinical)[number];
export type OtherSubtype = (typeof MEDIA_SUBTYPES.other)[number];

export type MediaSubtype =
	| IntraoralSubtype
	| ExtraoralSubtype
	| XraySubtype
	| ClinicalSubtype
	| OtherSubtype;

export const MEDIA_SUBTYPE_LABELS_RU: Record<string, string> = {
	// Внутриротовые
	frontal: "Фронтальная с ретрактором (окклюзия)",
	frontal_disclusion: "Фронтальная дизокклюзия (1–2 мм)",
	occlusal_upper: "Окклюзионная верхней челюсти",
	occlusal_lower: "Окклюзионная нижней челюсти",
	lateral_left: "Боковая левая 90° (моляры)",
	lateral_right: "Боковая правая 90° (моляры)",
	lateral_left_45: "Боковая левая 45° (клык-премоляр)",
	lateral_right_45: "Боковая правая 45° (клык-премоляр)",
	palatal: "Небная поверхность",
	lingual: "Язычная поверхность",
	overjet: "Сагиттальная щель (Overjet)",
	enamel_macro: "Макротекстура эмали 1:1",

	// Внеротовые / Портретные
	frontal_face: "Анфас лица",
	rest: "Фас в покое (губы сомкнуты)",
	smile: "Фас с естественной улыбкой",
	smile_wide: "Фас с широкой улыбкой",
	profile_left: "Профиль 90° слева",
	profile_right: "Профиль 90° справа",
	three_quarter_left: "Полупрофиль 45° слева",
	three_quarter_right: "Полупрофиль 45° справа",

	// Рентгенологические
	periapical: "Прицельный снимок (RVG)",
	bitewing: "Интерпроксимальный (Bitewing)",
	panoramic: "ОПТГ (Панорамный снимок)",
	cephalometric_lateral: "ТРГ боковая",
	cephalometric_pa: "ТРГ прямая",
	cbct: "КЛКТ 3D томография",
	occlusal_xray: "Окклюзионная рентгенография",

	// Клинические этапы
	before: "До лечения (Исходное состояние)",
	in_progress: "В процессе лечения (Динамика)",
	after: "После лечения (Финальный результат)",
	followup: "Катамнез (Отдаленный контроль)",
	reference: "Эталон / Референс",

	// Прочие
	portrait: "Художественный портрет",
	document_scan: "Скан документа / направления",
	model_photo: "Фото диагностических моделей",
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. TREATMENT STAGES FOR BEFORE / AFTER COMPARISON
// ─────────────────────────────────────────────────────────────────────────────

export const PHOTO_STAGES = ["before", "in_progress", "after", "followup"] as const;
export const photoStageSchema = z.enum(PHOTO_STAGES);
export type PhotoStage = z.infer<typeof photoStageSchema>;

export const PHOTO_STAGE_LABELS_RU: Record<PhotoStage, string> = {
	before: "До лечения",
	in_progress: "В процессе",
	after: "После лечения",
	followup: "Катамнез",
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ZOD SCHEMAS FOR CLINICAL PHOTO METADATA & RECORDS
// ─────────────────────────────────────────────────────────────────────────────

export const clinicalPhotoMetadataSchema = z.object({
	media_kind: mediaKindSchema.default("photo"),
	media_category: mediaCategorySchema.optional(),
	media_subtype: z.string().optional(),
	stage: photoStageSchema.default("before"),
	captured_at: z.string().optional(),
	paired_document_id: z.string().nullable().optional(),
	paired_photo_id: z.string().nullable().optional(),
	title: z.string().min(1).max(255).optional(),
	notes: z.string().max(2000).optional(),
	tags: z.array(z.string()).default([]),
	rotation_degrees: z.number().int().min(0).max(360).default(0),
	flip_horizontal: z.boolean().default(false),
	flip_vertical: z.boolean().default(false),
	brightness: z.number().min(-100).max(100).default(0),
	contrast: z.number().min(-100).max(100).default(0),
	exposure: z.number().min(-100).max(100).default(0),
	warmth: z.number().min(-100).max(100).default(0),
	detected_vita_shade: z.string().optional(),
	patient_id: z.string().optional(),
});
export type ClinicalPhotoMetadata = z.infer<typeof clinicalPhotoMetadataSchema>;

export const clinicalPhotoRecordSchema = clinicalPhotoMetadataSchema.extend({
	id: z.string().min(1),
	image_url: z.string().min(1),
	thumb_url: z.string().optional(),
	medium_url: z.string().optional(),
	full_url: z.string().optional(),
	file_size: z.number().int().nonnegative().optional(),
	mime_type: z.string().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
	uploaded_by: z.string().optional(),
});
export type ClinicalPhotoRecord = z.infer<typeof clinicalPhotoRecordSchema>;

export const photoPairInputSchema = z.object({
	photo_id_a: z.string().min(1, "photo_id_a обязателен"),
	photo_id_b: z.string().min(1, "photo_id_b обязателен"),
	projection: z.string().optional(),
});
export type PhotoPairInput = z.infer<typeof photoPairInputSchema>;

export const beforeAfterComparisonPairSchema = z.object({
	id: z.string().min(1),
	projection_key: z.string(),
	projection_label_ru: z.string(),
	before_photo: clinicalPhotoRecordSchema.nullable(),
	after_photo: clinicalPhotoRecordSchema.nullable(),
	stage_before: z.literal("before").default("before"),
	stage_after: z.literal("after").default("after"),
	is_complete: z.boolean(),
});
export type BeforeAfterComparisonPair = z.infer<typeof beforeAfterComparisonPairSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// 5. VALIDATION & TAXONOMY HELPERS (MATCHING DENTALPIN MEDIA MODULE)
// ─────────────────────────────────────────────────────────────────────────────

export interface MediaClassificationValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validates (media_kind, media_category, media_subtype) triple against DentalPin taxonomy rules.
 *
 * Rules:
 * - kind must be in MEDIA_KINDS.
 * - kind in ('document', 'scan', 'video') -> category and subtype must be null or undefined.
 * - kind === 'xray' -> category must be 'xray' or null/undefined, subtype must belong to xray subtypes if present.
 * - kind === 'photo' -> category is required (any except 'xray'), subtype must belong to category if present.
 */
export function validateMediaClassification(
	mediaKind: string,
	mediaCategory?: string | null,
	mediaSubtype?: string | null,
): MediaClassificationValidationResult {
	if (!MEDIA_KINDS.includes(mediaKind as MediaKind)) {
		return {
			valid: false,
			error: `Недопустимый media_kind «${mediaKind}». Разрешены: ${MEDIA_KINDS.join(", ")}`,
		};
	}

	if (["document", "scan", "video"].includes(mediaKind)) {
		if (mediaCategory != null || mediaSubtype != null) {
			return {
				valid: false,
				error: `Для типа «${mediaKind}» категория и подтип должны быть пустыми`,
			};
		}
		return { valid: true };
	}

	let resolvedCategory: MediaCategory;

	if (mediaKind === "xray") {
		if (mediaCategory != null && mediaCategory !== "xray") {
			return {
				valid: false,
				error: "media_kind 'xray' требует media_category='xray' или null",
			};
		}
		resolvedCategory = "xray";
	} else {
		// photo
		if (!mediaCategory) {
			return {
				valid: false,
				error: "media_kind 'photo' требует указания media_category",
			};
		}
		if (mediaCategory === "xray") {
			return {
				valid: false,
				error: "Используйте media_kind='xray' для рентгенограмм, а не photo+category=xray",
			};
		}
		if (!MEDIA_CATEGORIES.includes(mediaCategory as MediaCategory)) {
			return {
				valid: false,
				error: `Недопустимая media_category «${mediaCategory}». Разрешены: ${MEDIA_CATEGORIES.join(", ")}`,
			};
		}
		resolvedCategory = mediaCategory as MediaCategory;
	}

	if (mediaSubtype != null && mediaSubtype !== "") {
		const allowedSubtypes: readonly string[] = MEDIA_SUBTYPES[resolvedCategory] ?? [];
		if (!allowedSubtypes.includes(mediaSubtype)) {
			return {
				valid: false,
				error: `Недопустимый media_subtype «${mediaSubtype}» для категории «${resolvedCategory}». Разрешены: ${allowedSubtypes.join(", ")}`,
			};
		}
	}

	return { valid: true };
}

/**
 * Asserts that classification is valid, throwing an Error if not.
 */
export function assertValidMediaClassification(
	mediaKind: string,
	mediaCategory?: string | null,
	mediaSubtype?: string | null,
): void {
	const res = validateMediaClassification(mediaKind, mediaCategory, mediaSubtype);
	if (!res.valid) {
		throw new Error(res.error);
	}
}

/**
 * Checks if a subtype belongs to a given category.
 */
export function isMediaSubtypeValid(category: MediaCategory, subtype: string): boolean {
	const allowed = MEDIA_SUBTYPES[category] as readonly string[] | undefined;
	return !!allowed && allowed.includes(subtype);
}

/**
 * Returns available subtypes for category with Russian labels.
 */
export function getAvailableSubtypes(category: MediaCategory): Array<{ id: string; labelRu: string }> {
	const list = MEDIA_SUBTYPES[category] as readonly string[] | undefined;
	if (!list) return [];
	return list.map((id) => ({
		id,
		labelRu: MEDIA_SUBTYPE_LABELS_RU[id] ?? id,
	}));
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. PAIRING & COMPARISON HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface MinimalPhotoItem {
	id: string;
	title?: string;
	media_kind?: string;
	media_category?: string | null;
	media_subtype?: string | null;
	stage?: PhotoStage | string;
	paired_document_id?: string | null;
	paired_photo_id?: string | null;
	image_url?: string;
}

/**
 * Links two photos reciprocally as a Before / After pair.
 */
export function pairPhotos<T extends MinimalPhotoItem>(
	photoBefore: T,
	photoAfter: T,
): { before: T; after: T } {
	return {
		before: {
			...photoBefore,
			paired_document_id: photoAfter.id,
			paired_photo_id: photoAfter.id,
			stage: (photoBefore.stage as PhotoStage) || "before",
		},
		after: {
			...photoAfter,
			paired_document_id: photoBefore.id,
			paired_photo_id: photoBefore.id,
			stage: (photoAfter.stage as PhotoStage) || "after",
		},
	};
}

/**
 * Unpairs a photo by clearing paired_document_id and paired_photo_id on both it and its partner.
 */
export function unpairPhoto<T extends MinimalPhotoItem>(
	photoId: string,
	photos: T[],
): T[] {
	const target = photos.find((p) => p.id === photoId);
	const partnerId = target?.paired_document_id || target?.paired_photo_id;

	return photos.map((p) => {
		if (p.id === photoId || (partnerId && p.id === partnerId)) {
			return {
				...p,
				paired_document_id: null,
				paired_photo_id: null,
			};
		}
		return p;
	});
}

/**
 * Finds all candidate photos that can be paired with the current photo.
 * Filters out:
 * - The photo itself
 * - Photos that are already paired
 * - Photos with non-photo/xray media kinds
 * Prioritizes matching projections (media_subtype or media_category) and opposite stage.
 */
export function findPairCandidates<T extends MinimalPhotoItem>(
	currentPhoto: T,
	allPhotos: T[],
): T[] {
	return allPhotos.filter((p) => {
		if (p.id === currentPhoto.id) return false;
		if (p.paired_document_id || p.paired_photo_id) return false;
		if (p.media_kind && !["photo", "xray"].includes(p.media_kind)) return false;
		return true;
	});
}

/**
 * Extracts and deduplicates all reciprocal Before/After pairs from a photo collection.
 */
export function filterPairedPhotos<T extends MinimalPhotoItem>(
	photos: T[],
): Array<{ before: T; after: T; projectionKey: string; projectionLabelRu: string }> {
	const visitedPairs = new Set<string>();
	const results: Array<{ before: T; after: T; projectionKey: string; projectionLabelRu: string }> = [];

	for (const photo of photos) {
		const partnerId = photo.paired_document_id || photo.paired_photo_id;
		if (!partnerId) continue;

		const pairKey = [photo.id, partnerId].sort().join("::");
		if (visitedPairs.has(pairKey)) continue;
		visitedPairs.add(pairKey);

		const partner = photos.find((p) => p.id === partnerId);
		if (!partner) continue;

		const isCurrentBefore = photo.stage === "before" || (!photo.stage && partner.stage === "after");
		const before = isCurrentBefore ? photo : partner;
		const after = isCurrentBefore ? partner : photo;

		const projectionKey = before.media_subtype || after.media_subtype || before.media_category || "projection";
		const projectionLabelRu =
			(before.media_subtype && MEDIA_SUBTYPE_LABELS_RU[before.media_subtype]) ||
			(after.media_subtype && MEDIA_SUBTYPE_LABELS_RU[after.media_subtype]) ||
			(before.media_category && MEDIA_CATEGORY_LABELS_RU[before.media_category as MediaCategory]) ||
			"Клиническая проекция";

		results.push({
			before,
			after,
			projectionKey,
			projectionLabelRu,
		});
	}

	return results;
}

/**
 * 1-click helper: matches standard 12-slot photo protocol projections between before and after sessions.
 */
export const STANDARD_PROJECTION_KEYS = [
	{ id: "portrait_smile", labelRu: "Анфас с улыбкой", category: "extraoral" },
	{ id: "portrait_rest", labelRu: "Анфас в покое", category: "extraoral" },
	{ id: "profile_90_smile", labelRu: "Профиль с улыбкой", category: "extraoral" },
	{ id: "intraoral_frontal_occlusion", labelRu: "Фронтальная окклюзия", category: "intraoral" },
	{ id: "intraoral_maxillary_occlusal", labelRu: "Окклюзия верхней челюсти", category: "intraoral" },
	{ id: "intraoral_mandibular_occlusal", labelRu: "Окклюзия нижней челюсти", category: "intraoral" },
	{ id: "intraoral_right_buccal", labelRu: "Правый боковой сегмент", category: "intraoral" },
	{ id: "intraoral_left_buccal", labelRu: "Левый боковой сегмент", category: "intraoral" },
	{ id: "intraoral_overjet", labelRu: "Сагиттальная щель", category: "intraoral" },
] as const;
