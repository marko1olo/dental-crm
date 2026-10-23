/**
 * Extraoral Portrait Slots (Rest, Smile, Wide Smile)
 */

import { PhotoProtocolSlotDefinition } from './types';
import { SILHOUETTE_PATHS } from './silhouettes';

export const portrait_rest: PhotoProtocolSlotDefinition = {
	id: 'portrait_rest',
	category: 'extraoral',
	titleRu: 'Анфас в покое',
	shortLabelRu: 'Анфас покой',
	descriptionRu: 'Оценка лицевой симметрии, пропорций третей лица, Франкфуртской горизонтали и тонуса губ.',
	guideInstructionsRu: 'Пациент сидит прямо, взгляд вперед. Губы сомкнуты без напряжения. Франкфуртская горизонталь параллельна полу.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'softbox',
	recommendedFlashSettingRu: 'Два софтбокса 45° или биполярная вспышка с рассеивателями',
	cameraAngleDegrees: 0,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
	clinicalCheckpointsRu: [
		'Межзрачковая линия строго горизонтальна',
		'Срединно-лицевая линия вертикальна',
		'Равномерное освещение обеих половин лица',
		'Губы расслаблены, межгубная щель в покое 1-3 мм',
	],
};

export const portrait_smile: PhotoProtocolSlotDefinition = {
	id: 'portrait_smile',
	category: 'extraoral',
	titleRu: 'Анфас с естественной улыбкой',
	shortLabelRu: 'Анфас улыбка',
	descriptionRu: 'Оценка экспозиции резцов в покое и при улыбке, кривизны линии улыбки и десневого контура.',
	guideInstructionsRu: 'Попросите пациента улыбнуться естественно. Объектив на уровне смыкания губ. В кадре видны резцы и десна.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'softbox',
	recommendedFlashSettingRu: 'Биполярная вспышка / софтбоксы',
	cameraAngleDegrees: 0,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
	clinicalCheckpointsRu: [
		'Экспозиция клинических коронок верхних резцов (75-100%)',
		'Экспозиция десны (норма <= 2 мм)',
		'Консонантность линии улыбки нижнему контуру губы',
		'Симметрия уголков рта',
	],
};

export const portrait_smile_wide: PhotoProtocolSlotDefinition = {
	id: 'portrait_smile_wide',
	category: 'extraoral',
	titleRu: 'Анфас с широкой (активной) улыбкой',
	shortLabelRu: 'Широкая улыбка',
	descriptionRu: 'Анализ щечных коридоров (Negative Space), максимальной десневой экспозиции и ширины улыбки.',
	guideInstructionsRu: 'Пациент улыбается максимально широко. Контролируйте ширину коридоров.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'softbox',
	recommendedFlashSettingRu: 'Биполярная вспышка / софтбоксы',
	cameraAngleDegrees: 0,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
	clinicalCheckpointsRu: [
		'Ширина щечных коридоров (оптимум 8-10% от ширины зубной дуги)',
		'Видимость премоляров и первых моляров',
		'Отсутствие спазма мимических мышц',
	],
};
