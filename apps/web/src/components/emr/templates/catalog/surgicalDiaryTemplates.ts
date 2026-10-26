/**
 * SURGICAL DIARY TEMPLATES — EXTRACTIONS & IMPLANTATION
 * Evidence-based surgical dental protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

export const IMPLANT_PLACEMENT_TEMPLATE: Clinical1ClickTemplate = {
	id: "implant_placement_k08_1",
	title: "Установка имплантата",
	shortTitle: "Имплантация",
	category: "surgery",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления, травмы или других причин",
	badge: "Имплант",
	icon: "implant",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на отсутствие зуба, затрудненное пережевывание пищи, эстетический дефект зубного ряда.",
	defaultAnamnesisMorbi: "Удаление зуба более 3-6 месяцев назад. Противопоказаний к дентальной имплантации нет. По данным КЛКТ: объем и плотность костной ткани альвеолярного отростка достаточны (тип кости D2-D3).",
	defaultObjectiveStatus: "При осмотре области отсутствующего {TOOTH}: слизистая оболочка альвеолярного гребня бледно-розовая, без воспаления, ширина зоны прикрепленной кератинизированной десны более 4 мм. Костный гребень достаточной ширины и высоты.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл.\n2. Антисептическая обработка операционного поля 0.05% хлоргексидином.\n3. Разрез по центру гребня альвеолярного отростка, отслаивание лоскута распатором.\n4. Разметка точки позиционирования. Внутрикостная дентальная имплантация: последовательное препарирование ложа сверлами с охлаждением стерильным 0.9% NaCl.\n5. Установка дентального имплантата с усилием торка 35-45 Н·см, субкрестальное позиционирование 0.5 мм (стабильность ISQ > 70).\n6. Установка винта-заглушки / формирователя десны.\n7. Мобилизация лоскута, глухое ушивание раны швами Prolene / Vicryl 4-0 без натяжения.\n8. Контрольная радиовизиограмма (RVG): позиция имплантата правильная.",
	defaultAnesthesia: "Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: ["Дентальный имплантат + формирователь десны", "Стерильный физиологический раствор 0.9% NaCl", "Шовный материал Prolene / Vicryl 4-0"],
	defaultRecommendations: "Холод местно на щеку 15 мин первые 3 часа. Не принимать горячую пищу 24 часа. Исключить спорт и сауну на 10 дней. Ротовые ванночки 0.05% хлоргексидином. Амоксиклав 875+125 мг 2 раза в день 7 дней, Нимесил 100 мг при болях. Снятие швов через 10-12 дней.",
	order804nServices: [
		{ code: "A16.07.054", nameRu: "Внутрикостная дентальная имплантация", isMandatory: true, defaultQuantity: 1, priceKopecks: 3500000 },
		{ code: "A16.07.054.001", nameRu: "Установка формирователя десны", isMandatory: true, defaultQuantity: 1, priceKopecks: 500000 },
		{ code: "A06.07.007", nameRu: "Внутриротовая рентгенография (радиовизиография)", isMandatory: true, defaultQuantity: 1, priceKopecks: 50000 },
	],
};

export const TOOTH_EXTRACTION_SIMPLE_TEMPLATE: Clinical1ClickTemplate = {
	id: "tooth_extraction_k08_1",
	title: "Простое удаление зуба (К08.1 / К04.5)",
	shortTitle: "Удаление зуба",
	category: "surgery",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления (Loss of teeth due to extraction)",
	badge: "Удаление",
	icon: "scissors",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на полное разрушение коронки зуба, периодические ноющие боли, травмирование слизистой оболочки языка и щеки острыми краями корня.",
	defaultAnamnesisMorbi: "Зуб неоднократно лечен. Коронковая часть полностью разрушена ниже уровня десны. По заключению терапевта/ортопеда зуб не подлежит восстановлению (ИРОПЗ > 0.9).",
	defaultObjectiveStatus: "При осмотре {TOOTH}: коронковая часть разрушена полностью ниже уровня десны, ткани корня размягчены, пигментированы. Перкуссия остатков корня слабо чувствительна. Слизистая десны умеренно гиперемирована. На RVG: периапикальный очаг деструкции 3-4 мм.",
	defaultPercussion: "positive_mild",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7-3.4 мл.\n2. Антисептическая обработка операционного поля 0.05% хлоргексидином.\n3. Синдесмотомия круговой связки зуба распатором на глубину 3-4 мм.\n4. Атравматичная люксация корней элеватором и экстракция щипцами с сохранением кортикальных пластинок альвеолы.\n5. Ревизионный кюретаж лунки острой ложкой Люкаса, удаление грануляций.\n6. Антисептический лаваж 0.05% хлоргексидином, сжатие краев лунки, внесение гемостатической губки Альвостим.\n7. Наложение сближающего шва Викрил 4-0. Гемостаз полный, устойчивый.",
	defaultAnesthesia: "Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7-3.4 мл",
	defaultMaterials: ["Элеваторы и корневые щипцы", "Гемостатическая губка Альвостим", "Шовный материал Викрил 4-0"],
	defaultRecommendations: "Марлевый шарик сплюнуть через 20 минут. Не принимать пищу 2 часа. Не полоскать рот активно. Исключить горячее, сауну и спорт на 3 дня. При болях: Нимесил 100 мг. Контрольный осмотр через 7 дней.",
	order804nServices: [
		{ code: "A16.07.001", nameRu: "Удаление постоянного зуба", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
		{ code: "A16.07.097", nameRu: "Наложение швов на слизистую оболочку полости рта", isMandatory: true, defaultQuantity: 1, priceKopecks: 100000 },
	],
};

export const TOOTH_EXTRACTION_COMPLEX_TEMPLATE: Clinical1ClickTemplate = {
	id: "tooth_extraction_complex_k01_1",
	title: "Сложное удаление зуба / Ретенция (К01.1)",
	shortTitle: "Сложное удаление зуба",
	category: "surgery",
	icd10Code: "K01.1",
	icd10Title: "Ретенированные и дистопированные зубы (Impacted teeth)",
	badge: "К01.1",
	icon: "scissors",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на затрудненное болезненное прорезывание зуба, распирающие боли в челюсти с иррадиацией в ухо и висок, отек десны, болезненность при открывании рта и глотании, прикусывание слизистой капюшона.",
	defaultAnamnesisMorbi: "Симптомы нарастают в течение 3-5 дней. По данным КЛКТ/ОПТГ: зуб ретенирован, дистопирован, корни изогнуты, близкое анатомическое прилегание к нижнечелюстному каналу.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: зуб ретенирован / полуретенирован, коронковая часть частично перекрыта воспаленным десневым капюшоном. Слизистая гиперемирована, отечна. Зондирование под капюшоном болезненно. Открывание рта ограничено (тризм I-II степени).",
	defaultPercussion: "positive_sharp",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Проводниковая + инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл.\n2. Антисептическая обработка 0.05% хлоргексидином.\n3. Разрез слизистой, отслаивание слизисто-надкостничного лоскута распатором.\n4. Костный доступ фиссурным бором Lindemann с непрерывным охлаждением 0.9% NaCl.\n5. Межкорневая сепарация корней турбинным наконечником и атравматичная люксация элеваторами Бейна.\n6. Ревизионный кюретаж лунки ложкой Люкаса, сглаживание костных краев фрезой, лаваж 0.05% хлоргексидином, гемостатическая губка Альвостим с йодоформом.\n7. Глухое ушивание раны швами Викрил 4-0 без натяжения. Гемостаз полный, устойчивый.",
	defaultAnesthesia: "Проводниковая и инфильтрационная анестезия Sol. Septanesti 1:100000 — 3.4 мл",
	defaultMaterials: ["Хирургический распатор и элеваторы Бейна", "Хирургические боры Lindemann", "Стерильный физиологический раствор 0.9% NaCl", "Гемостатическая губка Альвостим с йодоформом", "Шовный материал Викрил 4-0"],
	defaultRecommendations: "Холод на щеку по 15 мин каждые 30 мин первые 3 часа. Не греть, не полоскать рот в первые сутки. Исключить горячее, баню и спорт на 7 дней. Антибиотики и НПВС по схеме. Снятие швов через 8-10 дней.",
	order804nServices: [
		{ code: "A16.07.001.002", nameRu: "Удаление зуба сложное с разъединением корней", isMandatory: true, defaultQuantity: 1, priceKopecks: 500000 },
		{ code: "A16.07.001.003", nameRu: "Удаление ретенированного, дистопированного зуба", isMandatory: true, defaultQuantity: 1, priceKopecks: 650000 },
		{ code: "A16.07.097", nameRu: "Наложение швов на слизистую оболочку полости рта", isMandatory: true, defaultQuantity: 1, priceKopecks: 100000 },
		{ code: "A06.07.007", nameRu: "Внутриротовая рентгенография (радиовизиография)", isMandatory: true, defaultQuantity: 1, priceKopecks: 50000 },
	],
};

export const SURGICAL_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	IMPLANT_PLACEMENT_TEMPLATE,
	TOOTH_EXTRACTION_SIMPLE_TEMPLATE,
	TOOTH_EXTRACTION_COMPLEX_TEMPLATE,
];
