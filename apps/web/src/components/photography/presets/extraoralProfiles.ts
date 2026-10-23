/**
 * Extraoral Profile & Semi-Profile Slots
 */

import { PhotoProtocolSlotDefinition } from './types';
import { SILHOUETTE_PATHS } from './silhouettes';

export const profile_90_rest: PhotoProtocolSlotDefinition = {
	id: 'profile_90_rest',
	category: 'extraoral',
	titleRu: 'Профиль 90° в покое',
	shortLabelRu: 'Профиль покой',
	descriptionRu: 'Оценка типа профиля, носогубного угла, подбородочно-шейного угла и линии Риккетса (E-Line).',
	guideInstructionsRu: 'Пациент под углом 90° к камере. Взгляд на горизонт. Франкфуртская горизонталь параллельна полу.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Контражурная вспышка для четкого контура профиля',
	cameraAngleDegrees: 90,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.profileFace,
	clinicalCheckpointsRu: [
		'Носогубный угол (норма 90-110°)',
		'Эстетическая линия Риккетса (E-Line: верхняя губа -4 мм, нижняя -2 мм)',
		'Подбородочно-губная складка (глубина 3-4 мм)',
		'Четкий контур края нижней челюсти',
	],
};

export const profile_90_smile: PhotoProtocolSlotDefinition = {
	id: 'profile_90_smile',
	category: 'extraoral',
	titleRu: 'Профиль 90° с улыбкой',
	shortLabelRu: 'Профиль улыбка',
	descriptionRu: 'Оценка протрузии/ретрузии верхних резцов при улыбке в сагиттальной плоскости.',
	guideInstructionsRu: 'Пациент в положении строгого профиля (90°) улыбается естественной улыбкой. Фокус на резцах.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Биполярная вспышка',
	cameraAngleDegrees: 90,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.profileFace,
	clinicalCheckpointsRu: [
		'Инклинация верхних резцов относительно вертикали',
		'Степень выдвижения губы при улыбке',
		'Оценка вертикального перекрытия резцов',
	],
};

export const portrait_45_smile: PhotoProtocolSlotDefinition = {
	id: 'portrait_45_smile',
	category: 'extraoral',
	titleRu: 'Полуанфас 45° с улыбкой',
	shortLabelRu: 'Полуанфас 45°',
	descriptionRu: 'Трехмерная эстетическая оценка улыбки, щечного объема скул и перехода фронт-боковой сегмент.',
	guideInstructionsRu: 'Поворот головы на 45°. Кончик носа не выходит за контур противоположной щеки.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'softbox',
	recommendedFlashSettingRu: 'Биполярная вспышка с софтбоксами',
	cameraAngleDegrees: 45,
	focalLengthMm: 85,
	magnification: '1:10 (Лицо)',
	requiresMirror: false,
	requiresRetractor: false,
	retractorType: 'none',
	silhouetteSvgPath: SILHOUETTE_PATHS.semiProfileFace,
	clinicalCheckpointsRu: [
		'Кончик носа строго внутри щечного контура',
		'Плавный переход улыбки в щечный коридор',
		'Объем альвеолярного гребня в зоне премоляров',
	],
};
