/**
 * packages/shared/src/clinical/dentalIcd10Catalog.ts
 *
 * Полный канонический классификатор стоматологических диагнозов МКБ-10 (K00..K14, Z-коды)
 * Соответствует классификатору Стоматологической Ассоциации России (СтАР) и Минздрава РФ.
 * Мандаты 8e (Автономия врача), 8s (Анти-блоат & SSOT), 8x (Клинический язык).
 */

export interface DentalIcd10Entry {
	readonly code: string;
	readonly label: string;
	readonly group: string;
	readonly rubric: string;
	readonly requiresTooth?: boolean;
	readonly description?: string;
}

export const DENTAL_ICD10_RUBRICS_MAP: Readonly<Record<string, { titleRu: string; group: string; requiresTooth: boolean }>> = {
	K00: { titleRu: "Нарушения развития и прорезывания зубов", group: "Развитие и прикус", requiresTooth: false },
	K01: { titleRu: "Ретенированные и вкрапленные зубы", group: "Хирургия", requiresTooth: true },
	K02: { titleRu: "Кариес зубов", group: "Кариес", requiresTooth: true },
	K03: { titleRu: "Другие болезни твердых тканей зубов", group: "Другое", requiresTooth: true },
	K04: { titleRu: "Болезни пульпы и периапикальных тканей", group: "Пульпа и периапикал", requiresTooth: true },
	K05: { titleRu: "Гингивит и болезни пародонта", group: "Пародонт", requiresTooth: false },
	K06: { titleRu: "Другие изменения десны и беззубого альвеолярного края", group: "Пародонт", requiresTooth: false },
	K07: { titleRu: "Челюстно-лицевые аномалии и аномалии прикуса", group: "Ортодонтия", requiresTooth: false },
	K08: { titleRu: "Другие изменения зубов и опорного аппарата (адентия)", group: "Хирургия и ортопедия", requiresTooth: false },
	K09: { titleRu: "Кисты области рта", group: "Хирургия", requiresTooth: false },
	K10: { titleRu: "Другие болезни челюстей (остеомиелит, альвеолит)", group: "Хирургия", requiresTooth: false },
	K11: { titleRu: "Болезни слюнных желез", group: "Хирургия", requiresTooth: false },
	K12: { titleRu: "Стоматит и родственные поражения", group: "Слизистая", requiresTooth: false },
	K13: { titleRu: "Другие болезни губ и слизистой оболочки рта", group: "Слизистая", requiresTooth: false },
	K14: { titleRu: "Болезни языка", group: "Слизистая", requiresTooth: false },
	Z00: { titleRu: "Общий осмотр и обследование", group: "Консультация", requiresTooth: false },
	Z01: { titleRu: "Стоматологическое обследование и санация", group: "Консультация", requiresTooth: false },
	Z13: { titleRu: "Стоматологический скрининг", group: "Консультация", requiresTooth: false },
	Z29: { titleRu: "Профилактические меры", group: "Консультация", requiresTooth: false },
	Z46: { titleRu: "Примерка и подгонка ортопедических/ортодонтических устройств", group: "Ортопедия", requiresTooth: false },
	Z51: { titleRu: "Плановое стоматологическое лечение", group: "Ортопедия", requiresTooth: false },
	Z96: { titleRu: "Наличие зубных имплантатов", group: "Хирургия и ортопедия", requiresTooth: false },
};

