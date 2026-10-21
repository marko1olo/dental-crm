import type {
	InjectionTechniqueId,
	InjectionTechniqueInfo,
} from "./anesthesiaCatalogTypes.js";

export const INJECTION_TECHNIQUES: Record<
	InjectionTechniqueId,
	InjectionTechniqueInfo
> = {
	infiltration: {
		id: "infiltration",
		nameRu: "Инфильтрационная (вестибулярная)",
		anatomicalLandmarksRu:
			"Переходная складка в проекции верхушки корня зуба под углом 45° к надкостнице.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu:
			"Пульпа зуба, надкостница, слизистая оболочка вестибулярной поверхности.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0,
	},
	mandibular_torus: {
		id: "mandibular_torus",
		nameRu: "Проводниковая мандибулярная / Торусальная (по Вейсбрему)",
		anatomicalLandmarksRu:
			"Нижнечелюстной валик (torus mandibulae) в углублении между крыловидно-нижнечелюстной складкой и щекой на 0.5 см ниже окклюзии верхних моляров.",
		defaultNeedle: "g27_long_35mm",
		targetAnesthesiaZonesRu:
			"Нижний альвеолярный, язычный и щечный нервы (все зубы половины нижней челюсти, 2/3 языка, слизистая).",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.7,
	},
	mental_incisive: {
		id: "mental_incisive",
		nameRu: "Ментальная (подбородочная блокада)",
		anatomicalLandmarksRu:
			"Подбородочное отверстие между корнями 34-35 (44-45) зубов в переходной складке.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu:
			"Премоляры, клыки, резцы нижней челюсти и мягкие ткани подбородка и нижней губы.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.0,
	},
	tuberal: {
		id: "tuberal",
		nameRu: "Туберальная (бугор верхней челюсти)",
		anatomicalLandmarksRu:
			"Бугор верхней челюсти позади скулоальвеолярного гребня на уровне 2-го верхнего моляра.",
		defaultNeedle: "g27_long_35mm",
		targetAnesthesiaZonesRu:
			"Задние верхние альвеолярные нервы (моляры верхней челюсти и гайморова пазуха).",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 1.5,
	},
	palatal_greater: {
		id: "palatal_greater",
		nameRu: "Палатинальная (большое нёбное отверстие)",
		anatomicalLandmarksRu:
			"Большое нёбное отверстие кнутри от 3-го моляра верхней челюсти на 1 см медиальнее десневого края.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu:
			"Слизистая оболочка твердого нёба и нёбная надкостница от моляров до клыка.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.3,
	},
	incisive_canal: {
		id: "incisive_canal",
		nameRu: "Резцовая (резцовый сосочек / назопалатинальная)",
		anatomicalLandmarksRu:
			"Резцовый сосочек по срединной линии нёба позади центральных резцов.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu:
			"Слизистая нёба в области резцов и клыков верхней челюсти.",
		aspirationCheckMandatory: true,
		typicalVolumeCarpules: 0.2,
	},
	intraligamentary_sta: {
		id: "intraligamentary_sta",
		nameRu: "Интралигаментарная (внутрисвязочная / компьютерная STA)",
		anatomicalLandmarksRu:
			"Периодонтальная щель под углом 30° к продольной оси корня зуба под давлением.",
		defaultNeedle: "g30_ultrashort_12mm",
		targetAnesthesiaZonesRu:
			"Изолированная пульпа одного зуба без онемения губ и щек.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.4,
	},
	intraseptal: {
		id: "intraseptal",
		nameRu: "Интрасептальная (внутриперегородочная)",
		anatomicalLandmarksRu:
			"Межзубная костная перегородка на 2 мм ниже вершины десневого сосочка.",
		defaultNeedle: "g30_ultrashort_12mm",
		targetAnesthesiaZonesRu: "Костная ткань, периодонт и прилежащая десна.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.5,
	},
	application_topical: {
		id: "application_topical",
		nameRu: "Аппликационная (поверхностная лидокаин/бензокаин гель)",
		anatomicalLandmarksRu:
			"Высушенная слизистая оболочка в месте предполагаемого вкола иглы.",
		defaultNeedle: "g30_short_21mm",
		targetAnesthesiaZonesRu: "Поверхностные слои слизистой на глубину 2-3 мм.",
		aspirationCheckMandatory: false,
		typicalVolumeCarpules: 0.0,
	},
};
