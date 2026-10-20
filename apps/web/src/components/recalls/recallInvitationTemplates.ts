import type { RecallCycleType } from "./recallCycleTypes";

export interface RecallScriptObjection {
	readonly id: string;
	readonly title: string;
	readonly patientPhrase?: string;
	readonly clinicalRationale: string;
	readonly suggestedResponse: string;
	readonly psychologicalTip: string;
}

export interface RecallInvitationTemplate {
	readonly cycleType: RecallCycleType;
	readonly title: string;
	readonly greeting: string;
	readonly clinicalContext: string;
	readonly callToAction: string;
	readonly objections: readonly RecallScriptObjection[];
}

export type RecallCallingScript = RecallInvitationTemplate;

const STANDARD_OBJECTIONS: readonly RecallScriptObjection[] = [
	{
		id: "no_pain", title: "Ничего не болит",
		clinicalRationale: "Скрытый апроксимальный кариес и заболевания пародонта начинаются бессимптомно.",
		suggestedResponse: "Главная цель профилактики — не допустить боли и осложнений.",
		psychologicalTip: "Спокойный уверенный тон",
	},
	{
		id: "expensive", title: "Дорого",
		clinicalRationale: "Стоимость профгигиены несопоставимо ниже лечения осложненного кариеса.",
		suggestedResponse: "Плановый осмотр позволяет избежать дорогостоящего эндодонтического лечения.",
		psychologicalTip: "Фокус на ценности здоровья",
	},
	{
		id: "no_time", title: "Нет времени",
		clinicalRationale: "Профгигиена занимает 40-50 минут.",
		suggestedResponse: "Мы подберем удобное утреннее или вечернее окно ровно на 45 минут.",
		psychologicalTip: "Предложить конкретное окно",
	},
	{
		id: "other_clinic", title: "Лечусь в другой клинике",
		clinicalRationale: "Важно непрерывное наблюдение лечащим врачом.",
		suggestedResponse: "Ваш доктор уже знает клиническую историю и динамику эмали.",
		psychologicalTip: "Уважение выбора пациента",
	},
];

export const INVITATION_TEMPLATES: Readonly<Record<RecallCycleType, RecallInvitationTemplate>> = {
	standard_prophylaxis: {
		cycleType: "standard_prophylaxis", title: "Шаблон приглашения: Плановая гигиена 6 мес.",
		greeting: "Здравствуйте! Доктор напоминает о плановом осмотре.",
		clinicalContext: "Снятие зубных отложений (УЗ + Air-Flow), онкоскрининг и сохранение здоровья зубов и гарантии.",
		callToAction: "Записаться на удобное время в 1 клик", objections: STANDARD_OBJECTIONS,
	},
	periodontal_maintenance: {
		cycleType: "periodontal_maintenance", title: "Шаблон приглашения: Пародонтология 3-4 мес.",
		greeting: "Добрый день! Доктор приглашает на поддерживающий осмотр десен.",
		clinicalContext: "Контроль глубины карманов и кровоточивости для стабильной ремиссии.",
		callToAction: "Записаться на осмотр пародонта в 1 клик", objections: [],
	},
	implant_monitoring: {
		cycleType: "implant_monitoring", title: "Шаблон приглашения: Контроль имплантатов",
		greeting: "Здравствуйте! Подошел срок контрольного осмотра имплантатов.",
		clinicalContext: "Контроль остеоинтеграции и маргинальной кости для сохранения гарантии.",
		callToAction: "Выбрать время осмотра в 1 клик", objections: [],
	},
	orthodontic_braces: {
		cycleType: "orthodontic_braces", title: "Шаблон приглашения: Активация брекетов 4 нед.",
		greeting: "Здравствуйте! Ждем на плановую активацию брекетов.",
		clinicalContext: "Плановая замена дуг и лигатур для непрерывного перемещения зубов.",
		callToAction: "Записаться на активацию в 1 клик", objections: [],
	},
	orthodontic_aligners: {
		cycleType: "orthodontic_aligners", title: "Шаблон приглашения: Ревизия элайнеров",
		greeting: "Здравствуйте! Ждем на выдачу нового сета элайнеров.",
		clinicalContext: "Ревизия трекинга капп и выдача следующей серии элайнеров.",
		callToAction: "Выбрать слот в 1 клик", objections: [],
	},
	orthodontic_retention: {
		cycleType: "orthodontic_retention", title: "Шаблон приглашения: Ретенционный контроль",
		greeting: "Здравствуйте! Приглашаем на контроль стабильности ретейнеров.",
		clinicalContext: "Контроль фиксации несъемного ретейнера и прилегания ночных капп.",
		callToAction: "Записаться на ретенционный осмотр в 1 клик", objections: [],
	},
	pediatric_fluoridation: {
		cycleType: "pediatric_fluoridation", title: "Шаблон приглашения: Детская минерализация",
		greeting: "Здравствуйте! Ждем маленького пациента на укрепление эмали.",
		clinicalContext: "Фторирование и герметизация фиссур для защиты от бутылочного кариеса.",
		callToAction: "Выбрать удобное время для ребенка в 1 клик", objections: [],
	},
	caries_high_risk: {
		cycleType: "caries_high_risk", title: "Шаблон приглашения: Кариес-контроль 3 мес.",
		greeting: "Здравствуйте! Рекомендована плановая ремотерапия эмали.",
		clinicalContext: "Ревизия пломб и глубокое фторирование для остановки очагов деминерализации.",
		callToAction: "Записаться на кариес-контроль в 1 клик", objections: [],
	},
	prosthetic_check: {
		cycleType: "prosthetic_check", title: "Шаблон приглашения: Гарантийный осмотр коронок",
		greeting: "Здравствуйте! Срок планового осмотра ортопедических конструкций.",
		clinicalContext: "Проверка окклюзионных контактов и краевого прилегания коронок.",
		callToAction: "Записаться на гарантийный осмотр в 1 клик", objections: [],
	},
	endodontic_check: {
		cycleType: "endodontic_check", title: "Шаблон приглашения: Рентген-контроль эндодонтии",
		greeting: "Здравствуйте! Срок планового рентген-контроля пролеченного зуба.",
		clinicalContext: "Прицельный снимок для подтверждения регенерации периапикальных тканей.",
		callToAction: "Записаться на снимок в 1 клик", objections: [],
	},
};

export const CLINICAL_CALLING_SCRIPTS = INVITATION_TEMPLATES;
