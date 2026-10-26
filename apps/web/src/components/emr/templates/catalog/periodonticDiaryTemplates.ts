/**
 * PERIODONTIC DIARY TEMPLATES — HYGIENE, SRP & PERIODONTOLOGY
 * Evidence-based periodontic and preventive protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

export const HYGIENE_AIRFLOW_TEMPLATE: Clinical1ClickTemplate = {
	id: "hygiene_airflow_k05_3",
	title: "Профгигиена Air-Flow",
	shortTitle: "Профгигиена Air-Flow",
	category: "periodontics",
	icd10Code: "K05.3",
	icd10Title: "Хронический пародонтит / Зубные отложения",
	badge: "Air-Flow",
	icon: "sparkles",
	isCore1Click: true,
	toothTargetRequired: false,
	defaultSubjectiveComplaints: "Жалобы на кровоточивость десен при чистке зубов, наличие плотного пигментированного налета («налет курильщика / кофемана»), шероховатость зубов, неприятный запах изо рта.",
	defaultAnamnesisMorbi: "Профессиональная гигиена полости рта проводилась более 1 года назад. Индивидуальная гигиена нерегулярная, межзубные ершики использует редко.",
	defaultObjectiveStatus: "При осмотре полости рта: слизистая оболочка десневого края гиперемирована, отечна, кровоточит при зондировании (BOP = 30%, PBI = 2 балла). Во всех секстантах определяются массивные наддесневые и поддесневые зубные отложения, плотный пигментированный налет в пришеечной зоне. Индекс OHI-S = 2.4.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Аппликационная анестезия десневого края гелем Лидоксор.\n2. Индикация биопленки 2-цветным индикатором Mira-2-Ton.\n3. Ультразвуковой скейлинг аппаратом EMS Piezon Master: удаление над- и поддесневого зубного камня во всех секстантах под водяным охлаждением.\n4. Воздушно-абразивная обработка Air-Flow мелкодисперсным порошком глицина (25 мкм, Air-Flow Plus) для деликатного удаления биопленки и пигмента.\n5. Очистка проксимальных поверхностей абразивными штрипсами и флоссом.\n6. Финишная полировка всех зубов пастой Cleanic полировочными чашечками и щеточками до зеркального блеска.\n7. Антисептическая обработка десны 0.05% хлоргексидином, аппликация геля Метрогил Дента.\n8. Глубокое фторирование: нанесение защитного фторлака Clinpro White Varnish на все зубы.\n9. Индивидуальный подбор средств гигиены (щетка Soft, ершики Prime).",
	defaultAnesthesia: "Аппликационная анестезия гелем Лидоксор",
	defaultMaterials: ["Индикатор налета Mira-2-Ton", "Порошок Air-Flow глицин (Plus 25 мкм)", "Полировочная паста Cleanic", "Фторлак Clinpro White Varnish", "Гель Метрогил Дента"],
	defaultRecommendations: "«Белая диета» в течение 48 часов: исключить красящие продукты (кофе, чай, красное вино, ягоды, свеклу) и курение. Заменить зубную щетку на новую. Аппликации геля Метрогил Дента 2 раза в день 5 дней. Повторный осмотр и гигиена через 6 месяцев.",
	order804nServices: [
		{ code: "A16.07.051", nameRu: "Профессиональная гигиена полости рта и зубов", isMandatory: true, defaultQuantity: 1, priceKopecks: 500000 },
		{ code: "A16.07.051.001", nameRu: "Ультразвуковое удаление наддесневых и поддесневых зубных отложений", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
		{ code: "A16.07.051.002", nameRu: "Воздушно-абразивная обработка зубов (Air-Flow)", isMandatory: true, defaultQuantity: 1, priceKopecks: 200000 },
		{ code: "A11.07.012", nameRu: "Глубокое фторирование эмали зуба", isMandatory: true, defaultQuantity: 1, priceKopecks: 100000 },
	],
};

export const PERIODONTIC_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	HYGIENE_AIRFLOW_TEMPLATE,
];
