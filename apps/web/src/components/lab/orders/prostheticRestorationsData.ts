import type { ProstheticTypeDefinition } from "./prostheticTypesCatalogTypes";

export const PROSTHETIC_RESTORATIONS_DATA: Record<
	| 'veneer_refractory'
	| 'implant_screw_retained_crown'
	| 'removable_clasp_prosthesis'
	| 'all_on_4_hybrid',
	ProstheticTypeDefinition
> = {
	veneer_refractory: {
		id: 'veneer_refractory',
		nameRu: 'Керамический винир на рефракторе / полевошпатная керамика',
		shortNameRu: 'Винир на рефракторе',
		category: 'aesthetic',
		categoryNameRu: 'Эстетическая стоматология',
		descriptionRu: 'Ультратонкий керамический винир ручной послойной лепки на огнеупорной штампиковой модели (0.2–0.4 мм). Максимальная эстетика.',
		icon: 'sparkles',
		defaultMaterialId: 'feldspathic_refractory',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 28000,
		defaultCostLabRub: 10500
	},
	implant_screw_retained_crown: {
		id: 'implant_screw_retained_crown',
		nameRu: 'Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO₂)',
		shortNameRu: 'Коронка на имплантате (Винтовая)',
		category: 'implant',
		categoryNameRu: 'Протезирование на имплантатах',
		descriptionRu: 'Коронка из диоксида циркония с шахтой под винт, вклеенная на оригинальное титановое основание (Ti-Base / Multi-Unit).',
		icon: 'screw',
		defaultMaterialId: 'zirconia_tibase',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: true,
		defaultPriceClinicRub: 38000,
		defaultCostLabRub: 13000
	},
	removable_clasp_prosthesis: {
		id: 'removable_clasp_prosthesis',
		nameRu: 'Бюгельный протез с кламмерной/замковой фиксацией Bredent',
		shortNameRu: 'Бюгельный протез Bredent',
		category: 'removable',
		categoryNameRu: 'Съемное протезирование',
		descriptionRu: 'Цельнолитой дуговой протез на Co-Cr каркасе с микрозамковыми креплениями Bredent VKS-SG / кламмерами и гарнитурными зубами.',
		icon: 'layers',
		defaultMaterialId: 'cobalt_chromium_bredent',
		standardTurnaroundWorkingDays: 10,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 45000,
		defaultCostLabRub: 16000
	},
	all_on_4_hybrid: {
		id: 'all_on_4_hybrid',
		nameRu: 'Условно-съемный протез на титановой балке All-on-4 / All-on-6',
		shortNameRu: 'Балка All-on-4/6',
		category: 'implant_full_arch',
		categoryNameRu: 'Тотальная имплантология',
		descriptionRu: 'Фрезерованная индивидуальная балка из титана Grade 5 с фиксацией на Multi-Unit абатменты, композитной десной и армированными зубами.',
		icon: 'arch',
		defaultMaterialId: 'titanium_bar_pmma_zirconia',
		standardTurnaroundWorkingDays: 12,
		requiresStumpShade: false,
		requiresImplantSystem: true,
		requiresFittingStage: true,
		defaultPriceClinicRub: 180000,
		defaultCostLabRub: 65000
	}
};
