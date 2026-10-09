import type { StatutoryIcd10Item } from "./types.js";

/**
 * 2. КЛИНИЧЕСКИЙ СПРАВОЧНИК ДИАГНОЗОВ МКБ-10 (СТОМАТОЛОГИЯ)
 */
export const STATUTORY_DENTAL_ICD10: readonly StatutoryIcd10Item[] = [
	// Кариес K02
	{ code: "K02.0", label: "Кариес эмали (в стадии пятна / поверхностный)", group: "Кариес", requiresTooth: true },
	{ code: "K02.1", label: "Кариес дентина (средний / глубокий)", group: "Кариес", requiresTooth: true },
	{ code: "K02.2", label: "Кариес цемента корня", group: "Кариес", requiresTooth: true },
	{ code: "K02.3", label: "Приостановившийся кариес зубов", group: "Кариес", requiresTooth: true },
	{ code: "K02.8", label: "Другой уточненный кариес зубов", group: "Кариес", requiresTooth: true },
	// Пульпа и периапикал K04
	{ code: "K04.0", label: "Пульпит (острый / хронический)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.01", label: "Начальный (гиперемия) пульпит", group: "Пульпа", requiresTooth: true },
	{ code: "K04.1", label: "Некроз пульпы (гангрена пульпы)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.2", label: "Дегенерация пульпы (дентиклы, пульпарные кальцификаты)", group: "Пульпа", requiresTooth: true },
	{ code: "K04.3", label: "Неправильное формирование твердых тканей в пульпе", group: "Пульпа", requiresTooth: true },
	{ code: "K04.4", label: "Острый апикальный периодонтит пульпарного происхождения", group: "Периапикал", requiresTooth: true },
	{ code: "K04.5", label: "Хронический апикальный периодонтит (гранулирующий / гранулематозный)", group: "Периапикал", requiresTooth: true },
	{ code: "K04.6", label: "Периапикальный абсцесс со свищом", group: "Периапикал", requiresTooth: true },
	{ code: "K04.7", label: "Периапикальный абсцесс без свища", group: "Периапикал", requiresTooth: true },
	{ code: "K04.8", label: "Корневая киста (периапикальная гранулема/киста)", group: "Периапикал", requiresTooth: true },
	// Пародонт K05
	{ code: "K05.0", label: "Острый гингивит (катаральный / язвенный)", group: "Пародонт", requiresTooth: false },
	{ code: "K05.1", label: "Хронический гингивит", group: "Пародонт", requiresTooth: false },
	{ code: "K05.2", label: "Острый пародонтит", group: "Пародонт", requiresTooth: false },
	{ code: "K05.3", label: "Хронический пародонтит (легкий / среднетяжелый / тяжелый)", group: "Пародонт", requiresTooth: false },
	{ code: "K05.4", label: "Пародонтоз", group: "Пародонт", requiresTooth: false },
	// Некариозные поражения K03
	{ code: "K03.0", label: "Повышенное стирание зубов (патологическая стираемость)", group: "Другие болезни зубов", requiresTooth: false },
	{ code: "K03.1", label: "Сошлифовывание зубов (клиновидный дефект)", group: "Другие болезни зубов", requiresTooth: true },
	{ code: "K03.2", label: "Эрозия зубов", group: "Другие болезни зубов", requiresTooth: false },
	{ code: "K03.3", label: "Патологическая резорбция корня зуба", group: "Другие болезни зубов", requiresTooth: true },
	{ code: "K03.6", label: "Отложения на зубах (зубной камень, налет)", group: "Другие болезни зубов", requiresTooth: false },
	// Развитие и прорезывание K00, K01
	{ code: "K00.0", label: "Адентия (полная / частичная гиподонтия)", group: "Развитие зубов", requiresTooth: false },
	{ code: "K01.0", label: "Вкрапленные зубы", group: "Хирургия", requiresTooth: true },
	{ code: "K01.1", label: "Ретинированный зуб (дистопия третьего моляра)", group: "Хирургия", requiresTooth: true },
	// Челюсти и аномалии K07, K08
	{ code: "K07.3", label: "Аномалии положения зубов (скученность, тортоаномалия)", group: "Ортодонтия", requiresTooth: false },
	{ code: "K07.4", label: "Аномалии прикуса неуточненные (дистальный, мезиальный прикус)", group: "Ортодонтия", requiresTooth: false },
	{ code: "K08.1", label: "Потеря зубов вследствие несчастного случая, удаления или локальной болезни", group: "Хирургия/Ортопедия", requiresTooth: true },
	{ code: "K08.2", label: "Атрофия беззубого альвеолярного края", group: "Хирургия/Ортопедия", requiresTooth: false },
	{ code: "K08.8", label: "Другие уточненные изменения зубов (несостоятельность пломбы / реставрации)", group: "Терапия", requiresTooth: true },
	// Профилактика Z01.2
	{ code: "Z01.2", label: "Стоматологическое обследование и санация полости рта (профосмотр)", group: "Профилактика", requiresTooth: false },
];

/**
 * Фильтрация справочника диагнозов МКБ-10
 */
export function getStatutoryIcd10Catalog(options?: { q?: string; group?: string }): readonly StatutoryIcd10Item[] {
	let list = STATUTORY_DENTAL_ICD10;
	if (options?.group) {
		const grp = options.group.toLowerCase().trim();
		list = list.filter((item) => item.group.toLowerCase().includes(grp));
	}
	if (options?.q) {
		const q = options.q.toLowerCase().trim();
		list = list.filter((item) => 
			item.code.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)
		);
	}
	return list;
}