import type { ProstheticTypeDefinition } from "./prostheticTypesCatalogTypes";

export const PROSTHETIC_CROWNS_DATA: Record<
	| 'crown_zirconia_monolithic'
	| 'crown_pmma_temporary'
	| 'crown_pfm_cocr'
	| 'crown_emax_press',
	ProstheticTypeDefinition
> = {
	crown_zirconia_monolithic: {
		id: 'crown_zirconia_monolithic',
		nameRu: 'Диоксид циркония Prettau / Katana ML (Multilayer)',
		shortNameRu: 'Коронка ZrO₂ (Katana ML)',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Анатомическая монолитная коронка из многослойного диоксида циркония с плавным градиентом цвета и прочности (Katana / Prettau).',
		icon: 'crown',
		defaultMaterialId: 'zirconia_katana_ml',
		standardTurnaroundWorkingDays: 5,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 24000,
		defaultCostLabRub: 7500
	},
	crown_pmma_temporary: {
		id: 'crown_pmma_temporary',
		nameRu: 'Временная фрезерованная коронка PMMA CAD/CAM',
		shortNameRu: 'Временная PMMA CAD/CAM',
		category: 'fixed',
		categoryNameRu: 'Провизорное протезирование',
		descriptionRu: 'Высокоточная провизорная коронка из фрезерованного полимера PMMA CAD/CAM, зазор 40 мкм.',
		icon: 'crown',
		defaultMaterialId: 'pmma_cad_cam',
		standardTurnaroundWorkingDays: 2,
		requiresStumpShade: false,
		requiresImplantSystem: false,
		requiresFittingStage: false,
		defaultPriceClinicRub: 3500,
		defaultCostLabRub: 1200
	},
	crown_pfm_cocr: {
		id: 'crown_pfm_cocr',
		nameRu: 'Металлокерамическая коронка (Duceram Plus) — классика',
		shortNameRu: 'Металлокерамика Co-Cr (Duceram)',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Классическая металлокерамика Co-Cr с фарфоровой облицовкой Duceram Plus, зазор 40 мкм.',
		icon: 'crown',
		defaultMaterialId: 'pfm_cocr_duceram',
		standardTurnaroundWorkingDays: 7,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 15000,
		defaultCostLabRub: 5000
	},
	crown_emax_press: {
		id: 'crown_emax_press',
		nameRu: 'Пресс-керамика IPS e.max Press (анатомическая / с нанесением)',
		shortNameRu: 'Коронка e.max Press',
		category: 'fixed',
		categoryNameRu: 'Несъемное протезирование',
		descriptionRu: 'Высокоэстетичная коронка из дисиликата лития e.max Press. Высокая опалесценция и естественная светопроницаемость.',
		icon: 'gem',
		defaultMaterialId: 'emax_press',
		standardTurnaroundWorkingDays: 6,
		requiresStumpShade: true,
		requiresImplantSystem: false,
		requiresFittingStage: true,
		defaultPriceClinicRub: 22000,
		defaultCostLabRub: 8000
	}
};
