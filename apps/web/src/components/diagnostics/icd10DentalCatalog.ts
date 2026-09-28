export * from "./icd10Types";
import type { DentalIcd10Item, DentalIcd10RubricMeta } from "./icd10Types";
import { DENTAL_ICD10_CATALOG_PART1 } from "./icd10CatalogPart1";
import { DENTAL_ICD10_CATALOG_PART2 } from "./icd10CatalogPart2";

/**
 * Базовые стоматологические рубрики МКБ-10 (K00–K14).
 */
export const DENTAL_ICD10_RUBRIC_MAP: Readonly<Record<string, DentalIcd10RubricMeta>> = {
	K00: {
		rubric: "K00",
		titleRu: "Нарушения развития и прорезывания зубов",
		shortTitle: "Развитие и прорезывание",
		requiresTooth: false,
		defaultSpecialty: "orthodontics",
		description: "Адентия, гиподонтия, сверхкомплектные зубы, нарушения структуры эмали и дентина",
	},
	K01: {
		rubric: "K01",
		titleRu: "Вкрапленные и ретенированные зубы",
		shortTitle: "Ретенция и дистопия",
		requiresTooth: false,
		defaultSpecialty: "surgery",
		description: "Ретенированные и дистопированные зубы, полуретенция третьих моляров и клыков",
	},
	K02: {
		rubric: "K02",
		titleRu: "Кариес зубов",
		shortTitle: "Кариес",
		requiresTooth: true,
		defaultSpecialty: "therapy",
		description: "Кариозное поражение эмали, дентина, цемента, приостановившийся кариес",
	},
	K03: {
		rubric: "K03",
		titleRu: "Другие болезни твердых тканей зубов",
		shortTitle: "Некариозные поражения",
		requiresTooth: false,
		defaultSpecialty: "therapy",
		description: "Повышенное стирание, сошлифовывание, клиновидный дефект, эрозия, отложения",
	},
	K04: {
		rubric: "K04",
		titleRu: "Болезни пульпы и периапикальных тканей",
		shortTitle: "Пульпит и периодонтит",
		requiresTooth: true,
		defaultSpecialty: "therapy",
		description: "Острый и хронический пульпит, некроз пульпы, апикальный периодонтит, периапикальный абсцесс, киста",
	},
	K05: {
		rubric: "K05",
		titleRu: "Гингивит и болезни пародонта",
		shortTitle: "Пародонтология",
		requiresTooth: true,
		defaultSpecialty: "periodontics",
		description: "Острый и хронический гингивит, пародонтит локализованный и генерализованный, пародонтоз",
	},
	K06: {
		rubric: "K06",
		titleRu: "Другие изменения десны и беззубого альвеолярного края",
		shortTitle: "Изменения десны",
		requiresTooth: false,
		defaultSpecialty: "periodontics",
		description: "Рецессия десны, гипертрофия, поражения десны после травмы",
	},
	K07: {
		rubric: "K07",
		titleRu: "Челюстно-лицевые аномалии (включая аномалии прикуса)",
		shortTitle: "Ортодонтия и прикус",
		requiresTooth: false,
		defaultSpecialty: "orthodontics",
		description: "Аномалии челюстей, соотношений зубных дуг, дистальный, мезиальный, глубокий прикус, патология ВНЧС",
	},
	K08: {
		rubric: "K08",
		titleRu: "Другие изменения зубов и их опорного аппарата (потеря зубов)",
		shortTitle: "Адентия и корни",
		requiresTooth: false,
		defaultSpecialty: "orthopedics",
		description: "Частичная и полная потеря зубов (адентия), атрофия альвеолярного отростка, оставшийся корень",
	},
	K09: {
		rubric: "K09",
		titleRu: "Кисты области рта, не классифицированные в других рубриках",
		shortTitle: "Кисты челюстей",
		requiresTooth: false,
		defaultSpecialty: "surgery",
		description: "Одонтогенные и неодонтогенные кисты челюстей и мягких тканей рта",
	},
	K10: {
		rubric: "K10",
		titleRu: "Другие болезни челюстей",
		shortTitle: "Болезни челюстей",
		requiresTooth: false,
		defaultSpecialty: "surgery",
		description: "Остеомиелит, альвеолит (сухая лунка), периостит челюстей",
	},
	K11: {
		rubric: "K11",
		titleRu: "Болезни слюнных желез",
		shortTitle: "Слюнные железы",
		requiresTooth: false,
		defaultSpecialty: "surgery",
		description: "Сиаладенит, сиалолитиаз (слюннокаменная болезнь), мукоцеле",
	},
	K12: {
		rubric: "K12",
		titleRu: "Стоматит и родственные поражения",
		shortTitle: "Стоматиты",
		requiresTooth: false,
		defaultSpecialty: "therapy",
		description: "Рецидивирующие афты, афтозный стоматит, герпетиформный стоматит, язвы полости рта",
	},
	K13: {
		rubric: "K13",
		titleRu: "Другие болезни губ и слизистой оболочки полости рта",
		shortTitle: "Слизистая и губы",
		requiresTooth: false,
		defaultSpecialty: "therapy",
		description: "Хейлит, лейкоплакия, эритроплакия слизистой рта",
	},
	K14: {
		rubric: "K14",
		titleRu: "Болезни языка",
		shortTitle: "Болезни языка",
		requiresTooth: false,
		defaultSpecialty: "therapy",
		description: "Глоссит, географический язык, глоссодиния, гипертрофия сосочков языка",
	},
};

