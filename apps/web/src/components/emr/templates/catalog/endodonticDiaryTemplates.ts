/**
 * ENDODONTIC DIARY TEMPLATES — PULPITIS & APICAL PERIODONTITIS
 * Evidence-based endodontic root canal protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

export const PULPITIS_ACUTE_TEMPLATE: Clinical1ClickTemplate = {
	id: "pulpitis_acute_k04_0",
	title: "Пульпит (К04.0)",
	shortTitle: "Пульпит",
	category: "endodontics",
	icd10Code: "K04.0",
	icd10Title: "Пульпит (Pulpitis)",
	badge: "К04.0",
	icon: "zap",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на острые приступообразные самопроизвольные боли в зубе, усиливающиеся в ночное время, длительные боли от температурных раздражителей (холодного, горячего), иррадиацию болей по ходу ветвей тройничного нерва (в ухо, висок).",
	defaultAnamnesisMorbi: "Боли появились 2 суток назад, носят пульсирующий характер с короткими светлыми промежутками. Прием анальгетиков дает временное неполное облегчение.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: глубокая кариозная полость, сообщающаяся с полостью зуба в одной точке. Зондирование вскрытой точки резко болезненно, пульпа кровоточит при легком касании. Перкуссия слабо положительная. Термопроба: резкая, длительно не проходящая боль (>1 минуты). ЭОД = 35 мкА. На прицельной RVG: кариозный дефект с вовлечением пульповой камеры, периапикальная щель не расширена.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "lingering_sharp_pain",
	defaultProbing: "bleeding_orifice",
	defaultEodMicroamperes: 35,
	defaultProcedureProtocol: "1. Проводниковая + инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл. Полная хирургическая анестезия через 4 минуты.\n2. Изоляция системой коффердам (платок Sanctuary, кламп W8A), антисептическая обработка 0.05% хлоргексидином.\n3. Раскрытие полости зуба бором Endo-Z, ампутация коронковой пульпы, визуализация устьев корневых каналов.\n4. Витальная экстирпация корневой пульпы, формирование ковровой дорожки ProGlider, определение рабочей длины апекслокатором с RVG-контролем.\n5. Машинное препарирование каналов Ni-Ti ротационной системой WaveOne Gold / ProTaper Gold.\n6. Непрерывный лаваж подогретым 3% NaOCl (20 мл) с ультразвуковой активацией (EndoActivator, 3 цикла по 20 сек) + 17% EDTA 1 мин. Высушивание бумажными штифтами.\n7. Трехмерная обтурация корневых каналов методом непрерывной волны с эпоксидным силером AH Plus.\n8. Контрольная RVG: каналы обтурированы плотно до апекса. Герметизация устьев текучим композитом SDR, временная пломба Cavit / Clip.",
	defaultAnesthesia: "Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: ["Коффердам + кламп W8A", "Ni-Ti ротационные файлы WaveOne Gold / ProTaper Gold", "3% раствор NaOCl (20 мл) + 17% EDTA", "Мастер-штифты гуттаперчи + термопластическая гуттаперча", "Эпоксидный силер AH Plus", "Текучий композит SDR + временный цемент Cavit"],
	defaultRecommendations: "Возможна умеренная постпломбировочная чувствительность при накусывании 2-4 дня. При болях: Нимесил 100 мг 1-2 раза в день. Не жевать твердое на стороне зуба до постоянного восстановления коронки. Контрольный осмотр через 7 дней.",
	order804nServices: [
		{ code: "A16.07.030.003", nameRu: "Инструментальная и медикаментозная обработка корневого канала (3-канальный зуб)", isMandatory: true, defaultQuantity: 1, priceKopecks: 450000 },
		{ code: "A16.07.008.003", nameRu: "Пломбирование корневого канала зуба гуттаперчей (3 канала)", isMandatory: true, defaultQuantity: 1, priceKopecks: 400000 },
		{ code: "A16.07.002", nameRu: "Восстановление зуба пломбой (наложение пломбы)", isMandatory: true, defaultQuantity: 1, priceKopecks: 150000 },
		{ code: "A06.07.007", nameRu: "Внутриротовая рентгенография (радиовизиография)", isMandatory: true, defaultQuantity: 2, priceKopecks: 50000 },
	],
};

export const PERIODONTITIS_CHRONIC_TEMPLATE: Clinical1ClickTemplate = {
	id: "periodontitis_chronic_k04_5",
	title: "Периодонтит (К04.5)",
	shortTitle: "Периодонтит",
	category: "endodontics",
	icd10Code: "K04.5",
	icd10Title: "Хронический апикальный периодонтит (Chronic apical periodontitis)",
	badge: "К04.5",
	icon: "shield",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на ноющие боли в зубе, чувство неловкости и дискомфорта при накусывании на зуб (симптом «выросшего зуба»), изменение цвета коронки, неприятный запах из кариозной полости.",
	defaultAnamnesisMorbi: "Зуб ранее лечен более 3 лет назад. Периодически отмечает чувство распирания и чувствительность при жевании твердой пищи.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: коронковая часть зуба изменена в цвете (сероватый оттенок), дефект старой пломбы. Полость зуба вскрыта, зондирование устьев безболезненное, распад с гнилостным запахом. Перкуссия положительная (+). Термопроба индифферентна. ЭОД = 120 мкА (полный некроз пульпы). На RVG: деструкция костной ткани в периапикальной области верхушки корня с нечеткими контурами диаметром 3-4 мм.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: 120,
	defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Изоляция операционного поля коффердамом.\n3. Эндодонтический ретритмент: удаление старого пломбировочного материала, эвакуация некротического распада, создание прямолинейного доступа Endo-Z.\n4. Прохождение корневых каналов ручными файлами C-Pilot, апекслокация рабочей длины с RVG-контролем.\n5. Механическая и медикаментозная обработка Ni-Ti ротационными файлами WaveOne Gold / ProTaper Gold. Непрерывная ирригация 3% NaOCl с ультразвуковой активацией + 17% EDTA. Высушивание бумажными штифтами.\n6. Временная лечебная обтурация каналов высокощелочной пастой гидроксида кальция Ca(OH)2 (Кальсепт / Metapex) под рентген-контролем.\n7. Герметизация устьев СИЦ, наложение временной герметичной повязки Cavit / Clip на 10-14 дней.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: ["Коффердам латексный + кламп", "Эндодонтический ретритмент-набор", "3% NaOCl + 17% EDTA", "Лечебная паста гидроксида кальция Ca(OH)2 Кальсепт / Metapex", "Временный герметичный цемент Cavit / Clip"],
	defaultRecommendations: "Щадящий режим питания (не жевать твердую пищу на больной зуб). При болях: Нимесил 100 мг. Явка через 10-14 дней для контроля динамики и постоянной обтурации корневых каналов.",
	order804nServices: [
		{ code: "A16.07.030", nameRu: "Инструментальная и медикаментозная обработка корневого канала", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
		{ code: "A16.07.091", nameRu: "Временное пломбирование лекарственным препаратом корневого канала", isMandatory: true, defaultQuantity: 1, priceKopecks: 200000 },
		{ code: "A06.07.007", nameRu: "Внутриротовая рентгенография (радиовизиография)", isMandatory: true, defaultQuantity: 2, priceKopecks: 50000 },
	],
};

export const ENDODONTIC_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	PULPITIS_ACUTE_TEMPLATE,
	PERIODONTITIS_CHRONIC_TEMPLATE,
];
