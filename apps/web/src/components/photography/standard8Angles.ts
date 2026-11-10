import { SILHOUETTE_PATHS } from './presets/silhouettes';
import type { PhotoSlotRecord } from './photoGridPresets';

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

export const STANDARD_8_CLINICAL_ANGLES: readonly Standard8AngleDefinition[] = [
	{
		key: 'portrait_rest',
		slotId: 'portrait_rest',
		sequenceNumber: 1,
		titleRu: 'Лицо в покое (анфас)',
		shortLabelRu: 'Анфас покой',
		category: 'extraoral',
		descriptionRu: 'Оценка лицевой симметрии, пропорций третей лица, Франкфуртской горизонтали и тонуса губ в расслабленном состоянии.',
		guideInstructionsRu: 'Пациент сидит прямо, взгляд направлен вперед на уровне горизонта. Губы сомкнуты без напряжения. Волосы убраны за уши. Франкфуртская горизонталь строго параллельна полу.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
		clinicalCheckpointsRu: [
			'Межзрачковая линия строго горизонтальна',
			'Срединно-лицевая линия вертикальна',
			'Равномерное освещение обеих половин лица',
			'Межгубная щель в покое 1-3 мм',
		],
	},
	{
		key: 'portrait_smile',
		slotId: 'portrait_smile',
		sequenceNumber: 2,
		titleRu: 'Улыбка (анфас)',
		shortLabelRu: 'Анфас улыбка',
		category: 'extraoral',
		descriptionRu: 'Оценка экспозиции резцов в покое и при улыбке, кривизны линии улыбки, десневого контура и совпадения центральных линий.',
		guideInstructionsRu: 'Пациент улыбается естественной открытой улыбкой. Объектив на уровне смыкания губ. В кадре видны резцы, премоляры и десневой край.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.portraitFace,
		clinicalCheckpointsRu: [
			'Экспозиция клинических коронок верхних резцов (75-100%)',
			'Экспозиция десны в норме (<= 2 мм)',
			'Консонантность линии улыбки нижнему контуру губы',
			'Симметрия уголков рта',
		],
	},
	{
		key: 'profile',
		slotId: 'profile_90_rest',
		sequenceNumber: 3,
		titleRu: 'Профиль (справа/слева)',
		shortLabelRu: 'Профиль',
		category: 'extraoral',
		descriptionRu: 'Оценка типа профиля (прямой / выпуклый / вогнутый), носогубного угла, подбородочно-губной борозды и эстетической линии Риккетса (E-Line).',
		guideInstructionsRu: 'Пациент поворачивается строго под углом 90° к объективу. Взгляд направлен вперед на горизонт. Франкфуртская горизонталь параллельна полу.',
		requiresRetractor: false,
		requiresMirror: false,
		retractorType: 'none',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.profileFace,
		clinicalCheckpointsRu: [
			'Носогубный угол (норма 90-110°)',
			'Эстетическая линия Риккетса (E-Line: верхняя губа -4 мм, нижняя -2 мм)',
			'Подбородочно-губная борозда (глубина 3-4 мм)',
			'Четкий контур края нижней челюсти',
		],
	},
	{
		key: 'intraoral_frontal_occlusion',
		slotId: 'intraoral_frontal_occlusion',
		sequenceNumber: 4,
		titleRu: 'Окклюзия фронтальная с ретрактором',
		shortLabelRu: 'Фронт окклюзия',
		category: 'intraoral',
		descriptionRu: 'Оценка смыкания зубных рядов в положении привычной окклюзии, глубина резцового перекрытия, сагиттальная щель, совпадение средних линий.',
		guideInstructionsRu: 'Используйте два прозрачных вестибулярных ретрактора. Пациент смыкает зубы на жевательных зубах. Объектив на уровне окклюзионной плоскости строго перпендикулярно зубному ряду.',
		requiresRetractor: true,
		requiresMirror: false,
		retractorType: 'vestibular_clear',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralFrontal,
		clinicalCheckpointsRu: [
			'Плотный фиссурно-бугорковый контакт моляров',
			'Резцовое перекрытие (overbite) в пределах 1/3 высоты коронки',
			'Сагиттальная щель (overjet) 1-2 мм',
			'Совпадение межрезцовых линий с уздечками',
		],
	},
	{
		key: 'intraoral_right_buccal',
		slotId: 'intraoral_right_buccal',
		sequenceNumber: 5,
		titleRu: 'Окклюзия боковая правая с зеркалом',
		shortLabelRu: 'Боковая правая',
		category: 'intraoral',
		descriptionRu: 'Определение класса смыкания по Энглю справа (клыки и первые моляры), контактов премоляров и окклюзионной кривой Шпее.',
		guideInstructionsRu: 'Пациент смыкает зубы. Правый ретрактор оттягивается максимально латерально и назад. Используется боковое зеркало. Камера строго перпендикулярна правым молярам.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'double_ended',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
		clinicalCheckpointsRu: [
			'Соотношение моляров и клыков по Энглю справа (11-17, 41-47)',
			'Бугорково-фиссурные контакты премоляров',
			'Оценка кривой Шпее справа',
		],
	},
	{
		key: 'intraoral_left_buccal',
		slotId: 'intraoral_left_buccal',
		sequenceNumber: 6,
		titleRu: 'Окклюзия боковая левая с зеркалом',
		shortLabelRu: 'Боковая левая',
		category: 'intraoral',
		descriptionRu: 'Определение класса смыкания по Энглю слева (клыки и первые моляры), трансверзальных соотношений (перекрестный прикус).',
		guideInstructionsRu: 'Пациент смыкает зубы. Левый ретрактор оттягивается максимально латерально и назад. Используется боковое зеркало. Камера строго перпендикулярна левым молярам.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'double_ended',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralBuccal,
		clinicalCheckpointsRu: [
			'Соотношение моляров и клыков по Энглю слева (21-27, 31-37)',
			'Бугорково-фиссурные контакты премоляров',
			'Оценка кривой Шпее слева',
		],
	},
	{
		key: 'intraoral_maxillary_occlusal',
		slotId: 'intraoral_maxillary_occlusal',
		sequenceNumber: 7,
		titleRu: 'Верхний зубной ряд (окклюзионный вид с зеркалом)',
		shortLabelRu: 'Верхний ряд',
		category: 'intraoral',
		descriptionRu: 'Форма и симметрия зубной дуги верхней челюсти, торк и ротации резцов, свод неба, небный шов, дефекты твердых тканей и окклюзионные контакты.',
		guideInstructionsRu: 'Используйте широкое окклюзионное зеркало с теплым обдувом воздухом (предотвращение запотевания). Ретракторы оттягивают верхнюю губу вперед и вверх. В кадре видна вся дуга от 17 до 27 зуба.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'contraster',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
		clinicalCheckpointsRu: [
			'Полная визуализация зубного ряда от 17 до 27 зуба включительно',
			'Срединный небный шов совпадает с вертикальной осью кадра',
			'Отсутствие запотевания зеркала и отражения пальцев',
			'Четкий фокус на режущих краях и фиссурах',
		],
	},
	{
		key: 'intraoral_mandibular_occlusal',
		slotId: 'intraoral_mandibular_occlusal',
		sequenceNumber: 8,
		titleRu: 'Нижний зубной ряд (окклюзионный вид с зеркалом)',
		shortLabelRu: 'Нижний ряд',
		category: 'intraoral',
		descriptionRu: 'Форма и симметрия зубного ряда нижней челюсти, скученность фронтального отдела, ротации премоляров и положение языка.',
		guideInstructionsRu: 'Окклюзионное зеркало укладывается на нижнюю челюсть. Пациент поднимает язык к мягкому небу. Ретракторы оттягивают нижнюю губу вниз. Обдув зеркала теплым воздухом.',
		requiresRetractor: true,
		requiresMirror: true,
		retractorType: 'contraster',
		recommendedAspectRatio: '3:2',
		silhouetteSvgPath: SILHOUETTE_PATHS.intraoralOcclusal,
		clinicalCheckpointsRu: [
			'Полный зубной ряд от 37 до 47 зуба',
			'Язык отведен назад и не перекрывает язычные поверхности моляров',
			'Симметрия параболической формы дуги',
			'Симметричное освещение без бликов на зеркале',
		],
	},
];

