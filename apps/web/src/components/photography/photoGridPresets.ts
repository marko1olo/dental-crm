/**
 * Clinical Dental Photography Protocol Presets & Slot Definitions
 * Standard 12-shot Orthodontic & Aesthetic Grid (Стандарт фотопротокола)
 * 
 * Supports:
 * - Extraoral (Внеротовые): Rest, Smile, Wide Smile, Profile Rest, Profile Smile, 45° Semi-Profile
 * - Intraoral (Внутриротовые): Frontal Occlusion, Right Buccal, Left Buccal, Maxillary Occlusal, Mandibular Occlusal, Overjet
 * - Multiple Clinical Presets: Standard 12-Slot, Aesthetic 8-Slot, Express 6-Slot, Minimal 3-Slot
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
	| 'intraoral_right_buccal'
	| 'intraoral_left_buccal'
	| 'intraoral_maxillary_occlusal'
	| 'intraoral_mandibular_occlusal'
	| 'intraoral_overjet';

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
	uploadedAt?: string;
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
}

// ---------------------------------------------------------------------------
// Silhouette SVG Paths for Touch Guides
// ---------------------------------------------------------------------------

export const SILHOUETTE_PATHS = {
	// Full face portrait silhouette outline
	portraitFace: "M100,30 C135,30 165,60 165,105 C165,150 145,185 100,195 C55,185 35,150 35,105 C35,60 65,30 100,30 Z M70,85 A8,8 0 1,0 70,101 A8,8 0 1,0 70,85 Z M130,85 A8,8 0 1,0 130,101 A8,8 0 1,0 130,85 Z M100,105 L96,128 L104,128 Z M80,150 Q100,165 120,150",
	// Profile silhouette outline
	profileFace: "M70,30 C95,30 130,45 130,70 C130,85 120,95 125,105 Q145,115 130,125 Q145,135 128,145 C125,160 115,185 85,190 C60,195 45,165 45,110 C45,60 55,30 70,30 Z",
	// 45 degree semi-profile
	semiProfileFace: "M90,30 C125,30 155,55 155,100 C155,145 135,180 95,190 C60,180 40,150 40,105 C40,60 60,30 90,30 Z M75,85 A7,7 0 1,0 75,99 A7,7 0 1,0 75,85 Z M122,85 A7,7 0 1,0 122,99 A7,7 0 1,0 122,85 Z M85,148 Q102,160 118,148",
	// Intraoral frontal arch & incisors
	intraoralFrontal: "M30,70 Q100,50 170,70 Q180,100 170,130 Q100,150 30,130 Q20,100 30,70 Z M65,80 L75,115 L95,115 L90,80 Z M95,78 L100,118 L108,118 L105,78 Z M110,80 L105,115 L125,115 L135,80 Z",
	// Intraoral buccal lateral segment (canine-molar)
	intraoralBuccal: "M30,80 Q100,60 170,75 L165,125 Q100,140 30,120 Z M50,90 L65,115 L85,113 L75,88 Z M90,87 L98,113 L120,112 L115,86 Z M125,85 L132,110 L155,108 L150,84 Z",
	// Intraoral occlusal arch mirror view
	intraoralOcclusal: "M100,35 C150,35 175,80 170,165 C145,170 125,160 100,160 C75,160 55,170 30,165 C25,80 50,35 100,35 Z M80,60 Q100,50 120,60 Q145,90 145,140 Q100,130 55,140 Q55,90 80,60 Z",
	// Overjet / Sagittal bite close-up
	intraoralOverjet: "M50,60 C70,60 110,65 130,85 C140,95 140,110 120,115 C95,120 70,110 50,110 Z M65,105 C80,105 105,110 115,125 C120,135 110,145 95,145 C75,145 60,135 50,135 Z",
};

// ---------------------------------------------------------------------------
// 12 Standard Dental Protocol Slots
// ---------------------------------------------------------------------------

export const DENTAL_PHOTO_SLOTS: Record<StandardSlotId, PhotoProtocolSlotDefinition> = {
	portrait_rest: {
		id: 'portrait_rest',
		category: 'extraoral',
		titleRu: 'Анфас в покое',
		shortLabelRu: 'Анфас покой',
		descriptionRu: 'Оценка лицевой симметрии, пропорций третей лица, Франкфуртской горизонтали и тонуса губ в расслабленном состоянии.',
		guideInstructionsRu: 'Пациент сидит прямо, взгляд направлен вперед на уровне горизонта. Губы сомкнуты без напряжения. Волосы убраны за уши. Франкфуртская горизонталь строго параллельна полу.',
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
			'Губы расслаблены, межгубная щель в покое 1-3 мм'
		]
	},

	portrait_smile: {
		id: 'portrait_smile',
		category: 'extraoral',
		titleRu: 'Анфас с естественной улыбкой',
		shortLabelRu: 'Анфас улыбка',
		descriptionRu: 'Оценка экспозиции резцов в покое и при улыбке, кривизны линии улыбки, десневого контура и совпадения центральных линий.',
		guideInstructionsRu: 'Попросите пациента улыбнуться естественно («на счет три» или на выдохе). Объектив на уровне смыкания губ. В кадре видны резцы и десна.',
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
			'Симметрия уголков рта'
		]
	},

	portrait_smile_wide: {
		id: 'portrait_smile_wide',
		category: 'extraoral',
		titleRu: 'Анфас с широкой (активной) улыбкой',
		shortLabelRu: 'Широкая улыбка',
		descriptionRu: 'Анализ щечных коридоров (Negative Space), максимальной десневой экспозиции и ширины улыбки (количество зубов в коридоре).',
		guideInstructionsRu: 'Пациент улыбается максимально широко («голливудская широкая улыбка»). Контролируйте ширину темных боковых щечных коридоров.',
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
			'Отсутствие спазма мимических мышц'
		]
	},

	profile_90_rest: {
		id: 'profile_90_rest',
		category: 'extraoral',
		titleRu: 'Профиль 90° в покое',
		shortLabelRu: 'Профиль покой',
		descriptionRu: 'Оценка типа профиля (прямой / выпуклый / вогнутый), носогубного угла, подбородочно-шейного угла и эстетической линии Риккетса (E-Line).',
		guideInstructionsRu: 'Пациент поворачивается строго под углом 90° к камере. Взгляд направлен вперед на горизонт. Франкфуртская горизонталь параллельна полу. В кадре виден контур носа, губ и подбородка.',
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
			'Четкий контур края нижней челюсти'
		]
	},

	profile_90_smile: {
		id: 'profile_90_smile',
		category: 'extraoral',
		titleRu: 'Профиль 90° с улыбкой',
		shortLabelRu: 'Профиль улыбка',
		descriptionRu: 'Оценка протрузии/ретрузии верхних резцов при улыбке в сагиттальной плоскости, поддержка верхней губы резцами.',
		guideInstructionsRu: 'Пациент в положении строгого профиля (90°) улыбается естественной улыбкой. Фокус на резцах и профиле губ.',
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
			'Оценка вертикального перекрытия резцов'
		]
	},

	portrait_45_smile: {
		id: 'portrait_45_smile',
		category: 'extraoral',
		titleRu: 'Полуанфас 45° с улыбкой',
		shortLabelRu: 'Полуанфас 45°',
		descriptionRu: 'Трехмерная эстетическая оценка улыбки, щечного объема скул, выраженности щечных коридоров и гармонии перехода фронт-боковой сегмент.',
		guideInstructionsRu: 'Пациент поворачивает голову на 45° относительно объектива. Кончик носа не должен выходить за контур противоположной щеки. Естественная улыбка.',
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
			'Объем альвеолярного гребня в зоне премоляров'
		]
	},

	intraoral_frontal_occlusion: {
		id: 'intraoral_frontal_occlusion',
		category: 'intraoral',
		titleRu: 'Фронтальный вид в привычной окклюзии',
		shortLabelRu: 'Окклюзия фронт',
		descriptionRu: 'Оценка совпадения центральных линий верхней и нижней челюсти, глубины резцового перекрытия (Overbite), формы десневого края и межзубных сосочков.',
		guideInstructionsRu: 'Установите двусторонние ретракторы губ и щек. Слюноотсос для удаления пены. Объектив строго перпендикулярен окклюзионной плоскости. Пациент плотно смыкает боковые зубы в привычную окклюзию.',
		recommendedAspectRatio: '3:2',
		recommendedFlashSetting: 'twin_flash',
		recommendedFlashSettingRu: 'Биполярная вспышка (Twin Flash) на 12 и 6 часов или 9 и 3 часа',
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
			'Отсутствие слюны и пузырьков на эмали'
		]
	},

	intraoral_right_buccal: {
		id: 'intraoral_right_buccal',
		category: 'intraoral',
		titleRu: 'Правый боковой сегмент (по Энглю)',
		shortLabelRu: 'Правый боковой',
		descriptionRu: 'Определение класса окклюзии по Энглю справа (клыки и первые моляры), контакта бугров, оверджета и окклюзионных кривых (Шпее, Уилсона).',
		guideInstructionsRu: 'Пациент смыкает зубы. Правый ретрактор оттягивается сильно латерально и дистально, левый ретрактор ослабляется. Используйте боковое зеркало при необходимости. Объектив под углом 90° к щечной поверхности моляров.',
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
			'Отсутствие перекрытия мягкими тканями щеки'
		]
	},

	intraoral_left_buccal: {
		id: 'intraoral_left_buccal',
		category: 'intraoral',
		titleRu: 'Левый боковой сегмент (по Энглю)',
		shortLabelRu: 'Левый боковой',
		descriptionRu: 'Определение класса смыкания по Энглю слева (клыки и первые моляры), трансверзальных соотношений (перекрестный прикус).',
		guideInstructionsRu: 'Пациент сомкнул зубы. Левый ретрактор оттягивается максимально латерально и назад, правый ослаблен. Камера строго перпендикулярна телу левых моляров.',
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
			'Оценка кривой Шпее слева'
		]
	},

	intraoral_maxillary_occlusal: {
		id: 'intraoral_maxillary_occlusal',
		category: 'intraoral',
		titleRu: 'Окклюзионный вид верхней челюсти',
		shortLabelRu: 'ВЧ окклюзия',
		descriptionRu: 'Форма и симметрия зубной дуги верхней челюсти, торк и ротации резцов, свод неба, небный шов, дефекты твердых тканей и окклюзионные контакты.',
		guideInstructionsRu: 'Используйте широкое окклюзионное зеркало с теплым обдувом воздухом (предотвращение запотевания). Ретракторы оттягивают верхнюю губу вверх и вперед. Объектив направлен в зеркало под углом 45°. В кадре видна вся дуга от 17 до 27 зуба.',
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
			'Отсутствие запотевания зеркала и отражения пальцев ассистента',
			'Четкий фокус на режущих краях и фиссурах'
		]
	},

	intraoral_mandibular_occlusal: {
		id: 'intraoral_mandibular_occlusal',
		category: 'intraoral',
		titleRu: 'Окклюзионный вид нижней челюсти',
		shortLabelRu: 'НЧ окклюзия',
		descriptionRu: 'Форма и симметрия зубного ряда нижней челюсти, скученность фронтального отдела, ротации премоляров и положение языка.',
		guideInstructionsRu: 'Окклюзионное зеркало укладывается на нижнюю челюсть. Пациент поднимает язык к мягкому небу. Ретракторы оттягивают нижнюю губу вниз. Обдув зеркала теплым воздухом.',
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
			'Симметричное освещение без бликов на зеркале'
		]
	},

	intraoral_overjet: {
		id: 'intraoral_overjet',
		category: 'intraoral',
		titleRu: 'Сагиттальная щель (Overjet / Overbite)',
		shortLabelRu: 'Сагиттальная щель',
		descriptionRu: 'Крупный план сагиттального несоответствия (Overjet в мм), резцового перекрытия (Overbite), контактов режущих краев и наклона резцов.',
		guideInstructionsRu: 'Ретракторы раскрыты. Объектив строго параллелен окклюзионной плоскости с бокового ракурса 45-60° или снизу вверх. Сфокусируйтесь на контакте верхних и нижних центральных резцов (11, 21 / 31, 41).',
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
			'Микрорельеф и мамелоны режущего края'
		]
	}
};

// ---------------------------------------------------------------------------
// Clinical Protocol Presets
// ---------------------------------------------------------------------------

export const STANDARD_12_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'standard_12_ortho_aesthetic',
	nameRu: 'Полный ортодонтический и эстетический фотопротокол (12 кадров)',
	shortNameRu: 'Стандарт 12 кадров',
	descriptionRu: 'Золотой стандарт клинической фотографии: 6 внеротовых портретных кадров + 6 внутриротовых окклюзионных и сегментарных снимков.',
	slots: [
		DENTAL_PHOTO_SLOTS.portrait_rest,
		DENTAL_PHOTO_SLOTS.portrait_smile,
		DENTAL_PHOTO_SLOTS.portrait_smile_wide,
		DENTAL_PHOTO_SLOTS.profile_90_rest,
		DENTAL_PHOTO_SLOTS.profile_90_smile,
		DENTAL_PHOTO_SLOTS.portrait_45_smile,
		DENTAL_PHOTO_SLOTS.intraoral_frontal_occlusion,
		DENTAL_PHOTO_SLOTS.intraoral_right_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_left_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_maxillary_occlusal,
		DENTAL_PHOTO_SLOTS.intraoral_mandibular_occlusal,
		DENTAL_PHOTO_SLOTS.intraoral_overjet,
	],
	totalSlots: 12,
	categoryCount: {
		extraoral: 6,
		intraoral: 6
	}
};

export const AESTHETIC_8_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'aesthetic_8_prosthodontic',
	nameRu: 'Ортопедический / Эстетический протокол (8 кадров)',
	shortNameRu: 'Ортопедия 8 кадров',
	descriptionRu: 'Сфокусирован на дизайне улыбки, винирах, коронках и тотальной реабилитации: 4 портретных + 4 ключевых внутриротовых кадра.',
	slots: [
		DENTAL_PHOTO_SLOTS.portrait_rest,
		DENTAL_PHOTO_SLOTS.portrait_smile,
		DENTAL_PHOTO_SLOTS.profile_90_smile,
		DENTAL_PHOTO_SLOTS.portrait_45_smile,
		DENTAL_PHOTO_SLOTS.intraoral_frontal_occlusion,
		DENTAL_PHOTO_SLOTS.intraoral_right_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_left_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_maxillary_occlusal,
	],
	totalSlots: 8,
	categoryCount: {
		extraoral: 4,
		intraoral: 4
	}
};

export const EXPRESS_6_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'express_6_monitoring',
	nameRu: 'Экспресс-контроль и мониторинг лечения (6 кадров)',
	shortNameRu: 'Экспресс 6 кадров',
	descriptionRu: 'Быстрый протокол для регулярных визитов (активация брекетов/элайнеров, динамика гигиены): 2 портрета + 4 внутриротовых.',
	slots: [
		DENTAL_PHOTO_SLOTS.portrait_rest,
		DENTAL_PHOTO_SLOTS.portrait_smile,
		DENTAL_PHOTO_SLOTS.intraoral_frontal_occlusion,
		DENTAL_PHOTO_SLOTS.intraoral_right_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_left_buccal,
		DENTAL_PHOTO_SLOTS.intraoral_overjet,
	],
	totalSlots: 6,
	categoryCount: {
		extraoral: 2,
		intraoral: 4
	}
};

export const MINIMAL_3_SLOT_PROTOCOL: PhotoProtocolPreset = {
	id: 'minimal_3_therapy',
	nameRu: 'Терапевтический протокол (3 кадра: До/После)',
	shortNameRu: 'Терапия 3 кадра',
	descriptionRu: 'Минимальный набор для фиксации реставраций и отбеливания зубов: Улыбка, Фронтальная окклюзия, Окклюзия ВЧ.',
	slots: [
		DENTAL_PHOTO_SLOTS.portrait_smile,
		DENTAL_PHOTO_SLOTS.intraoral_frontal_occlusion,
		DENTAL_PHOTO_SLOTS.intraoral_maxillary_occlusal,
	],
	totalSlots: 3,
	categoryCount: {
		extraoral: 1,
		intraoral: 2
	}
};

export const CLINICAL_PROTOCOLS_REGISTRY: PhotoProtocolPreset[] = [
	STANDARD_12_SLOT_PROTOCOL,
	AESTHETIC_8_SLOT_PROTOCOL,
	EXPRESS_6_SLOT_PROTOCOL,
	MINIMAL_3_SLOT_PROTOCOL
];

export function getPresetById(id: string): PhotoProtocolPreset {
	const found = CLINICAL_PROTOCOLS_REGISTRY.find(p => p.id === id);
	return found || STANDARD_12_SLOT_PROTOCOL;
}

export function getSlotDefinitionById(slotId: string): PhotoProtocolSlotDefinition | undefined {
	return (DENTAL_PHOTO_SLOTS as Record<string, PhotoProtocolSlotDefinition>)[slotId];
}
