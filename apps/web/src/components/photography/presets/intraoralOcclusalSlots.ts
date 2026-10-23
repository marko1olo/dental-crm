/**
 * Intraoral Occlusal & Overjet Photography Slots
 */

import { PhotoProtocolSlotDefinition } from './types';
import { SILHOUETTE_PATHS } from './silhouettes';

export const intraoral_maxillary_occlusal: PhotoProtocolSlotDefinition = {
	id: 'intraoral_maxillary_occlusal',
	category: 'intraoral',
	titleRu: 'Окклюзионный вид верхней челюсти',
	shortLabelRu: 'ВЧ окклюзия',
	descriptionRu: 'Форма и симметрия зубной дуги верхней челюсти, торк и ротации резцов, свод неба, небный шов.',
	guideInstructionsRu: 'Широкое окклюзионное зеркало с теплым обдувом воздухом. Ретракторы оттягивают верхнюю губу вверх и вперед. Объектив под углом 45°.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'ring_flash',
	recommendedFlashSettingRu: 'Кольцевая вспышка или сдвоенная вспышка под углом к зеркалу',
	cameraAngleDegrees: 45,
	focalLengthMm: 100,
	magnification: '1:2 (Зубные дуги)',
	requiresMirror: true,
	requiresRetractor: true,
	retractorType: 'contraster',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
	clinicalCheckpointsRu: [
		'Полная визуализация зубного ряда от 17 до 27 зуба включительно',
		'Срединный небный шов совпадает с вертикальной осью кадра',
		'Отсутствие запотевания зеркала и отражения пальцев',
		'Четкий фокус на режущих краях и фиссурах',
	],
};

export const intraoral_mandibular_occlusal: PhotoProtocolSlotDefinition = {
	id: 'intraoral_mandibular_occlusal',
	category: 'intraoral',
	titleRu: 'Окклюзионный вид нижней челюсти',
	shortLabelRu: 'НЧ окклюзия',
	descriptionRu: 'Форма и симметрия зубного ряда нижней челюсти, скученность фронтального отдела, ротации премоляров.',
	guideInstructionsRu: 'Окклюзионное зеркало на нижнюю челюсть. Язык к мягкому небу. Ретракторы вниз. Обдув теплым воздухом.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'ring_flash',
	recommendedFlashSettingRu: 'Кольцевая вспышка / Twin Flash',
	cameraAngleDegrees: 45,
	focalLengthMm: 100,
	magnification: '1:2 (Зубные дуги)',
	requiresMirror: true,
	requiresRetractor: true,
	retractorType: 'contraster',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
	clinicalCheckpointsRu: [
		'Полный зубной ряд от 37 до 47 зуба',
		'Язык убран назад и не перекрывает язычные поверхности моляров',
		'Симметрия параболической формы дуги',
		'Симметричное освещение без бликов на зеркале',
	],
};

export const intraoral_overjet: PhotoProtocolSlotDefinition = {
	id: 'intraoral_overjet',
	category: 'intraoral',
	titleRu: 'Сагиттальная щель (Overjet / Overbite)',
	shortLabelRu: 'Сагиттальная щель',
	descriptionRu: 'Крупный план сагиттального несоответствия (Overjet в мм), резцового перекрытия (Overbite), контактов режущих краев.',
	guideInstructionsRu: 'Ретракторы раскрыты. Объектив параллелен окклюзионной плоскости с бокового ракурса 45-60°. Фокус на 11, 21 / 31, 41.',
	recommendedAspectRatio: '3:2',
	recommendedFlashSetting: 'twin_flash',
	recommendedFlashSettingRu: 'Биполярная вспышка макро 1:1',
	cameraAngleDegrees: 30,
	focalLengthMm: 100,
	magnification: '1:1 (Фронтальные резцы)',
	requiresMirror: false,
	requiresRetractor: true,
	retractorType: 'vestibular_clear',
	silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOverjet,
	clinicalCheckpointsRu: [
		'Точное расстояние между небной поверхностью верхнего резца и вестибулярной поверхностью нижнего резца',
		'Глубина вертикального резцового перекрытия',
		'Микрорельеф и мамелоны режущего края',
	],
};
