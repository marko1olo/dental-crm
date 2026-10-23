/**
 * Intraoral Lateral Buccal Photography Slots
 */

import { PhotoProtocolSlotDefinition } from './types';
import { SILHOUETTE_PATHS } from './silhouettes';

export const intraoral_right_buccal: PhotoProtocolSlotDefinition = {
	id: 'intraoral_right_buccal',
	category: 'intraoral',
	titleRu: 'Правый боковой сегмент (по Энглю)',
	shortLabelRu: 'Правый боковой',
	descriptionRu: 'Определение класса окклюзии по Энглю справа (клыки и моляры), кривых Шпее и Уилсона.',
	guideInstructionsRu: 'Зубы сомкнуты. Правый ретрактор сильно латерально и дистально, левый ослаблен.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Правый точечный импульс направлен вглубь свода преддверия',
	cameraAngleDegrees: 0,
	focalLengthMm: 100,
	magnification: '1:1.5 (Боковой сегмент)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'double_ended',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
	clinicalCheckpointsRu: [
		'Соотношение первых моляров (I, II или III класс по Энглю)',
		'Клыковое соотношение (нейтральное, дистальное, мезиальное)',
		'Четкая видимость зубов от резца до второго моляра (11-17, 41-47)',
		'Отсутствие перекрытия мягкими тканями щеки',
	],
};

export const intraoral_left_buccal: PhotoProtocolSlotDefinition = {
	id: 'intraoral_left_buccal',
	category: 'intraoral',
	titleRu: 'Левый боковой сегмент (по Энглю)',
	shortLabelRu: 'Левый боковой',
	descriptionRu: 'Определение класса смыкания по Энглю слева (клыки и моляры), трансверзальных соотношений.',
	guideInstructionsRu: 'Зубы сомкнуты. Левый ретрактор максимально латерально и назад, правый ослаблен.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Левый точечный импульс вспышки',
	cameraAngleDegrees: 0,
	focalLengthMm: 100,
	magnification: '1:1.5 (Боковой сегмент)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'double_ended',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
	clinicalCheckpointsRu: [
		'Соотношение моляров и клыков по Энглю слева (21-27, 31-37)',
		'Бугорково-фиссурные контакты премоляров',
		'Оценка кривой Шпее слева',
	],
};
