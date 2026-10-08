import type { DocumentTemplateVariableSpec } from "./types.js";

const ALL_FDI_TEETH_NUMBERS: readonly number[] = [
	18, 17, 16, 15, 14, 13, 12, 11,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
];

const TEETH_DOCUMENT_TEMPLATE_VARIABLES: DocumentTemplateVariableSpec[] =
	ALL_FDI_TEETH_NUMBERS.flatMap((tooth) => [
		{
			token: String(tooth),
			domain: "dentalFormula",
			name: `Обозначение зуба ${tooth}`,
			description: `Символический код клинического статуса зуба ${tooth} (H, C, P, Pt, П, К, И, 0, R, N)`,
			exampleValue: "C",
			resolverPath: `dentalFormula.teeth.${tooth}.code`,
		},
		{
			token: `${tooth}т`,
			domain: "dentalFormula",
			name: `Статус зуба ${tooth} текстом`,
			description: `Клинический статус зуба ${tooth} на русском языке`,
			exampleValue: "Кариес",
			resolverPath: `dentalFormula.teeth.${tooth}.label`,
		},
	]);

/**
 * Токены клинического осмотра, дневника, истории болезни и зубной формулы.
 * Layer 1: Domain Variable Token Group.
 */
export const CLINICAL_DOCUMENT_TEMPLATE_VARIABLES: readonly DocumentTemplateVariableSpec[] = [
	// ─── КЛИНИЧЕСКИЙ ОСМОТР, ДНЕВНИК И ИСТОРИЯ БОЛЕЗНИ ───
	{
		token: "ДатаОсмотра",
		domain: "clinicalExamination",
		name: "Дата первичного осмотра",
		description: "Дата первичного осмотра в формате ДД.ММ.ГГГГ",
		exampleValue: "03.09.2026",
		resolverPath: "clinicalExamination.examinationDate",
	},
	{
		token: "ДатаЛечения",
		domain: "clinicalExamination",
		name: "Дата лечения",
		description: "Дата проведения лечебного вмешательства",
		exampleValue: "03.09.2026",
		resolverPath: "clinicalExamination.examinationDate",
	},
	{
		token: "ДатаИВремяЛечения",
		domain: "clinicalExamination",
		name: "Дата и время лечения",
		description: "Дата и фактическое время начала приема",
		exampleValue: "03.09.2026 14:30",
		resolverPath: "clinicalExamination.treatmentDateTime",
	},
	{
		token: "ФамилияИОВрача",
		domain: "clinicalExamination",
		name: "Фамилия и инициалы лечащего врача",
		description: "Фамилия и инициалы врача, проводившего осмотр или лечение",
		exampleValue: "Иванов И. И.",
		resolverPath: "clinicalExamination.doctorInitials",
	},
	{
		token: "Диагноз",
		domain: "clinicalExamination",
		name: "Клинический диагноз",
		description: "Основной и сопутствующий клинический диагноз по МКБ-10",
		exampleValue: "K02.1 Кариес дентина",
		resolverPath: "clinicalExamination.diagnosis",
	},
	{
		token: "Жалобы",
		domain: "clinicalExamination",
		name: "Жалобы пациента",
		description: "Субъективные жалобы пациента при обращении",
		exampleValue: "Жалобы на кратковременные боли от сладкого и холодного в зубе 16",
		resolverPath: "clinicalExamination.complaints",
	},
	{
		token: "Анамнез",
		domain: "clinicalExamination",
		name: "Анамнез заболевания",
		description: "Анамнез настоящего заболевания (Anamnesis morbi)",
		exampleValue: "Боли появились около недели назад, ранее зуб не лечен",
		resolverPath: "clinicalExamination.anamnesis",
	},
	{
		token: "ПеренесенныеЗаболевания",
		domain: "clinicalExamination",
		name: "Перенесенные заболевания",
		description: "Перенесенные и сопутствующие соматические заболевания",
		exampleValue: "ОРВИ, детские инфекции; гепатит, туберкулез, ВИЧ отрицает",
		resolverPath: "clinicalExamination.pastDiseases",
	},
	{
		token: "РазвитиеЗаболевания",
		domain: "clinicalExamination",
		name: "Развитие настоящего заболевания",
		description: "Динамика и особенности развития патологического процесса",
		exampleValue: "Процесс прогрессировал постепенно без предшествующего вмешательства",
		resolverPath: "clinicalExamination.diseaseHistory",
	},
	{
		token: "ВнешнийОсмотр",
		domain: "clinicalExamination",
		name: "Внешний осмотр",
		description: "Данные объективного исследования, внешний осмотр ЧЛО",
		exampleValue: "Конфигурация лица не изменена, регионарные лимфоузлы не увеличены, пальпация безболезненна",
		resolverPath: "clinicalExamination.externalExam",
	},
	{
		token: "Прикус",
		domain: "clinicalExamination",
		name: "Прикус",
		description: "Вид прикуса и окклюзионные взаимоотношения",
		exampleValue: "Ортогнатический прикус",
		resolverPath: "clinicalExamination.bite",
	},
	{
		token: "СостояниеСлизистой",
		domain: "clinicalExamination",
		name: "Состояние слизистой оболочки",
		description: "Состояние слизистой оболочки полости рта, десен и неба",
		exampleValue: "Слизистая бледно-розовая, умеренно увлажнена, патологических элементов нет",
		resolverPath: "clinicalExamination.mucousCondition",
	},
	{
		token: "Рентген",
		domain: "clinicalExamination",
		name: "Данные рентгенографии",
		description: "Данные рентгеновских, визиографических и лабораторных исследований",
		exampleValue: "На прицельной рентгенограмме зуба 16: очагов деструкции костной ткани нет",
		resolverPath: "clinicalExamination.xray",
	},
	{
		token: "Объективно",
		domain: "clinicalExamination",
		name: "Объективный статус (Status localis)",
		description: "Данные объективного стоматологического осмотра полости рта",
		exampleValue: "На окклюзионной поверхности зуба 16 глубокая кариозная полость",
		resolverPath: "clinicalExamination.objective",
	},
	{
		token: "Лечение",
		domain: "clinicalExamination",
		name: "Проведенное лечение",
		description: "Подробный протокол проведенного лечения",
		exampleValue: "Препарирование, медикаментозная обработка, пломбирование композитом светового отверждения",
		resolverPath: "clinicalExamination.treatment",
	},
	{
		token: "Рекомендации",
		domain: "clinicalExamination",
		name: "Клинические рекомендации",
		description: "Назначения и рекомендации пациенту после приема",
		exampleValue: "Воздержаться от приема пищи в течение 2 часов, контрольный осмотр через 6 месяцев",
		resolverPath: "clinicalExamination.recommendations",
	},


	// ─── ЗУБНАЯ ФОРМУЛА И ОДОНТОГРАММА ───
	{
		token: "ЗубнаяФормула.Расшифровка",
		domain: "dentalFormula",
		name: "Расшифровка зубной формулы словами",
		description: "Текстовая расшифровка выявленных патологий зубов на русском языке",
		exampleValue: "Кариес: зубы 16, 24; Пломба: зубы 36, 46; Отсутствует: зубы 18, 28, 38, 48; Интактные: остальные зубы",
		resolverPath: "dentalFormula.breakdownText",
	},
	{
		token: "ЗубнаяФормула.Текст",
		domain: "dentalFormula",
		name: "Текстовая расшифровка зубной формулы (алиас)",
		description: "Текстовая расшифровка зубной формулы на русском языке",
		exampleValue: "Кариес: зубы 16, 24; Пломба: зубы 36, 46; Интактные: остальные зубы",
		resolverPath: "dentalFormula.breakdownText",
	},
	{
		token: "ПервичныйОсмотр.ЗубнаяФормула",
		domain: "dentalFormula",
		name: "Зубная формула первичного осмотра (HTML/SVG)",
		description: "Векторная анатомическая схема зубной формулы",
		exampleValue: "<div class=\"dental-formula-svg\">...</div>",
		resolverPath: "dentalFormula.graphicalHtml",
	},
	{
		token: "ЗубнаяФормула",
		domain: "dentalFormula",
		name: "Графическая зубная формула (HTML/SVG)",
		description: "Векторная анатомическая зубная формула",
		exampleValue: "<div class=\"dental-formula-svg\">...</div>",
		resolverPath: "dentalFormula.graphicalHtml",
	},

	...TEETH_DOCUMENT_TEMPLATE_VARIABLES,
] as const;

export { ALL_FDI_TEETH_NUMBERS, TEETH_DOCUMENT_TEMPLATE_VARIABLES };
