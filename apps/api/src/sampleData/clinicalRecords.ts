/**
 * @file clinicalRecords.ts
 * @description Layer 1: Clinical records, active visit, treatment plans, protocol templates.
 */
import { inMemoryDomainState } from "./domainState.js";

import type {
	ProtocolTemplate,
	TreatmentPlanItem,
	TreatmentPlanScenario,
	Visit,
} from "@dental/shared";

import type { DomainState } from "./types.js";
import { organizationId, marinaPatientId, alexeyPatientId, doctorUserId, chairId, activeAppointmentId, activeVisitId, nowIso } from "./fixtureIds.js";

export const activeVisit: Visit = {
	id: activeVisitId,
	organizationId,
	patientId: marinaPatientId,
	appointmentId: activeAppointmentId,
	status: "draft",
	revision: 1,
	complaint: "Периодическая боль при накусывании в области 36.",
	anamnesis: "Со слов пациента, боль появилась около недели назад.",
	objectiveStatus: "36: кариозная полость, реакция на холод кратковременная.",
	diagnosis: "K02.1 кариес дентина, предварительно.",
	treatmentPlan:
		"Анестезия, изоляция, препарирование, восстановление композитом.",
	doctorSummary:
		"AI-диктовка должна попадать сюда как черновик, не как подписанный диагноз.",
	createdAt: nowIso,
	updatedAt: nowIso,
};

/** Пустой идентификатор заготовки приёма из гидратации базы. */
export const NIL_VISIT_UUID = "00000000-0000-0000-0000-000000000000";

/**
 * Приём открыт, только если он настоящий: есть свой идентификатор и пациент,
 * которого видно в списке.
 *
 * Гидратация подставляет в `activeVisit` заготовку с нулевым UUID, когда
 * черновиков нет вовсе. Без этой проверки заготовка считалась неподписанным
 * приёмом, и клиника с нулём приёмов видела сразу три выдумки: срочное дело
 * «Закрыть медицинскую запись» на несуществующего пациента, предупреждение
 * смены «Прием не подписан» и единицу в очереди врача.
 */
function hasUnsignedActiveVisit(
	state: DomainState = inMemoryDomainState,
): boolean {
	const { activeVisit, patients } = state;
	if (activeVisit.status !== "draft") return false;
	if (activeVisit.id === NIL_VISIT_UUID) return false;
	if (activeVisit.patientId === NIL_VISIT_UUID) return false;
	return patients.some((patient) => patient.id === activeVisit.patientId);
}


export const treatmentPlanItems: TreatmentPlanItem[] = [
	{
		id: "113ac908-cbbe-4c6a-82de-65eec9b65311",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		serviceId: "svc-therapy-caries",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: "36",
		quantity: 1,
		unitPriceRub: 6800,
		discountRub: 0,
		status: "in_progress",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Текущий прием, восстановление после снимка.",
	},
	{
		id: "b0fa4a35-c2f9-4890-aeb7-87f19f904f46",
		organizationId,
		patientId: marinaPatientId,
		visitId: activeVisitId,
		serviceId: "svc-imaging-opg",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: null,
		quantity: 1,
		unitPriceRub: 1800,
		discountRub: 0,
		status: "completed",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Панорамный контроль перед лечением.",
	},
	{
		id: "b3c6ed4b-8fb7-4ee0-9dc1-24798f82a7d9",
		organizationId,
		patientId: alexeyPatientId,
		visitId: null,
		serviceId: "svc-hygiene-pro",
		snapshotServiceName: "Legacy Snapshot",
		snapshotServiceCategory: null,
		toothCode: null,
		quantity: 1,
		unitPriceRub: 4500,
		discountRub: 0,
		status: "approved",
		plannedDoctorUserId: doctorUserId,
		plannedChairId: chairId,
		notes: "Подготовить справку для налогового вычета после оплаты.",
	},
];