export const STANDARD_8_ANGLES_MAP: Record<string, Standard8AngleDefinition> = Object.fromEntries(
	STANDARD_8_CLINICAL_ANGLES.flatMap((a) => [
		[a.key, a],
		[a.slotId, a],
	])
);

export function getStandard8Angle(keyOrSlotId: string): Standard8AngleDefinition | undefined {
	return STANDARD_8_ANGLES_MAP[keyOrSlotId];
}

export interface ProtocolCompletenessResult {
	readonly totalRequired: number; // 8
	readonly uploadedCount: number;
	readonly completionPercentage: number;
	readonly isComplete: boolean;
	readonly missingAngles: readonly Standard8AngleDefinition[];
	readonly extraoralCount: number; // 0..3
	readonly intraoralCount: number; // 0..5
}

export function calculateProtocolCompleteness(
	slots: Record<string, PhotoSlotRecord | { imageUrl?: string } | undefined>
): ProtocolCompletenessResult {
	let uploadedCount = 0;
	let extraoralCount = 0;
	let intraoralCount = 0;
	const missingAngles: Standard8AngleDefinition[] = [];

	for (const angle of STANDARD_8_CLINICAL_ANGLES) {
		const rec = slots[angle.slotId] || slots[angle.key];
		const hasImage = Boolean(rec && rec.imageUrl && rec.imageUrl.trim().length > 0);
		if (hasImage) {
			uploadedCount += 1;
			if (angle.category === 'extraoral') extraoralCount += 1;
			if (angle.category === 'intraoral') intraoralCount += 1;
		} else {
			missingAngles.push(angle);
		}
	}

	const totalRequired = 8;
	const completionPercentage = Math.round((uploadedCount / totalRequired) * 100);
	const isComplete = uploadedCount === totalRequired;

	return {
		totalRequired,
		uploadedCount,
		completionPercentage,
		isComplete,
		missingAngles,
		extraoralCount,
		intraoralCount,
	};
}
