/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO EMR FORM 043/U STATUTORY AUDIT RULES & QUALITY PRESETS
 * Criteria for Quality Assessment of Medical Care (Order of Minzdrav RF № 203n,
 * Federal Law № 323-FZ, Order № 834n, Roszdravnadzor & MHIF / TFOMS standards)
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type CmoDefectSeverity = "critical" | "major" | "minor";

export type CmoDefectCategory =
	| "DIAGNOSIS_JUSTIFICATION"
	| "INFORMED_CONSENT_323FZ"
	| "CLINICAL_DIARY_SOAP"
	| "ANESTHESIA_SAFETY"
	| "ACT_SERVICES_COHERENCE"
	| "UKEP_DIGITAL_SIGNATURE"
	| "DISPENSARY_AND_EPICRISIS"
	| "XRAY_RADIATION_SAFETY";

export interface CmoDefectPreset {
	id: string;
	code: string;
	category: CmoDefectCategory;
	categoryLabel: string;
	title: string;
	description: string;
	statutoryReference: string;
	severity: CmoDefectSeverity;
	penaltyScore: number;
	recommendedAction: string;
	targetSection: "passport" | "anamnesis" | "dental_status" | "diaries" | "epicrisis" | "ids" | "anesthesia" | "act_reconciliation";
}

export const CMO_AUDIT_CATEGORIES: Record<CmoDefectCategory, { label: string; description: string }> = {
	DIAGNOSIS_JUSTIFICATION: {
		label: "Обоснование и кодирование диагноза",
		description: "Правильность применения МКБ-10, полнота клинического обоснования диагноза по данным осмотра и инструментальных методов.",
	},
	INFORMED_CONSENT_323FZ: {
		label: "Информированное добровольное согласие (ИДС 323-ФЗ)",
		description: "Наличие подписанного пациентом ИДС на медицинское вмешательство по ст. 20 Федерального закона № 323-ФЗ.",
	},
	CLINICAL_DIARY_SOAP: {
		label: "Полнота клинического дневника (SOAP)",
		description: "Детализация жалоб, анамнеза, status localis, пошагового протокола манипуляций и примененных материалов.",
	},
	ANESTHESIA_SAFETY: {
		label: "Анестезиологический протокол и безопасность",
		description: "Фиксация аллергоанамнеза, торгового наименования анестетика, концентрации, дозировки в мл/карпулах и метода обезболивания.",
	},
	ACT_SERVICES_COHERENCE: {
		label: "Согласованность диагноза, плана и акта",
		description: "Соответствие оказанных услуг номенклатуре (Приказ № 804н), клиническому диагнозу, зубной формуле и акту выполненных работ.",
	},
	UKEP_DIGITAL_SIGNATURE: {
		label: "Электронная подпись врача (УКЭП 63-ФЗ)",
		description: "Наличие действительной усиленной квалифицированной электронной подписи врача и клиники в соответствии с Приказом № 947н.",
	},
	DISPENSARY_AND_EPICRISIS: {
		label: "Эпикриз и диспансерное наблюдение",
		description: "Определение исхода лечения, группы диспансерного наблюдения (Д-I/Д-II/Д-III) и графика контрольных осмотров.",
	},
	XRAY_RADIATION_SAFETY: {
		label: "Рентгенодиагностика и радиационная безопасность",
		description: "Описание рентгенологических снимков (ОПТГ/КЛКТ/прицельные) и учет индивидуальных доз облучения пациента (СанПиН 2.6.1.1192-03).",
	},
};

