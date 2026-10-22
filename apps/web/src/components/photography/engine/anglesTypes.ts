export type Standard8AngleKey =
	| 'portrait_rest'
	| 'portrait_smile'
	| 'profile'
	| 'intraoral_frontal_occlusion'
	| 'intraoral_right_buccal'
	| 'intraoral_left_buccal'
	| 'intraoral_maxillary_occlusal'
	| 'intraoral_mandibular_occlusal';

export interface Standard8AngleDefinition {
	readonly key: Standard8AngleKey;
	readonly slotId: string;
	readonly sequenceNumber: number; // 1..8
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly category: 'extraoral' | 'intraoral';
	readonly descriptionRu: string;
	readonly guideInstructionsRu: string;
	readonly requiresRetractor: boolean;
	readonly requiresMirror: boolean;
	readonly retractorType: 'none' | 'double_ended' | 'vestibular_clear' | 'contraster';
	readonly recommendedAspectRatio: '3:2' | '4:3' | '1:1';
	readonly silhouetteSvgPath: string;
	readonly clinicalCheckpointsRu: readonly string[];
}
