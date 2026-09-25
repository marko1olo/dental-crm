/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U STATUTORY PROTOCOL PRESETS & CLINICAL CATALOG - TYPES
 * Order of the Ministry of Health of the Russian Federation № 834n / № 804n / Star
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { z } from "zod";
import type { ToothSurface } from "../documents/forms043u.js";

/** Клинические направления в стоматологии */
export const clinicalSpecialtyKindSchema = z.enum([
	"therapy", // Терапевтическая стоматология (кариесология, эндодонтия)
	"endodontics", // Специализированная эндодонтия
	"surgery", // Хирургическая стоматология и имплантология
	"orthopedics", // Ортопедическая стоматология (протезирование)
	"periodontics", // Пародонтология
	"orthodontics", // Ортодонтия
	"pediatric", // Детская стоматология
]);
export type ClinicalSpecialtyKind = z.infer<typeof clinicalSpecialtyKindSchema>;

export const clinicalSpecialtyLabels: Record<ClinicalSpecialtyKind, string> = {
	therapy: "Терапевтическая стоматология",
	endodontics: "Эндодонтия",
	surgery: "Хирургическая стоматология",
	orthopedics: "Ортопедическая стоматология",
	periodontics: "Пародонтология",
	orthodontics: "Ортодонтия",
	pediatric: "Детская стоматология",
};

/** Классы кариозных полостей по Блэку (Black Classification I-VI) */
export const blackCavityClassSchema = z.enum([
	"class_I", // Фиссуры и естественные ямки моляров, премоляров, нёбные ямки резцов
	"class_II", // Контактные (апроксимальные) поверхности моляров и премоляров
	"class_III", // Контактные поверхности резцов и клыков без поражения режущего края
	"class_IV", // Контактные поверхности резцов и клыков с нарушением угла режущего края
	"class_V", // Пришеечные области вестибулярных и оральных поверхностей всех зубов
	"class_VI", // Режущие края передних и вершины бугров боковых зубов (атипичные)
]);
export type BlackCavityClass = z.infer<typeof blackCavityClassSchema>;

export const blackCavityClassLabels: Record<BlackCavityClass, string> = {
	class_I: "Класс I по Блэку (фиссуры, естественные ямки жевательных зубов)",
	class_II: "Класс II по Блэку (апроксимальные/контактные поверхности моляров и премоляров)",
	class_III: "Класс III по Блэку (апроксимальные поверхности резцов/клыков без угла)",
	class_IV: "Класс IV по Блэку (апроксимальные поверхности резцов/клыков с повреждением угла/режущего края)",
	class_V: "Класс V по Блэку (пришеечная область вестибулярной/язычной поверхности)",
	class_VI: "Класс VI по Блэку (режущие края резцов и вершины бугров)",
};

/** Типы местной анестезии */
export const localAnesthesiaTypeSchema = z.enum([
	"infiltration", // Инфильтрационная анестезия
	"mandibular", // Мандибулярная проводниковая анестезия
	"torus", // Торусальная анестезия по Вейсбрему
	"tuberal", // Туберальная проводниковая анестезия
	"palatal", // Нёбная анестезия
	"incisive", // Резцовая анестезия
	"intraligamentary", // Интралигаментарная (внутрисвязочная) анестезия
	"intraosseous", // Внутрикостная анестезия
	"application", // Аппликационная поверхностная анестезия
]);
export type LocalAnesthesiaType = z.infer<typeof localAnesthesiaTypeSchema>;