/**
 * Полный реестр стоматологических диагнозов МКБ-10 с синонимами, клиническими тегами и правилами валидации.
 */
export const DENTAL_ICD10_CATALOG: readonly DentalIcd10Item[] = [
	...DENTAL_ICD10_CATALOG_PART1,
	...DENTAL_ICD10_CATALOG_PART2,
];


/**
 * Быстрый поиск элемента каталога по нормализованному коду.
 */
export const DENTAL_ICD10_MAP = new Map<string, DentalIcd10Item>(
	DENTAL_ICD10_CATALOG.map((item) => [item.code, item]),
);

/**
 * Канонический ТОП-12 амбулаторных стоматологических диагнозов для мгновенного 1-клик выбора врачом.
 * Покрывает 95%+ всех амбулаторных визитов частной стоматологии (терапия, ортопедия, пародонтология, ортодонтия, хирургия).
 */
export const TOP_12_AMBULATORY_DIAGNOSES_CODES = [
	"K02.0", // Кариес эмали
	"K02.1", // Кариес дентина
	"K04.0", // Пульпит
	"K04.5", // Хронический апикальный периодонтит
	"K05.0", // Острый гингивит
	"K05.1", // Хронический гингивит
	"K05.3", // Хронический пародонтит
	"K08.1", // Потеря зубов вследствие удаления
	"K07.4", // Аномалия прикуса неуточненная
	"K01.1", // Ретинированные зубы
	"K03.1", // Сошлифовывание твердых тканей / клиновидный дефект
	"K08.8", // Другие уточненные изменения зубов
] as const;

export const TOP_12_AMBULATORY_PRESETS: readonly DentalIcd10Item[] =
	TOP_12_AMBULATORY_DIAGNOSES_CODES.map((code) => {
		const item = DENTAL_ICD10_MAP.get(code);
		if (!item) {
			throw new Error(`Top-12 diagnosis ${code} missing from DENTAL_ICD10_MAP`);
		}
		return item;
	});

/**
 * Топ популярных клинических диагнозов для панели быстрых пресетов (1 клик).
 */
export const POPULAR_CLINICAL_PRESETS: readonly DentalIcd10Item[] =
	TOP_12_AMBULATORY_PRESETS;
