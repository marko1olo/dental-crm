export type ProstheticTypeId =
	| 'crown_zirconia_monolithic'    // Диоксид циркония Prettau / Katana ML
	| 'crown_pmma_temporary'         // Временная фрезерованная коронка PMMA CAD/CAM
	| 'crown_pfm_cocr'               // Металлокерамика Co-Cr (Duceram Plus)
	| 'crown_emax_press'             // Пресс-керамика IPS e.max Press
	| 'veneer_refractory'            // Керамический винир на рефракторе / полевошпатная керамика
	| 'implant_screw_retained_crown' // Коронка на имплантате с винтовой фиксацией (Ti-base + ZrO₂)
	| 'removable_clasp_prosthesis'   // Бюгельный протез с кламмерной/замковой фиксацией Bredent
	| 'all_on_4_hybrid'              // Условно-съемный протез на титановой балке All-on-4 / All-on-6
	| 'surgical_guide_3d'            // Навигационный хирургический шаблон с титановыми втулками
	| 'orthodontic_aligners_set'     // Комплект ортодонтических элайнеров CAD/CAM (1 клик)
	| 'orthodontic_retention_splint' // Ретенционная прозрачная каппа / вакуум-сплинт
	| 'orthodontic_expansion_plate'  // Съемная пластинка с расширяющим винтом
	| 'orthodontic_tmj_splint';      // Окклюзионный миорелаксирующий сплинт / шина ВНЧС (1 клик)

export type ProstheticCategory =
	| 'fixed'
	| 'aesthetic'
	| 'implant'
	| 'removable'
	| 'implant_full_arch'
	| 'digital_cad'
	| 'orthodontic';

export interface ProstheticTypeDefinition {
	id: ProstheticTypeId;
	nameRu: string;
	shortNameRu: string;
	category: ProstheticCategory;
	categoryNameRu: string;
	descriptionRu: string;
	icon: string;
	defaultMaterialId: string;
	standardTurnaroundWorkingDays: number;
	requiresStumpShade: boolean;
	requiresImplantSystem: boolean;
	requiresFittingStage: boolean;
	defaultPriceClinicRub: number;
	defaultCostLabRub: number;
}