/** Препараты для местной анестезии */
export const statutoryAnestheticDrugSchema = z.enum([
	"septanest_1_100000", // Септанест с адреналином 1:100000 (артикаин 4% + эпинефрин)
	"septanest_1_200000", // Септанест с адреналином 1:200000
	"ultracain_ds_forte", // Ультракаин Д-С форте 1:100000 (артикаин 4% + эпинефрин 1:100000)
	"ultracain_ds", // Ультракаин Д-С 1:200000 (артикаин 4% + эпинефрин 1:200000)
	"ubistesin_forte", // Убистезин форте 1:100000
	"ubistesin", // Убистезин 1:200000
	"scandonest_3_plain", // Скандонест 3% (мепивакаин 3% без вазоконстриктора — при ССЗ/беременности)
	"lidocaine_2", // Лидокаин 2% с адреналином
	"articaine_inibsa", // Артикаин Инибса 1:100000
]);
export type StatutoryAnestheticDrug = z.infer<typeof statutoryAnestheticDrugSchema>;
export const anestheticDrugSchema = statutoryAnestheticDrugSchema;
export type AnestheticDrug = StatutoryAnestheticDrug;

export const statutoryAnestheticDrugLabels: Record<StatutoryAnestheticDrug, { name: string; activeSubstance: string; carpuleVolumeMl: number; vasoconstrictor: string }> = {
	septanest_1_100000: {
		name: "Септанест с адреналином 1:100000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:100000 (10 мкг/мл)",
	},
	septanest_1_200000: {
		name: "Септанест с адреналином 1:200000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:200000 (5 мкг/мл)",
	},

	ultracain_ds_forte: {
		name: "Ультракаин Д-С форте 1:100000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:100000 (10 мкг/мл)",
	},
	ultracain_ds: {
		name: "Ультракаин Д-С 1:200000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:200000 (5 мкг/мл)",
	},
	ubistesin_forte: {
		name: "Убистезин форте 1:100000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:100000 (10 мкг/мл)",
	},
	ubistesin: {
		name: "Убистезин 1:200000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:200000 (5 мкг/мл)",
	},
	scandonest_3_plain: {
		name: "Скандонест 3% (без вазоконстриктора)",
		activeSubstance: "Мепивакаина гидрохлорид 30 мг/мл (3%)",
		carpuleVolumeMl: 1.8,
		vasoconstrictor: "Без вазоконстриктора (кардио-безопасный)",
	},
	lidocaine_2: {
		name: "Лидокаин 2%",
		activeSubstance: "Лидокаина гидрохлорид 20 мг/мл (2%)",
		carpuleVolumeMl: 2.0,
		vasoconstrictor: "Эпинефрин 1:100000",
	},
	articaine_inibsa: {
		name: "Артикаин Инибса 1:100000",
		activeSubstance: "Артикаина гидрохлорид 40 мг/мл (4%)",
		carpuleVolumeMl: 1.7,
		vasoconstrictor: "Эпинефрин 1:100000 (10 мкг/мл)",
	},
};

export const anestheticDrugLabels = statutoryAnestheticDrugLabels;

export interface Order804nServiceRef {
	readonly code: string;
	readonly nameRu: string;
	readonly isMandatory: boolean;
}

/** Структурированный клинический шаблон протокола */
export interface ClinicalProtocolTemplate {
	readonly icd10Code: string;
	readonly icd10Title: string;
	readonly clinicalDiagnosis: string;
	readonly specialty: ClinicalSpecialtyKind;
	readonly defaultSubjectiveComplaints: string;
	readonly defaultAnamnesisMorbi: string;
	readonly defaultObjectiveStatus: string;
	readonly defaultPercussion: "negative" | "positive_mild" | "positive_sharp";
	readonly defaultThermalTest: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
	readonly defaultProbing: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
	readonly defaultEodMicroamperes?: number | null;
	readonly defaultProcedureProtocol: string;
	readonly anesthesiaDefault: {
		drug: AnestheticDrug;
		doseCarpules: number;
		doseMl: number;
		technique: LocalAnesthesiaType;
	};
	readonly defaultMaterials: string[];
	readonly defaultRecommendations: string;
	readonly defaultPrescriptions?: string[];
	readonly requiresRubberDam: boolean;
	readonly requiresApexLocatorRvg: boolean;
	readonly statutoryOrderRef: string;
	readonly order804nServices: readonly Order804nServiceRef[];
}