export const CMO_STATUTORY_DEFECT_PRESETS: CmoDefectPreset[] = [
	// ── DIAGNOSIS_JUSTIFICATION ──
	{
		id: "DEF-ICD-01",
		code: "КЭР-01.1",
		category: "DIAGNOSIS_JUSTIFICATION",
		categoryLabel: "Обоснование диагноза",
		title: "Отсутствует или некорректен код МКБ-10",
		description: "В титульной части карты или дневниковой записи не указан шифр по МКБ-10 (класс XI K00-K14) либо указан некорректный код.",
		statutoryReference: "Приказ Минздрава России № 834н, Приказ № 203н п. 2.1",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Указать точный нозологический код МКБ-10 (например, K02.1 для среднего кариеса дентина).",
		targetSection: "passport",
	},
	{
		id: "DEF-ICD-02",
		code: "КЭР-01.2",
		category: "DIAGNOSIS_JUSTIFICATION",
		categoryLabel: "Обоснование диагноза",
		title: "Неполное клиническое обоснование диагноза",
		description: "Описание status localis не содержит ключевых диагностических критериев (глубина полости, зондирование, перкуссия, реакция на термопробу).",
		statutoryReference: "Приказ Минздрава России № 203н п. 2.2, Клинические рекомендации СтАР",
		severity: "major",
		penaltyScore: 15,
		recommendedAction: "Дополнить объективный статус данными термодиагностики, зондирования и вертикальной/горизонтальной перкуссии.",
		targetSection: "diaries",
	},
	{
		id: "DEF-ICD-03",
		code: "КЭР-01.3",
		category: "DIAGNOSIS_JUSTIFICATION",
		categoryLabel: "Обоснование диагноза",
		title: "Расхождение диагноза и данных одонтопародонтограммы",
		description: "Диагноз в дневнике приема противоречит статусу зуба в зубной формуле (например, диагноз пульпита на зубе со статусом 'удален').",
		statutoryReference: "Приказ Минздрава России № 834н приложение № 11",
		severity: "critical",
		penaltyScore: 25,
		recommendedAction: "Синхронизировать статус одонтограммы с клинической записью посещения.",
		targetSection: "dental_status",
	},

	// ── INFORMED_CONSENT_323FZ ──
	{
		id: "DEF-IDS-01",
		code: "КЭР-02.1",
		category: "INFORMED_CONSENT_323FZ",
		categoryLabel: "ИДС 323-ФЗ",
		title: "Отсутствует прикрепленное ИДС на медицинское вмешательство",
		description: "К медицинской карте не прикреплен скан или электронный документ ИДС, подписанный пациентом (или законным представителем).",
		statutoryReference: "Федеральный закон № 323-ФЗ ст. 20, ст. 79; Приказ Минздрава № 1051н",
		severity: "critical",
		penaltyScore: 25,
		recommendedAction: "Прикрепить подписанный бланк ИДС перед утверждением карты.",
		targetSection: "ids",
	},
	{
		id: "DEF-IDS-02",
		code: "КЭР-02.2",
		category: "INFORMED_CONSENT_323FZ",
		categoryLabel: "ИДС 323-ФЗ",
		title: "ИДС не содержит согласия на конкретный вид инвазивного вмешательства",
		description: "В бланке согласия не отмечены риски и специфика манипуляций (эндодонтия, удаление зуба, имплантация, ортопедия).",
		statutoryReference: "Федеральный закон № 323-ФЗ ст. 20 ч. 1",
		severity: "major",
		penaltyScore: 15,
		recommendedAction: "Оформить специализированное ИДС по профилю проведенного вмешательства.",
		targetSection: "ids",
	},

	// ── CLINICAL_DIARY_SOAP ──
	{
		id: "DEF-SOAP-01",
		code: "КЭР-03.1",
		category: "CLINICAL_DIARY_SOAP",
		categoryLabel: "Дневник SOAP",
		title: "Отсутствуют жалобы пациента (Subjective) при первичном приеме",
		description: "Графа жалоб пуста либо содержит неинформативную отметку 'жалоб нет' при наличии острого воспалительного процесса.",
		statutoryReference: "Приказ Минздрава России № 834н п. 8",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Указать конкретные жалобы пациента (характер боли, триггеры, локализация, длительность).",
		targetSection: "diaries",
	},
	{
		id: "DEF-SOAP-02",
		code: "КЭР-03.2",
		category: "CLINICAL_DIARY_SOAP",
		categoryLabel: "Дневник SOAP",
		title: "Неполный протокол лечебных манипуляций (Procedure)",
		description: "В протоколе отсутствуют обязательные этапы: обработка кариозной полости, адгезивный протокол, вид изолирующей прокладки/пломбировочного материала.",
		statutoryReference: "Клинические рекомендации Стоматологической Ассоциации России (СтАР)",
		severity: "major",
		penaltyScore: 10,
		recommendedAction: "Подробно расписать этапы препарирования, медикаментозной обработки, адгезии и полировки реставрации.",
		targetSection: "diaries",
	},
	{
		id: "DEF-SOAP-03",
		code: "КЭР-03.3",
		category: "CLINICAL_DIARY_SOAP",
		categoryLabel: "Дневник SOAP",
		title: "Не указаны рекомендации пациенту и дата следующего визита",
		description: "Отсутствуют рекомендации по гигиене полости рта, приему анальгетиков, щадящей диете или дата контрольного осмотра.",
		statutoryReference: "Приказ Минздрава России № 203н п. 2.4",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Добавить памятку по уходу и назначить дату следующего визита.",
		targetSection: "diaries",
	},

	// ── ANESTHESIA_SAFETY ──
	{
		id: "DEF-ANES-01",
		code: "КЭР-04.1",
		category: "ANESTHESIA_SAFETY",
		categoryLabel: "Анестезиология",
		title: "Отсутствует запись об анестезии при инвазивной манипуляции",
		description: "При проведении препарирования дентина, депульпирования или удаления не зафиксирован факт проведения местной анестезии либо отказ пациента.",
		statutoryReference: "Приказ Минздрава России № 203н п. 2.3; Федеральный закон № 323-ФЗ ст. 19 ч. 5 п. 5",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Внести протокол анестезии (препарат, дозировка, способ введения) или зафиксировать лечение без анестезии по просьбе пациента.",
		targetSection: "anesthesia",
	},
	{
		id: "DEF-ANES-02",
		code: "КЭР-04.2",
		category: "ANESTHESIA_SAFETY",
		categoryLabel: "Анестезиология",
		title: "Не указана дозировка, концентрация или серия анестетика",
		description: "В протоколе указано только общее название (например, 'Ультракаин') без указания концентрации (4%), объема (мл) и наличия вазоконстриктора (1:100000 / 1:200000).",
		statutoryReference: "Приказ Минздрава России № 834н, стандарты фармакобезопасности",
		severity: "major",
		penaltyScore: 10,
		recommendedAction: "Указать полную формулу: 'Sol. Articaini 4% cum Epinephrino 1:100000 - 1.7 ml инфильтрационно'.",
		targetSection: "anesthesia",
	},

	// ── ACT_SERVICES_COHERENCE ──
	{
		id: "DEF-ACT-01",
		code: "КЭР-05.1",
		category: "ACT_SERVICES_COHERENCE",
		categoryLabel: "Согласованность услуг",
		title: "Расхождение позиций акта выполненных работ и записей дневника",
		description: "В акте присутствуют платные медицинские услуги, не описанные в дневниковой записи посещения, либо наоборот.",
		statutoryReference: "Закон РФ 'О защите прав потребителей' ст. 10; Постановление Правительства РФ № 736",
		severity: "critical",
		penaltyScore: 25,
		recommendedAction: "Сверить и синхронизировать позиции акта оказанных услуг и клинический протокол.",
		targetSection: "act_reconciliation",
	},
	{
		id: "DEF-ACT-02",
		code: "КЭР-05.2",
		category: "ACT_SERVICES_COHERENCE",
		categoryLabel: "Согласованность услуг",
		title: "Несоответствие кода медицинской услуги номенклатуре Минздрава (Приказ 804н)",
		description: "Наименование услуги в плане/акте не соответствует официальной Номенклатуре медицинских услуг.",
		statutoryReference: "Приказ Минздрава России от 13.10.2017 № 804н",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Использовать стандартные коды Номенклатуры (например, A16.07.002 Восстановление зуба пломбой).",
		targetSection: "act_reconciliation",
	},

	// ── UKEP_DIGITAL_SIGNATURE ──
	{
		id: "DEF-UKEP-01",
		code: "КЭР-06.1",
		category: "UKEP_DIGITAL_SIGNATURE",
		categoryLabel: "Электронная подпись",
		title: "Отсутствует усиленная квалифицированная электронная подпись (УКЭП) лечащего врача",
		description: "Электронный медицинский документ не подписан сертификатом УКЭП врача в соответствии с требованиями ЕГИСЗ.",
		statutoryReference: "Федеральный закон № 63-ФЗ 'Об электронной подписи', Приказ Минздрава России № 947н",
		severity: "critical",
		penaltyScore: 20,
		recommendedAction: "Подписать дневниковую запись персональным сертификатом УКЭП врача.",
		targetSection: "diaries",
	},

	// ── DISPENSARY_AND_EPICRISIS ──
	{
		id: "DEF-DISP-01",
		code: "КЭР-07.1",
		category: "DISPENSARY_AND_EPICRISIS",
		categoryLabel: "Эпикриз и диспансеризация",
		title: "Не заполнена группа диспансерного наблюдения (Д-I, Д-II, Д-III)",
		description: "В завершающей части карты при окончании курса санации не определена диспансерная группа и периодичность профосмотров.",
		statutoryReference: "Приказ Минздрава России № 834н, Приказ № 168н",
		severity: "major",
		penaltyScore: 10,
		recommendedAction: "Определить диспансерную группу (Д-I здоровые, Д-II факторы риска, Д-III хроническая патология).",
		targetSection: "epicrisis",
	},
	{
		id: "DEF-DISP-02",
		code: "КЭР-07.2",
		category: "DISPENSARY_AND_EPICRISIS",
		categoryLabel: "Эпикриз и диспансеризация",
		title: "Отсутствует этапный/заключительный эпикриз при завершении лечения",
		description: "Курс лечения завершен, но сводный эпикриз с оценкой исхода терапии (выздоровление / ремиссия) не оформлен.",
		statutoryReference: "Приказ Минздрава России № 203н п. 2.5",
		severity: "major",
		penaltyScore: 15,
		recommendedAction: "Сформировать краткий эпикриз с оценкой эффективности проведенной санации.",
		targetSection: "epicrisis",
	},

	// ── XRAY_RADIATION_SAFETY ──
	{
		id: "DEF-XRAY-01",
		code: "КЭР-08.1",
		category: "XRAY_RADIATION_SAFETY",
		categoryLabel: "Рентгенобезопасность",
		title: "Отсутствует протокол описания рентгенологического исследования",
		description: "В карте имеется отметка о выполнении снимка (КЛКТ, ОПТГ или визиография), но текстовое диагностическое описание отсутствует.",
		statutoryReference: "Приказ Минздрава России № 560н 'Об утверждении Правил проведения рентгенологических исследований'",
		severity: "major",
		penaltyScore: 15,
		recommendedAction: "Внести рентгенологическое заключение с описанием анатомических ориентиров и периапикальных изменений.",
		targetSection: "dental_status",
	},
	{
		id: "DEF-XRAY-02",
		code: "КЭР-08.2",
		category: "XRAY_RADIATION_SAFETY",
		categoryLabel: "Рентгенобезопасность",
		title: "Не зафиксирована индивидуальная доза лучевой нагрузки (мЗв)",
		description: "При проведении рентгенодиагностики не внесены данные о полученной пациентом эффективной эквивалентной дозе.",
		statutoryReference: "СанПиН 2.6.1.1192-03, СанПиН 2.6.1.2523-09 (НРБ-99/2009)",
		severity: "minor",
		penaltyScore: 5,
		recommendedAction: "Зафиксировать дозу лучевой нагрузки в листе учета дозовых нагрузок (например, 0.004 мЗв).",
		targetSection: "dental_status",
	},
];
