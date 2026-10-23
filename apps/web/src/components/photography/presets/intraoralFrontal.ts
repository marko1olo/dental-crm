/**
 * Intraoral Frontal Photography Slots
 */

import { PhotoProtocolSlotDefinition } from './types';
import { SILHOUETTE_PATHS } from './silhouettes';

export const intraoral_frontal_occlusion: PhotoProtocolSlotDefinition = {
	id: 'intraoral_frontal_occlusion',
	category: 'intraoral',
	titleRu: 'Фронтальный вид в привычной окклюзии',
	shortLabelRu: 'Окклюзия фронт',
	descriptionRu: 'Оценка совпадения центральных линий, глубины резцового перекрытия (Overbite), контура десны.',
	guideInstructionsRu: 'Установите двусторонние ретракторы. Слюноотсос. Объектив перпендикулярен окклюзионной плоскости. Плотное смыкание.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Биполярная вспышка (Twin Flash)',
	cameraAngleDegrees: 0,
	focalLengthMm: 100,
	magnification: '1:2 (Зубные дуги)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'vestibular_clear',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralFrontal,
	clinicalCheckpointsRu: [
		'Совпадение косметического центра с лицевой срединной линией',
		'Величина резцового перекрытия (норма 1/3 высоты коронки, 2-3 мм)',
		'Окклюзионная плоскость строго горизонтальна',
		'Отсутствие слюны и пузырьков на эмали',
	],
};

export const intraoral_frontal_disclusion: PhotoProtocolSlotDefinition = {
	id: 'intraoral_frontal_disclusion',
	category: 'intraoral',
	titleRu: 'Фронтальный вид с разобщением (дезокклюзия)',
	shortLabelRu: 'Фронт разобщение',
	descriptionRu: 'Оценка режущих краев резцов ВЧ и НЧ, формы амбразур, мамелонов, прозрачности эмали.',
	guideInstructionsRu: 'Двусторонние ретракторы. Пациент слегка приоткрывает рот (разобщение 2-4 мм), кончик языка назад.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Биполярная вспышка 1:2',
	cameraAngleDegrees: 0,
	focalLengthMm: 100,
	magnification: '1:2 (Фронтальный сегмент)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'vestibular_clear',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralFrontalDisclusion,
	clinicalCheckpointsRu: [
		'Разобщение резцов на 2-4 мм без окклюзионного контакта',
		'Четкая визуализация формы режущих краев и амбразур',
		'Отсутствие слюны и пузырьков в межзубных промежутках',
		'Темный фон полости рта без видимости языка',
	],
};

export const intraoral_enamel_macro: PhotoProtocolSlotDefinition = {
	id: 'intraoral_enamel_macro',
	category: 'intraoral',
	titleRu: '1:1 Макро текстуры эмали и микрорельефа',
	shortLabelRu: '1:1 Макро эмали',
	descriptionRu: 'Сверхвысокая детализация текстуры эмали, перикимат, трещин, флюорозных пятен для виниров.',
	guideInstructionsRu: 'Макрообъектив 1:1. Черные контрастеры за резцы. Боковой свет вспышки 45° для подчеркивания текстуры.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'dual_point',
	recommendedFlashSettingRu: 'Боковая макровспышка с поляризационным фильтром (Cross-Polarized)',
	cameraAngleDegrees: 0,
	focalLengthMm: 100,
	magnification: '1:1 (Макро текстуры)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'contraster',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralEnamelMacro,
	clinicalCheckpointsRu: [
		'Максимальная резкость микротекстуры (перикиматы, валики)',
		'Глубина и градиент опалесценции режущего края',
		'Отсутствие паразитных бликов (поляризация / софтбокс)',
		'Черный матовый фон контрастера',
	],
};
