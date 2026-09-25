/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U STATUTORY PROTOCOL PRESETS & CLINICAL CATALOG
 * Order of the Ministry of Health of the Russian Federation № 834n / № 804n / Star
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./emrProtocolTypes.js";
import type { ClinicalProtocolTemplate, ClinicalSpecialtyKind } from "./emrProtocolTypes.js";
import { THERAPY_EMR_PROTOCOL_CATALOG } from "./emrProtocolCatalogTherapy.js";
import { SPECIALTY_EMR_PROTOCOL_CATALOG } from "./emrProtocolCatalogSpecialty.js";

export { THERAPY_EMR_PROTOCOL_CATALOG, SPECIALTY_EMR_PROTOCOL_CATALOG };

/**
 * Базовый каталог клинических протоколов по МКБ-10 (Приказ Минздрава № 834н / СтАР)
 */
export const STATUTORY_EMR_PROTOCOL_CATALOG: Record<string, ClinicalProtocolTemplate> = {
	...THERAPY_EMR_PROTOCOL_CATALOG,
	...SPECIALTY_EMR_PROTOCOL_CATALOG,
};

/** Дополнительные МКБ-10 коды для полного стоматологического классификатора */
export const COMPANION_ICD10_CODES: Record<string, { title: string; category: ClinicalSpecialtyKind; fallbackPresetKey: string }> = {
	"K02.0": { title: "Кариес эмали (в стадии пятна / поверхностный)", category: "therapy", fallbackPresetKey: "K02.1" },
	"K02.2": { title: "Кариес цемента корня", category: "therapy", fallbackPresetKey: "K02.1" },
	"K03.0": { title: "Повышенное стирание твердых тканей зубов (патологическая стираемость)", category: "orthopedics", fallbackPresetKey: "K08.1_ORTHO" },
	"K03.1": { title: "Сошлифовывание зубов (клиновидный дефект)", category: "therapy", fallbackPresetKey: "K02.1" },
	"K03.2": { title: "Эрозия зубов", category: "therapy", fallbackPresetKey: "K02.1" },
	"K04.4": { title: "Острый апикальный периодонтит пульпарного происхождения", category: "endodontics", fallbackPresetKey: "K04.5" },
	"K04.8": { title: "Корневая киста / апикальная гранулема", category: "endodontics", fallbackPresetKey: "K04.5" },
	"K05.0": { title: "Острый гингивит (катаральный / язвенный)", category: "periodontics", fallbackPresetKey: "K05.3" },
	"K05.1": { title: "Хронический гингивит", category: "periodontics", fallbackPresetKey: "K05.3" },
	"K08.2": { title: "Атрофия беззубого альвеолярного края", category: "surgery", fallbackPresetKey: "K08.1" },
	"K08.8": { title: "Другие уточненные изменения зубов и их опорного аппарата (замена несостоятельной пломбы / реставрации)", category: "therapy", fallbackPresetKey: "K08.8" },
};



/**
 * Возвращает клинический протокол по коду МКБ-10
 */
export function getClinicalProtocolTemplate(icd10Code: string, specialty?: ClinicalSpecialtyKind): ClinicalProtocolTemplate {
	const normalizedCode = icd10Code.trim().toUpperCase();
	const directMatch = STATUTORY_EMR_PROTOCOL_CATALOG[normalizedCode];
	if (directMatch) {
		return directMatch;
	}

	// Проверка расширенного ортопедического пресета
	if (specialty === "orthopedics" && (normalizedCode === "K08.1" || normalizedCode === "K03.0")) {
		const orthoMatch = STATUTORY_EMR_PROTOCOL_CATALOG["K08.1_ORTHO"];
		if (orthoMatch) return orthoMatch;
	}

	// Проверка таблицы компаньонов
	if (COMPANION_ICD10_CODES[normalizedCode]) {
		const companion = COMPANION_ICD10_CODES[normalizedCode];
		const baseTemplate = STATUTORY_EMR_PROTOCOL_CATALOG[companion.fallbackPresetKey];
		if (baseTemplate) {
			return {
				...baseTemplate,
				icd10Code: normalizedCode,
				icd10Title: companion.title,
				clinicalDiagnosis: `${companion.title} (${normalizedCode})`,
				specialty: companion.category,
			};
		}
	}

	// Дефолтный fallback на кариес дентина K02.1
	const defaultK021 = STATUTORY_EMR_PROTOCOL_CATALOG["K02.1"];
	if (defaultK021) {
		return defaultK021;
	}

	// Экстренный пуленепробиваемый fallback
	return {
		icd10Code: "K02.1",
		icd10Title: "Кариес дентина (Caries of dentine)",
		clinicalDiagnosis: "Кариес дентина (средний кариес)",
		specialty: "therapy",
		defaultSubjectiveComplaints: "Жалобы на кратковременные боли от холодного и сладкого.",
		defaultAnamnesisMorbi: "Полость обнаружена 1 месяц назад.",
		defaultObjectiveStatus: "Кариозная полость в пределах средних слоев дентина.",
		defaultPercussion: "negative",
		defaultThermalTest: "transient_pain",
		defaultProbing: "along_enamel_dentin_border",
		defaultEodMicroamperes: 5,
		defaultProcedureProtocol: "Препарирование, медикаментозная обработка, адгезивный протокол, пломбирование композитом светового отверждения, шлифовка, полировка.",
		anesthesiaDefault: {
			drug: "septanest_1_100000",
			doseCarpules: 1,
			doseMl: 1.7,
			technique: "infiltration",
		},
		defaultMaterials: ["Septanest 1:100000 1.7ml", "Адгезив", "Композит"],
		defaultRecommendations: "Контрольный осмотр через 6 месяцев.",
		requiresRubberDam: true,
		requiresApexLocatorRvg: false,
		statutoryOrderRef: "Приказ Минздрава РФ № 834н",
		order804nServices: [
			{
				code: "A16.07.002.001",
				nameRu: "Наложение пломбы из фотополимерного материала при лечении кариозных полостей",
				isMandatory: true,
			},
			{ code: "A16.07.031", nameRu: "Препарирование твердых тканей зуба при лечении кариеса", isMandatory: true },
		],
	};
}
