/**
 * PEDIATRIC DIARY TEMPLATES — PULPOTOMY & CARIES PREVENTION
 * Evidence-based pediatric dental protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

export const PEDIATRIC_PULPOTOMY_TEMPLATE: Clinical1ClickTemplate = {
	id: "pediatric_pulpotomy_k04_0",
	title: "Детский прием: Пульпит молочного зуба (Пульпотомия)",
	shortTitle: "Пульпотомия молочного зуба",
	category: "pediatric",
	icd10Code: "K04.0",
	icd10Title: "Пульпит временного зуба",
	badge: "Дети: Пульпит",
	icon: "baby",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы со слов родителей на боли в зубе у ребенка во время приема пищи (особенно сладкого и холодного), застревание пищи, беспокойство во время еды.",
	defaultAnamnesisMorbi: "Боли появились около недели назад при попадании пищи в полость. Ночных самопроизвольных болей не отмечалось.",
	defaultObjectiveStatus: "При осмотре временного {TOOTH}: глубокая кариозная полость, полость зуба вскрыта, зондирование слабо болезненно. Перкуссия безболезненная. Слизистая переходной складки без признаков воспаления. На RVG: резорбция корней не превышает 1/3, периапикальных изменений нет.",
	defaultPercussion: "negative",
	defaultThermalTest: "transient_pain",
	defaultProbing: "at_cavity_bottom",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Аппликационная анестезия с приятным вкусом + инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл.\n2. Изоляция коффердамом / валиками.\n3. Раскрытие полости зуба, ампутация коронковой пульпы шаровидным бором на малых оборотах.\n4. Гемостаз устьев корневых каналов тампоном с физраствором 2-3 минуты. Гемостаз полный.\n5. Наложение на устья биосовместимого МТА (Biodentine / ProRoot).\n6. Восстановление коронковой части зуба СИЦ светового отверждения (Fuji II LC / Vitremer) / детской коронкой.\n7. Шлифовка, полировка, защитный лак.",
	defaultAnesthesia: "Аппликационная + инфильтрационная анестезия Sol. Septanesti 1:200000 — 0.8 мл",
	defaultMaterials: ["Биокерамика Biodentine / ProRoot MTA", "СИЦ Vitremer / Fuji II LC", "Детская стандартная коронка (при показаниях)"],
	defaultRecommendations: "Не принимать пищу 1.5 часа. Контроль родителями чистки зубов 2 раза в день. Профилактический осмотр через 3 месяца.",
	order804nServices: [
		{ code: "A16.07.009", nameRu: "Пульпотомия (ампутация коронковой пульпы)", isMandatory: true, defaultQuantity: 1, priceKopecks: 300000 },
		{ code: "A16.07.002", nameRu: "Восстановление зуба пломбой (детский прием)", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
	],
};

export const FISSURE_SEALING_TEMPLATE: Clinical1ClickTemplate = {
	id: "fissure_sealing_k02_0",
	title: "Неинвазивная герметизация фиссур",
	shortTitle: "Герметизация фиссур",
	category: "preventive",
	icd10Code: "Z01.2",
	icd10Title: "Стоматологическое обследование / Профилактика кариеса",
	badge: "Герметизация",
	icon: "shield",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалоб на момент осмотра активно не предъявляет. Обратился с целью первичной профилактики кариеса недавно прорезавшегося постоянного моляра.",
	defaultAnamnesisMorbi: "Постоянный зуб прорезался около 4-6 месяцев назад. Кариозных поражений нет.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: окклюзионные фиссуры глубокие, интактные, без пигментации и деминерализации. Зондирование фиссур безболезненное, зонд не застревает. Перкуссия безболезненная. Реакция на холод индифферентна. ЭОД = 2-3 мкА.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 2,
	defaultProcedureProtocol: "1. Профессиональное очищение окклюзионной поверхности ротационной щеточкой с полировочной пастой без фтора.\n2. Изоляция коффердамом / ватными валиками, высушивание воздухом.\n3. Протравливание фиссур 37% гелем ортофосфорной кислоты 20 секунд, смывание водой, высушивание до матового белого оттенка.\n4. Нанесение текучего герметика фиссур с выделением фтора (Clinpro Sealant / Fissurit FX).\n5. Фотополимеризация LED-лампой 30 секунд.\n6. Контроль окклюзии артикуляционной бумагой Bausch 40 мкм, пришлифовывание излишков, полировка.",
	defaultAnesthesia: "Без анестезии",
	defaultMaterials: ["Полировочная паста без фтора Cleanic", "37% ортофосфорная кислота", "Светоотверждаемый герметик Clinpro Sealant / Fissurit FX"],
	defaultRecommendations: "Регулярная индивидуальная гигиена полости рта фторсодержащими пастами. Контрольный осмотр сохранности герметика через 6 месяцев.",
	order804nServices: [
		{ code: "A16.07.057", nameRu: "Запечатывание фиссуры зуба герметиком (неинвазивная герметизация)", isMandatory: true, defaultQuantity: 1, priceKopecks: 180000 },
		{ code: "A11.07.012", nameRu: "Глубокое фторирование эмали зуба", isMandatory: false, defaultQuantity: 1, priceKopecks: 50000 },
	],
};

export const PEDIATRIC_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	PEDIATRIC_PULPOTOMY_TEMPLATE,
	FISSURE_SEALING_TEMPLATE,
];
