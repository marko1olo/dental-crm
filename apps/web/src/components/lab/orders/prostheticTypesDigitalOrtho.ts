import type { ProstheticTypeId, ProstheticTypeDefinition } from "./prostheticTypesCatalogTypes";

export const PROSTHETIC_TYPES_DIGITAL_ORTHO: Record<
	| 'surgical_guide_3d'
	| 'orthodontic_aligners_set'
	| 'orthodontic_retention_splint'
	| 'orthodontic_expansion_plate'
	| 'orthodontic_tmj_splint',
	ProstheticTypeDefinition
> = {
	surgical_guide_3d: {
		id: 'surgical_guide_3d',
		nameRu: 'Навигационный хирургический шаблон с титановыми втулками',
		shortNameRu: 'Хирургический шаблон 3D',
		category: 'digital_cad',
		categoryNameRu: 'Цифровая навигация',
		descriptionRu: 'Прецизионный навигационный шаблон, напечатанный из биосовместимого фотополимера с направляющими втулками под протокол имплантации.',
		icon: 'crosshair',
		defaultMaterialId: 'photopolymer_biocompatible',
		standardTurnaroundWorkingDays: 3,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: false,
		defaultPriceClinicRub: 15000,
		defaultCostLabRub: 5000
	},
	orthodontic_aligners_set: {
		id: 'orthodontic_aligners_set',
		nameRu: 'Комплект ортодонтических элайнеров 3D CAD/CAM',
		shortNameRu: 'Элайнеры CAD/CAM',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Набор прецизионных прозрачных элайнеров из термопластического полиуретана по виртуальному 3D-сетапу.',
		icon: 'sparkles',
		defaultMaterialId: 'aligner_polyurethane_duran',
		standardTurnaroundWorkingDays: 5,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 60000,
		defaultCostLabRub: 22000
	},
	orthodontic_retention_splint: {
		id: 'orthodontic_retention_splint',
		nameRu: 'Ретенционная прозрачная каппа / вакуум-сплинт',
		shortNameRu: 'Ретенционная каппа',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Вакуумформованная прозрачная ретенционная каппа толщиной 1.0 мм для стабилизации результатов лечения.',
		icon: 'shield',
		defaultMaterialId: 'aligner_polyurethane_duran',
		standardTurnaroundWorkingDays: 3,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 7000,
		defaultCostLabRub: 2500
	},
	orthodontic_expansion_plate: {
		id: 'orthodontic_expansion_plate',
		nameRu: 'Съемная ортодонтическая пластинка с расширяющим винтом',
		shortNameRu: 'Пластинка с винтом',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Акриловый съемный аппарат с кламмерами Адамса, вестибулярной дугой и расширяющим винтом Бертони/Хааса.',
		icon: 'sliders',
		defaultMaterialId: 'orthodontic_acrylic_leocryl',
		standardTurnaroundWorkingDays: 6,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 14000,
		defaultCostLabRub: 5000
	},
	orthodontic_tmj_splint: {
		id: 'orthodontic_tmj_splint',
		nameRu: 'Окклюзионный сплинт / миорелаксирующая шина ВНЧС',
		shortNameRu: 'Сплинт ВНЧС',
		category: 'orthodontic',
		categoryNameRu: 'Ортодонтия и элайнеры',
		descriptionRu: 'Фрезерованный или вакуумный депрограммирующий/стабилизирующий окклюзионный сплинт для лечения дисфункций ВНЧС и бруксизма.',
		icon: 'shield',
		defaultMaterialId: 'aligner_polyurethane_duran',
		standardTurnaroundWorkingDays: 4,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 18000,
		defaultCostLabRub: 6000
	}
};