const treatmentPlanScenarios: TreatmentPlanScenario[] = [
	{
		id: "scenario-urgent-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Снять боль и закрыть острые риски",
		strategy: "urgent",
		priority: "budget",
		totalRub: 8600,
		durationMonths: 0,
		visitCount: 1,
		includedServiceIds: ["svc-therapy-caries", "svc-imaging-opg"],
		phases: [
			{
				title: "Сегодня",
				window: "1 визит",
				amountRub: 8600,
				focus: "Снимок, лечение 36, контроль боли",
			},
		],
		pros: [
			"Самый быстрый вход в лечение",
			"Пациент понимает минимальный платеж",
		],
		tradeoffs: [
			"Не закрывает профилактику",
			"Не формирует долгий план удержания результата",
		],
		clinicalWarnings: [
			"Нельзя отключать снимок: без него врач не подтверждает глубину поражения.",
		],
		active: true,
	},
	{
		id: "scenario-standard-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Стандартная санация без перегруза бюджета",
		strategy: "standard",
		priority: "balanced",
		totalRub: 13100,
		durationMonths: 1,
		visitCount: 2,
		includedServiceIds: [
			"svc-therapy-caries",
			"svc-imaging-opg",
			"svc-hygiene-pro",
		],
		phases: [
			{
				title: "Фаза 1",
				window: "сегодня",
				amountRub: 8600,
				focus: "Снимок и терапия активного очага",
			},
			{
				title: "Фаза 2",
				window: "через 2-3 недели",
				amountRub: 4500,
				focus: "Гигиена и профилактический контроль",
			},
		],
		pros: [
			"Закрывает клинический минимум",
			"Легко объясняется пациенту и администратору",
		],
		tradeoffs: ["Эстетика и расширенная ортопедия остаются отдельным решением"],
		clinicalWarnings: [
			"После лечения каналов или глубокой реставрации нужен контрольный осмотр.",
		],
		active: true,
	},
	{
		id: "scenario-optimal-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Оптимальный восстановительный план",
		strategy: "optimal",
		priority: "clinical",
		totalRub: 39100,
		durationMonths: 3,
		visitCount: 4,
		includedServiceIds: [
			"svc-therapy-caries",
			"svc-imaging-opg",
			"svc-hygiene-pro",
			"svc-prosthetics-crown",
		],
		phases: [
			{
				title: "Год 1 / старт",
				window: "0-1 месяц",
				amountRub: 13100,
				focus: "Санация, снимки, гигиена",
			},
			{
				title: "Восстановление",
				window: "2-3 месяц",
				amountRub: 26000,
				focus: "Ортопедическая защита ослабленного зуба",
			},
		],
		pros: [
			"Снижает риск повторного перелечивания",
			"Создает понятную дорожную карту для пациента",
		],
		tradeoffs: ["Выше стартовый чек", "Нужна координация терапевта и ортопеда"],
		clinicalWarnings: [
			"Если пациент откладывает коронку, администратор должен поставить recall.",
		],
		active: true,
	},
	{
		id: "scenario-maintenance-marina",
		organizationId,
		patientId: marinaPatientId,
		title: "Поддержание результата после лечения",
		strategy: "maintenance",
		priority: "balanced",
		totalRub: 9000,
		durationMonths: 12,
		visitCount: 2,
		includedServiceIds: ["svc-hygiene-pro"],
		phases: [
			{
				title: "Контроль 1",
				window: "через 6 месяцев",
				amountRub: 4500,
				focus: "Гигиена и раннее выявление новых очагов",
			},
			{
				title: "Контроль 2",
				window: "через 12 месяцев",
				amountRub: 4500,
				focus: "Повторная гигиена, снимок по показаниям",
			},
		],
		pros: [
			"Превращает лечение в долгий план наблюдения",
			"Дает администратору понятные будущие касания",
		],
		tradeoffs: ["Не заменяет отдельные лечебные назначения при новой боли"],
		clinicalWarnings: [
			"Если пациент пропускает профилактику, гарантийный риск растет.",
		],
		active: false,
	},
];

