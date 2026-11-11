/**
 * labUnifiedWorkTypesData.ts — Канонические зубные конструкции ЗТЛ и расценки в копейках.
 */

export type DentalLabConstructionType =
	| "crown_zirconia"
	| "crown_emax"
	| "metal_ceramic"
	| "clasp_denture"
	| "aligner_splint"
	| "surgical_guide";

export interface DentalLabConstructionDef {
	readonly id: DentalLabConstructionType;
	readonly canonicalWorkTypeId?: string;
	readonly nameRu: string;
	readonly shortNameRu: string;
	readonly categoryRu: string;
	readonly defaultMaterialRu: string;
	readonly standardTurnaroundDays: number;
	readonly requiresVitaShade: boolean;
	readonly requiresStumpShade: boolean;
	readonly requiresTranslucency: boolean;
	readonly defaultPatientPriceKopecks: number;
	readonly defaultZtlCostKopecks: number;
	readonly descriptionRu: string;
}

export const DENTAL_LAB_CONSTRUCTIONS: Record<DentalLabConstructionType, DentalLabConstructionDef> = {
	crown_zirconia: {
		id: "crown_zirconia",
		canonicalWorkTypeId: "wt_003",
		nameRu: "Коронка из диоксида циркония (Multi-layer)",
		shortNameRu: "Коронка цирконий",
		categoryRu: "Несъемное протезирование",
		defaultMaterialRu: "Многослойный высокопрочный диоксид циркония Multi-layer",
		standardTurnaroundDays: 5,
		requiresVitaShade: true,
		requiresStumpShade: true,
		requiresTranslucency: true,
		defaultPatientPriceKopecks: 2400000, // 24 000 руб
		defaultZtlCostKopecks: 750000,       // 7 500 руб себестоимость ЗТЛ
		descriptionRu: "Анатомическая монолитная коронка из высокопрочного диоксида циркония с плавным градиентом цвета.",
	},
	crown_emax: {
		id: "crown_emax",
		canonicalWorkTypeId: "wt_005",
		nameRu: "Коронка / винир из дисиликата лития (IPS e.max Press)",
		shortNameRu: "E-max пресс",
		categoryRu: "Высокоэстетичная керамика",
		defaultMaterialRu: "Цельнокерамический дисиликат лития высокой прозрачности",
		standardTurnaroundDays: 5,
		requiresVitaShade: true,
		requiresStumpShade: true,
		requiresTranslucency: true,
		defaultPatientPriceKopecks: 2600000, // 26 000 руб
		defaultZtlCostKopecks: 850000,       // 8 500 руб себестоимость ЗТЛ
		descriptionRu: "Цельнокерамическая реставрация с естественной опалесценцией для фронтальной и жевательной зоны.",
	},
	metal_ceramic: {
		id: "metal_ceramic",
		canonicalWorkTypeId: "wt_001",
		nameRu: "Металлокерамическая коронка (Co-Cr фрезерованный / литой)",
		shortNameRu: "Металлокерамика",
		categoryRu: "Классическое протезирование",
		defaultMaterialRu: "Биосовместимый Co-Cr сплав с полевошпатной керамической облицовкой",
		standardTurnaroundDays: 6,
		requiresVitaShade: true,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1400000, // 14 000 руб
		defaultZtlCostKopecks: 380000,       // 3 800 руб себестоимость ЗТЛ
		descriptionRu: "Металлокерамическая коронка на прочном кобальт-хромовом каркасе с керамической облицовкой.",
	},
	clasp_denture: {
		id: "clasp_denture",
		canonicalWorkTypeId: "wt_007",
		nameRu: "Бюгельный протез (замковый / кламмерный)",
		shortNameRu: "Бюгельный протез",
		categoryRu: "Съемное протезирование",
		defaultMaterialRu: "Литой Co-Cr каркас + прецизионные замковые аттачмены + гарнитурные зубы",
		standardTurnaroundDays: 8,
		requiresVitaShade: true,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 3800000, // 38 000 руб — каноническая синхронизированная цена
		defaultZtlCostKopecks: 1300000,      // 13 000 руб себестоимость ЗТЛ
		descriptionRu: "Дуговой протез с замковыми аттачменами или литыми удерживающими кламмерами.",
	},
	aligner_splint: {
		id: "aligner_splint",
		nameRu: "Ортодонтическая каппа / элайнер / сплинт",
		shortNameRu: "Каппа / элайнер",
		categoryRu: "Ортодонтия и гнатология",
		defaultMaterialRu: "Биосовместимый многослойный полимер Duran / Zendura FLX 0.75мм",
		standardTurnaroundDays: 4,
		requiresVitaShade: false,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1800000, // 18 000 руб
		defaultZtlCostKopecks: 550000,       // 5 500 руб себестоимость ЗТЛ
		descriptionRu: "Прозрачная индивидуальная каппа для ортодонтического перемещения или окклюзионной декомпрессии.",
	},
	surgical_guide: {
		id: "surgical_guide",
		canonicalWorkTypeId: "wt_017",
		nameRu: "Хирургический навигационный шаблон для имплантации",
		shortNameRu: "Хирургический шаблон",
		categoryRu: "Дентальная имплантация CAD/CAM",
		defaultMaterialRu: "Фотополимер Medical Clear 3D Print + титановые гильзы",
		standardTurnaroundDays: 3,
		requiresVitaShade: false,
		requiresStumpShade: false,
		requiresTranslucency: false,
		defaultPatientPriceKopecks: 1500000, // 15 000 руб
		defaultZtlCostKopecks: 500000,       // 5 000 руб себестоимость ЗТЛ
		descriptionRu: "Точный шаблон на основе совмещения КЛКТ и оптического скана со направляющими втулками.",
	},
};