export const DENTAL_ICD10_FULL_CATALOG: readonly DentalIcd10Entry[] = [
	// ─── K00: Нарушения развития и прорезывания зубов ───
	{ code: "K00.0", label: "Адентия (полная или частичная гиподонтия)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.1", label: "Сверхкомплектные зубы", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.2", label: "Аномалии величины и формы зубов (микродонтия, макродонтия)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.3", label: "Крапчатые зубы (эндемический флюороз эмали)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.4", label: "Нарушения формирования зубов (гипоплазия эмали)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.5", label: "Наследственные нарушения структуры зуба (несовершенный амелогенез/дентиногенез)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.6", label: "Нарушения прорезывания зубов (задержка прорезывания, натальные зубы)", group: "Развитие и прикус", rubric: "K00" },
	{ code: "K00.8", label: "Другие нарушения развития зубов", group: "Развитие и прикус", rubric: "K00" },

	// ─── K01: Ретенированные и вкрапленные зубы ───
	{ code: "K01.0", label: "Вкрапленные зубы", group: "Хирургия", rubric: "K01", requiresTooth: true },
	{ code: "K01.1", label: "Ретенированные зубы (включая дистопированные зубы мудрости)", group: "Хирургия", rubric: "K01", requiresTooth: true },

	// ─── K02: Кариес зубов ───
	{ code: "K02.0", label: "Кариес эмали (стадия белого пятна / начальный кариес)", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.1", label: "Кариес дентина (средний и глубокий кариес)", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.2", label: "Кариес цемента (пришеечный / поддесневой кариес корня)", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.3", label: "Приостановившийся кариес зубов", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.4", label: "Одонтоклазия", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.5", label: "Кариес с обнажением пульпы", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.8", label: "Другой кариес зубов (вторичный / рецидивирующий кариес)", group: "Кариес", rubric: "K02", requiresTooth: true },
	{ code: "K02.9", label: "Кариес зубов неуточненный", group: "Кариес", rubric: "K02", requiresTooth: true },

	// ─── K03: Другие болезни твердых тканей зубов ───
	{ code: "K03.0", label: "Повышенное стирание зубов (патологическая стираемость)", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.1", label: "Сошлифовывание зубов (клиновидный дефект)", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.2", label: "Эрозия зубов (кислотная, профессиональная)", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.3", label: "Патологическая резорбция зубов (внутренняя/наружная резорбция корня)", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.4", label: "Гиперцементоз", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.5", label: "Анкилоз зубов", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.6", label: "Отложения на зубах (зубной камень, пигментированный налет)", group: "Другое", rubric: "K03" },
	{ code: "K03.7", label: "Изменение цвета твердых тканей зубов после прорезывания", group: "Другое", rubric: "K03" },
	{ code: "K03.8", label: "Другие уточненные болезни твердых тканей зубов (гиперестезия дентина)", group: "Другое", rubric: "K03", requiresTooth: true },
	{ code: "K03.9", label: "Болезнь твердых тканей зубов неуточненная", group: "Другое", rubric: "K03" },

	// ─── K04: Болезни пульпы и периапикальных тканей ───
	{ code: "K04.0", label: "Пульпит", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.00", label: "Начальный пульпит (гиперемия пульпы)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.01", label: "Острый пульпит (серозный, диффузный)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.02", label: "Гнойный пульпит / Хронический пульпит в стадии обострения", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.03", label: "Хронический пульпит (фиброзный, гангренозный)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.04", label: "Хронический язвенный пульпит", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.05", label: "Хронический гиперпластический пульпит (пульпарный полип)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.1", label: "Некроз пульпы (гангрена пульпы)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.2", label: "Дегенерация пульпы (дентиклы, кальцификаты)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.3", label: "Неправильное формирование твердых тканей в пульпе", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.4", label: "Острый апикальный периодонтит пульпарного происхождения", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.5", label: "Хронический апикальный периодонтит (апикальная гранулема)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.6", label: "Периапикальный абсцесс со свищом", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.7", label: "Периапикальный абсцесс без свища", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.8", label: "Корневая киста (радикулярная киста)", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },
	{ code: "K04.9", label: "Другие и неуточненные болезни пульпы и периапикальных тканей", group: "Пульпа и периапикал", rubric: "K04", requiresTooth: true },

	// ─── K05: Гингивит и болезни пародонта ───
	{ code: "K05.0", label: "Острый гингивит (катаральный, язвенный)", group: "Пародонт", rubric: "K05" },
	{ code: "K05.1", label: "Хронический гингивит (катаральный, гипертрофический)", group: "Пародонт", rubric: "K05" },
	{ code: "K05.2", label: "Острый пародонтит (пародонтальный абсцесс)", group: "Пародонт", rubric: "K05" },
	{ code: "K05.21", label: "Острый периодонтит / острый локализованный пародонтит", group: "Пародонт", rubric: "K05" },
	{ code: "K05.3", label: "Хронический пародонтит", group: "Пародонт", rubric: "K05" },
	{ code: "K05.31", label: "Хронический пародонтит локализованный", group: "Пародонт", rubric: "K05" },
	{ code: "K05.32", label: "Хронический пародонтит генерализованный", group: "Пародонт", rubric: "K05" },
	{ code: "K05.4", label: "Пародонтоз", group: "Пародонт", rubric: "K05" },
	{ code: "K05.5", label: "Другие болезни пародонта", group: "Пародонт", rubric: "K05" },
	{ code: "K05.6", label: "Болезнь пародонта неуточненная", group: "Пародонт", rubric: "K05" },

	// ─── K06: Другие изменения десны и беззубого альвеолярного края ───
	{ code: "K06.0", label: "Рецессия десны (локализованная или генерализованная)", group: "Пародонт", rubric: "K06" },
	{ code: "K06.1", label: "Гипертрофия десны (фиброматоз десен)", group: "Пародонт", rubric: "K06" },
	{ code: "K06.2", label: "Поражения десны и альвеолярного края травматического происхождения", group: "Пародонт", rubric: "K06" },
	{ code: "K06.8", label: "Другие уточненные изменения десны и беззубого альвеолярного края", group: "Пародонт", rubric: "K06" },

	// ─── K07: Челюстно-лицевые аномалии (включая аномалии прикуса) ───
	{ code: "K07.0", label: "Основные аномалии размеров челюстей (макрогнатия, микрогнатия)", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.1", label: "Аномалии челюстно-черепных соотношений (асимметрия челюстей)", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.2", label: "Аномалии соотношений зубных дуг (дистальный, мезиальный, глубокий, открытый прикус)", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.3", label: "Аномалии положения зубов (скученность, диастема, тремы, транспозиция)", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.4", label: "Аномалия прикуса неуточненная", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.5", label: "Челюстно-лицевые функциональные отклонения (нарушение глотания, дыхания)", group: "Ортодонтия", rubric: "K07" },
	{ code: "K07.6", label: "Болезни височно-нижнечелюстного сустава (синдром дисфункции ВНЧС, щелканье)", group: "Ортодонтия", rubric: "K07" },

	// ─── K08: Другие изменения зубов и опорного аппарата (адентия, атрофия) ───
	{ code: "K08.0", label: "Эксфолиация зубов вследствие системных нарушений", group: "Хирургия и ортопедия", rubric: "K08" },
	{ code: "K08.1", label: "Потеря зубов вследствие несчастного случая, удаления или болезни пародонта (частичная/полная адентия)", group: "Хирургия и ортопедия", rubric: "K08" },
	{ code: "K08.2", label: "Атрофия беззубого альвеолярного края (убыль костной ткани челюсти)", group: "Хирургия и ортопедия", rubric: "K08" },
	{ code: "K08.3", label: "Укоренившийся зубной корень (оставшийся корень после перелома или кариеса)", group: "Хирургия и ортопедия", rubric: "K08", requiresTooth: true },
	{ code: "K08.8", label: "Другие уточненные изменения зубов и их опорного аппарата", group: "Хирургия и ортопедия", rubric: "K08" },

	// ─── K09: Кисты области рта ───
	{ code: "K09.0", label: "Одонтогенные кисты челюстей (фолликулярная киста, кератокиста)", group: "Хирургия", rubric: "K09" },
	{ code: "K09.1", label: "Неодонтогенные кисты (назопалатинальная киста)", group: "Хирургия", rubric: "K09" },
	{ code: "K09.2", label: "Другие кисты челюстей", group: "Хирургия", rubric: "K09" },

	// ─── K10: Другие болезни челюстей ───
	{ code: "K10.0", label: "Нарушения развития челюстей (торусы, экзостозы челюстей)", group: "Хирургия", rubric: "K10" },
	{ code: "K10.1", label: "Гигантоклеточная гранулема центральная/периферическая", group: "Хирургия", rubric: "K10" },
	{ code: "K10.2", label: "Воспалительные заболевания челюстей (остеомиелит, периостит челюсти)", group: "Хирургия", rubric: "K10" },
	{ code: "K10.3", label: "Альвеолит челюстей (сухая лунка, воспаление лунки после удаления зуба)", group: "Хирургия", rubric: "K10", requiresTooth: true },
	{ code: "K10.8", label: "Другие уточненные болезни челюстей", group: "Хирургия", rubric: "K10" },

	// ─── K11: Болезни слюнных желез ───
	{ code: "K11.0", label: "Атрофия слюнной железы", group: "Хирургия", rubric: "K11" },
	{ code: "K11.1", label: "Гипертрофия слюнной железы", group: "Хирургия", rubric: "K11" },
	{ code: "K11.2", label: "Сиаладенит (воспаление слюнной железы)", group: "Хирургия", rubric: "K11" },
	{ code: "K11.3", label: "Абсцесс слюнной железы", group: "Хирургия", rubric: "K11" },
	{ code: "K11.5", label: "Сиалолитиаз (слюннокаменная болезнь, камень протока)", group: "Хирургия", rubric: "K11" },
	{ code: "K11.6", label: "Мукоцеле слюнной железы (ретенционная киста слизистой)", group: "Хирургия", rubric: "K11" },
	{ code: "K11.7", label: "Нарушения секреции слюнных желез (ксеростомия, гипосаливация)", group: "Хирургия", rubric: "K11" },

	// ─── K12: Стоматит и родственные поражения ───
	{ code: "K12.0", label: "Рецидивирующие афты полости рта (хронический афтозный стоматит)", group: "Слизистая", rubric: "K12" },
	{ code: "K12.1", label: "Другие формы стоматита (катаральный стоматит, травматическая эрозия)", group: "Слизистая", rubric: "K12" },
	{ code: "K12.2", label: "Флегмона и абсцесс полости рта (одонтогенная флегмона дна рта)", group: "Слизистая", rubric: "K12" },
	{ code: "K12.3", label: "Мукозит полости рта (язвенный мукозит)", group: "Слизистая", rubric: "K12" },

	// ─── K13: Другие болезни губ и слизистой оболочки полости рта ───
	{ code: "K13.0", label: "Болезни губ (хейлит метеорологический, актинический, гландулярный)", group: "Слизистая", rubric: "K13" },
	{ code: "K13.1", label: "Прикусывание щеки и губ (хроническая травма слизистой)", group: "Слизистая", rubric: "K13" },
	{ code: "K13.2", label: "Лейкоплакия полости рта (гиперкератоз эпителия)", group: "Слизистая", rubric: "K13" },
	{ code: "K13.4", label: "Гранулема и гранулематозоподобные поражения слизистой", group: "Слизистая", rubric: "K13" },
	{ code: "K13.7", label: "Другие и неуточненные поражения слизистой оболочки рта", group: "Слизистая", rubric: "K13" },

	// ─── K14: Болезни языка ───
	{ code: "K14.0", label: "Глоссит (катаральный, язвенный глоссит)", group: "Слизистая", rubric: "K14" },
	{ code: "K14.1", label: "Географический язык (десквамативный глоссит)", group: "Слизистая", rubric: "K14" },
	{ code: "K14.2", label: "Срединный ромбовидный глоссит", group: "Слизистая", rubric: "K14" },
	{ code: "K14.3", label: "Гипертрофия сосочков языка (черный волосатый язык)", group: "Слизистая", rubric: "K14" },
	{ code: "K14.4", label: "Атрофия сосочков языка (атрофический глоссит)", group: "Слизистая", rubric: "K14" },
	{ code: "K14.6", label: "Глоссодиния (глоссалгия, жжение языка)", group: "Слизистая", rubric: "K14" },
	{ code: "K14.8", label: "Другие болезни языка", group: "Слизистая", rubric: "K14" },

	// ─── Z: Профилактические осмотры, санация и ортопедия ───
	{ code: "Z00.0", label: "Общий медицинский осмотр (профилактический осмотр)", group: "Консультация", rubric: "Z00" },
	{ code: "Z01.2", label: "Стоматологическое обследование (профосмотр, профгигиена, санация полости рта)", group: "Консультация", rubric: "Z01" },
	{ code: "Z13.84", label: "Специальное скрининговое обследование для выявления стоматологических нарушений", group: "Консультация", rubric: "Z13" },
	{ code: "Z29.8", label: "Профилактика кариеса (герметизация фиссур, ремотерапия)", group: "Консультация", rubric: "Z29" },
	{ code: "Z46.3", label: "Примерка и подгонка зубного протезного устройства (коронки, мосты, съемные протезы)", group: "Ортопедия", rubric: "Z46" },
	{ code: "Z46.4", label: "Примерка и подгонка ортодонтического устройства (брекеты, элайнеры, пластинки)", group: "Ортодонтия", rubric: "Z46" },
	{ code: "Z51.8", label: "Ортопедическое и комплексное плановое стоматологическое лечение", group: "Ортопедия", rubric: "Z51" },
	{ code: "Z96.5", label: "Наличие зубных и нижнечелюстных имплантатов", group: "Хирургия и ортопедия", rubric: "Z96" },
];

/**
 * Нормализует код МКБ-10 (латинская K, правильный регистр, точка).
 */
export function normalizeDentalIcd10Code(rawCode: string): string {
	if (!rawCode) return "";
	let code = rawCode.trim().replace(/^[Кк]/u, "K").toUpperCase();
	// Вставляем точку при необходимости (K0402 -> K04.02)
	if (/^[KZ]\d{3,4}$/i.test(code)) {
		code = `${code.slice(0, 3)}.${code.slice(3)}`;
	}
	return code;
}

/**
 * Проверяет, является ли код валидным стоматологическим кодом МКБ-10 (K00..K14, Z).
 */
export function isDentalIcd10Code(rawCode: string): boolean {
	const normalized = normalizeDentalIcd10Code(rawCode);
	if (!normalized) return false;
	return DENTAL_ICD10_FULL_CATALOG.some(
		(entry) => entry.code.toUpperCase() === normalized.toUpperCase(),
	) || /^[K](?:0[0-9]|1[0-4])(?:\.\d{1,4})?$/i.test(normalized) || /^Z(?:01\.2|00\.0|13\.84|29\.8|46\.[34]|51\.8|96\.5)$/i.test(normalized);
}

/**
 * Поиск диагноза по коду или ключевым словам.
 */
export function findDentalIcd10(query: string): DentalIcd10Entry | undefined {
	if (!query) return undefined;
	const norm = normalizeDentalIcd10Code(query);
	const exact = DENTAL_ICD10_FULL_CATALOG.find((entry) => entry.code.toUpperCase() === norm);
	if (exact) return exact;

	const q = query.toLowerCase().trim();
	return DENTAL_ICD10_FULL_CATALOG.find(
		(entry) =>
			entry.code.toLowerCase().includes(q) ||
			entry.label.toLowerCase().includes(q),
	);
}

/**
 * Полнотекстовая фильтрация диагнозов по запросу (по коду, названию, рубрике).
 */
export function searchDentalIcd10Catalog(query: string): readonly DentalIcd10Entry[] {
	if (!query || !query.trim()) return DENTAL_ICD10_FULL_CATALOG;
	const q = query.toLowerCase().trim().replace(/ё/g, "е");
	const tokens = q.split(/\s+/).filter(Boolean);

	return DENTAL_ICD10_FULL_CATALOG.filter((entry) => {
		const codeNorm = entry.code.toLowerCase();
		const labelNorm = entry.label.toLowerCase().replace(/ё/g, "е");
		const groupNorm = entry.group.toLowerCase().replace(/ё/g, "е");
		return tokens.every(
			(token) =>
				codeNorm.includes(token) ||
				labelNorm.includes(token) ||
				groupNorm.includes(token),
		);
	});
}