const protocolTemplateSeeds: Array<Omit<ProtocolTemplate, "updatedAt">> = [
	{
		id: "protocol-universal-exam",
		organizationId,
		specialty: "universal",
		title: "Осмотр: первичный / контрольный",
		visitReason: "Осмотр и план",
		defaultDurationMinutes: 30,
		complaintPrompt:
			"Основная причина визита, ожидания пациента, срочные жалобы, страхи, ограничения по бюджету и срокам.",
		objectiveTemplate:
			"Осмотр слизистой, гигиены, прикуса, зубов по квадрантам, имеющихся снимков и ортопедических конструкций.",
		diagnosisHints: [
			"Z01.2 стоматологический осмотр",
			"K02 кариес",
			"K05 болезни десен",
			"K08 нарушения зубов и опорных тканей",
		],
		treatmentPlanTemplate:
			"Сформировать маршрут: диагностика, срочные проблемы, санация, профильная консультация, документы и следующий визит.",
		requiredDocuments: ["paid_medical_services_contract", "treatment_plan"],
		suggestedImaging: ["opg", "photo"],
		safetyWarnings: [
			"Осмотр не заменяет профильную диагностику.",
			"План лечения подписывается после объяснения вариантов пациенту.",
		],
	},
	{
		id: "protocol-therapy-caries",
		organizationId,
		specialty: "therapist",
		title: "Терапия: кариес / реставрация",
		visitReason: "Лечение кариеса",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Боль/чувствительность, длительность, реакция на холод/сладкое, жалобы при накусывании.",
		objectiveTemplate:
			"Зуб __: кариозная полость __ класса, зондирование __, перкуссия __, слизистая без особенностей.",
		diagnosisHints: [
			"K02.1 кариес дентина",
			"K04.0 пульпит, если есть признаки",
			"K03.6 отложения на зубах",
		],
		treatmentPlanTemplate:
			"Анестезия, изоляция, препарирование, медикаментозная обработка, восстановление композитом, контроль окклюзии.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "bitewing"],
		safetyWarnings: [
			"Диагноз подтвердить врачом после осмотра и снимка.",
			"AI не подписывает ЭМК.",
		],
	},
	{
		id: "protocol-ortho-crown",
		organizationId,
		specialty: "orthopedist",
		title: "Ортопедия: коронка / вкладка",
		visitReason: "Ортопедическая консультация",
		defaultDurationMinutes: 75,
		complaintPrompt:
			"Жалобы на разрушение, эстетику, жевание, старую конструкцию, сроки протезирования.",
		objectiveTemplate:
			"Зуб __: степень разрушения __, прикус __, пародонт __, соседние зубы __, снимок оценен.",
		diagnosisHints: [
			"K08.5 неудовлетворительное восстановление",
			"K02.9 кариес неуточненный",
			"Z46.3 примерка зубного протеза",
		],
		treatmentPlanTemplate:
			"Диагностика, санация, препарирование, скан/слепок, временная конструкция, примерка, фиксация.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "opg"],
		safetyWarnings: [
			"Сроки и гарантийные условия должны попасть в план лечения.",
			"Проверить согласие на ортопедическое лечение.",
		],
	},
	{
		id: "protocol-surgery-extraction",
		organizationId,
		specialty: "surgeon",
		title: "Хирургия: удаление",
		visitReason: "Удаление зуба",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Боль, отек, температура, открывание рта, аллергии, антикоагулянты, беременность.",
		objectiveTemplate:
			"Область __: слизистая __, подвижность __, перкуссия __, снимок __, риски операции проговорены.",
		diagnosisHints: [
			"K04.5 хронический апикальный периодонтит",
			"K01.1 ретинированный зуб",
			"K08.1 потеря зубов",
		],
		treatmentPlanTemplate:
			"Анестезия, удаление, кюретаж при необходимости, гемостаз, рекомендации, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "opg", "cbct"],
		safetyWarnings: [
			"Проверить препараты крови/антикоагулянты.",
			"Послеоперационные рекомендации обязательны.",
		],
	},
	{
		id: "protocol-orthodontic-start",
		organizationId,
		specialty: "orthodontist",
		title: "Ортодонтия: первичная диагностика",
		visitReason: "Ортодонтическая консультация",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Прикус, скученность, эстетика, дыхание, ВНЧС, ранее проведенное лечение.",
		objectiveTemplate:
			"Прикус __, класс по Энглю __, скученность __, профиль __, гигиена __, снимки/фото назначены.",
		diagnosisHints: [
			"K07.2 аномалии соотношения зубных дуг",
			"K07.3 аномалии положения зубов",
		],
		treatmentPlanTemplate:
			"Фотопротокол, ОПТГ/ТРГ/КТ по показаниям, расчет, обсуждение аппарата/элайнеров/брекетов.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"informed_consent",
		],
		suggestedImaging: ["opg", "cbct", "photo"],
		safetyWarnings: [
			"План лечения подписывается после диагностики и расчета.",
			"Фотопротокол хранить в карте пациента.",
		],
	},
	{
		id: "protocol-perio",
		organizationId,
		specialty: "periodontist",
		title: "Пародонтология: карта пародонта",
		visitReason: "Пародонтологический прием",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Кровоточивость, подвижность, запах, чувствительность, курение, диабет, домашняя гигиена.",
		objectiveTemplate:
			"Индексы гигиены __, карманы __ мм, рецессии __, подвижность __, кровоточивость __.",
		diagnosisHints: [
			"K05.1 хронический гингивит",
			"K05.3 хронический пародонтит",
		],
		treatmentPlanTemplate:
			"Пародонтальная карта, профгигиена, обучение, закрытый кюретаж/поддержка по показаниям, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["opg", "periapical"],
		safetyWarnings: [
			"Нужна периодическая переоценка индексов.",
			"Системные факторы риска фиксировать явно.",
		],
	},
	{
		id: "protocol-hygiene",
		organizationId,
		specialty: "hygienist",
		title: "Гигиена: профчистка",
		visitReason: "Профессиональная гигиена",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Кровоточивость, налет, камень, чувствительность, дата последней гигиены.",
		objectiveTemplate:
			"Налет __, камень __, пигментация __, десна __, индексы гигиены __.",
		diagnosisHints: ["K03.6 отложения на зубах", "K05.1 гингивит"],
		treatmentPlanTemplate:
			"УЗ-скейлинг, AirFlow/полировка, реминерализация по показаниям, обучение гигиене.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"completed_works_act",
		],
		suggestedImaging: ["photo"],
		safetyWarnings: [
			"При выраженном воспалении направить к врачу.",
			"Рекомендации по домашней гигиене фиксировать.",
		],
	},
	{
		id: "protocol-pediatric",
		organizationId,
		specialty: "pediatric",
		title: "Детский прием",
		visitReason: "Детская стоматология",
		defaultDurationMinutes: 45,
		complaintPrompt:
			"Возраст, жалобы родителя, сон/еда, травма, страх, согласие законного представителя.",
		objectiveTemplate:
			"Поведение __, зуб __, кариес/пломба __, слизистая __, прикус __, гигиена __.",
		diagnosisHints: [
			"K02.1 кариес дентина",
			"K04.0 пульпит",
			"Z01.2 стоматологическое обследование",
		],
		treatmentPlanTemplate:
			"Адаптация, лечение по показаниям, профилактика, рекомендации родителю, контроль.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"informed_consent",
			"completed_works_act",
		],
		suggestedImaging: ["periapical", "bitewing", "photo"],
		safetyWarnings: [
			"Проверить законного представителя.",
			"Дозировки и анестезия по возрасту/весу.",
		],
	},
	{
		id: "protocol-implant",
		organizationId,
		specialty: "implantologist",
		title: "Имплантология: планирование",
		visitReason: "Имплантация",
		defaultDurationMinutes: 60,
		complaintPrompt:
			"Отсутствующие зубы, ожидания, курение, диабет, лекарства, предыдущие операции.",
		objectiveTemplate:
			"Область __, объем кости по КТ __, слизистая __, соседние зубы __, окклюзия __.",
		diagnosisHints: ["K08.1 потеря зубов", "Z46.3 примерка/подбор протеза"],
		treatmentPlanTemplate:
			"КТ-анализ, план имплантации, шаблон/навигация по показаниям, этапы хирургии и протезирования.",
		requiredDocuments: [
			"paid_medical_services_contract",
			"treatment_plan",
			"informed_consent",
		],
		suggestedImaging: ["cbct", "opg", "photo"],
		safetyWarnings: [
			"Без КТ план имплантации не финализировать.",
			"Риски и альтернативы должны быть в согласии.",
		],
	},
	{
		id: "protocol-radiology",
		organizationId,
		specialty: "radiologist",
		title: "Рентгенология: описание снимка",
		visitReason: "Описание исследования",
		defaultDurationMinutes: 20,
		complaintPrompt:
			"Тип исследования, область, причина направления, клинический вопрос.",
		objectiveTemplate:
			"Исследование __, качество __, область __, находки __, ограничения метода __.",
		diagnosisHints: ["Описание не является самостоятельным планом лечения"],
		treatmentPlanTemplate:
			"Передать врачу как описание/черновик, отметить ограничения и необходимость клинической корреляции.",
		requiredDocuments: ["completed_works_act"],
		suggestedImaging: ["periapical", "opg", "cbct"],
		safetyWarnings: [
			"AI-описание снимка не равно диагнозу.",
			"КЛКТ/КТ-серии требуют просмотрщик и метаданные.",
		],
	},
];

const protocolTemplates: ProtocolTemplate[] = protocolTemplateSeeds.map(
	(template) => ({ ...template, updatedAt: nowIso }),
);


function findVisitById(visitId: string): Visit | null {
	return activeVisit.id === visitId ? activeVisit : null;
}

export { treatmentPlanScenarios, hasUnsignedActiveVisit, protocolTemplates, findVisitById };
