/**
 * Clinical Dental Photography Protocol Presets & Slot Types
 */

export type PhotoCategory = 'extraoral' | 'intraoral';

export type AspectRatioType = '3:2' | '4:3' | '1:1' | '16:9';

export type FlashSettingType = 'twin_flash' | 'ring_flash' | 'softbox' | 'dual_point' | 'ambient';

export type RetractorType = 'none' | 'double_ended' | 'vestibular_clear' | 'contraster' | 'buccal_mirror';

export type StandardSlotId =
	| 'portrait_rest'
	| 'portrait_smile'
	| 'portrait_smile_wide'
	| 'profile_90_rest'
	| 'profile_90_smile'
	| 'portrait_45_smile'
	| 'intraoral_frontal_occlusion'
	| 'intraoral_frontal_disclusion'
	| 'intraoral_right_buccal'
	| 'intraoral_left_buccal'
	| 'intraoral_maxillary_occlusal'
	| 'intraoral_mandibular_occlusal'
	| 'intraoral_overjet'
	| 'intraoral_enamel_macro';

export interface PhotoProtocolSlotDefinition {
	id: StandardSlotId;
	category: PhotoCategory;
	titleRu: string;
	shortLabelRu: string;
	descriptionRu: string;
	guideInstructionsRu: string;
	recommendedAspectRatio: AspectRatioType;
	recommendedFlashSetting: FlashSettingType;
	recommendedFlashSettingRu: string;
	cameraAngleDegrees: number;
	focalLengthMm: number;
	magnification: string;
	requiresMirror: boolean;
	requiresRetractor: boolean;
	retractorType: RetractorType;
	silhouetteSvgPath: string;
	clinicalCheckpointsRu: string[];
}

export interface PhotoProtocolPreset {
	id: string;
	nameRu: string;
	shortNameRu: string;
	descriptionRu: string;
	slots: PhotoProtocolSlotDefinition[];
	totalSlots: number;
	categoryCount: {
		extraoral: number;
		intraoral: number;
	};
}

export interface PhotoSlotRecord {
	slotId: string;
	imageUrl?: string;
	storagePath?: string;
	uploadedAt?: string;
	toothCode?: string | number | undefined;
	stage?: 'before' | 'in_progress' | 'after' | 'followup';
	notes?: string;
	rotationDegrees?: number;
	flipHorizontal?: boolean;
	flipVertical?: boolean;
	brightness?: number; // -100 to 100
	contrast?: number; // -100 to 100
	exposure?: number; // -100 to 100
	warmth?: number; // -100 to 100
	detectedVitaShade?: string;
	landmarks?: Record<string, { x: number; y: number }>;
	paired_document_id?: string | null;
	paired_photo_id?: string | null;
	media_category?: string;
	media_subtype?: string;
	media_kind?: string;
}
