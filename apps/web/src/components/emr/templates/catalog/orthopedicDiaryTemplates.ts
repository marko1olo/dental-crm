/**
 * ORTHOPEDIC DIARY TEMPLATES — PROSTHODONTICS & RESTORATION
 * Evidence-based orthopedic dental protocols (Mandate 8b <= 120 lines).
 */
import type { Clinical1ClickTemplate } from "./clinicalDiaryTypes";

export const CROWN_PREP_EMAX_TEMPLATE: Clinical1ClickTemplate = {
	id: "crown_prep_emax_k08_1",
	title: "Препарирование под коронку E.max",
	shortTitle: "Коронка E.max",
	category: "orthopedics",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие удаления, травмы или разрушения",
	badge: "E.max",
	icon: "crown",
	isCore1Click: true,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалобы на разрушение твердых тканей коронковой части зуба более 50%, нарушение жевательной эффективности, эстетический дефект зубного ряда.",
	defaultAnamnesisMorbi: "Зуб ранее эндодонтически пролечен, восстановлен культевой вкладкой/композитом. Направлен на изготовление цельнокерамической коронки IPS e.max.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: коронковая часть зуба разрушена (ИРОПЗ > 0.6). Корневые каналы качественно обтурированы до верхушки, периапикальные ткани без патологических изменений. Слизистая оболочка маргинальной десны интактна.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл.\n2. Препарирование зуба под цельнокерамическую коронку IPS e.max с формированием уступа Chamfer 0.8-1.0 мм на уровне десневого края. Сглаживание углов и граней.\n3. Двухниточная ретракция десны (нити Ultrapack #000 и #0 с гемостатиком ViscoStat Clear).\n4. Снятие высокоточного рабочего оттиска А-силиконом / интраоральное 3D сканирование. Регистрация окклюзии Futar D, слепок антагонистов.\n5. Изготовление провизорной временной коронки прямым методом из Protemp 4 / Luxatemp, полировка, фиксация на Temp-Bond NE.\n6. Контроль окклюзионных контактов артикуляционной фольгой 8 мкм.",
	defaultAnesthesia: "Инфильтрационная анестезия Sol. Septanesti 1:100000 — 1.7 мл",
	defaultMaterials: ["Ретракционные нити Ultrapack #000, #0 + ViscoStat Clear", "А-силикон Honigum / Express XT", "Регистрат окклюзии Futar D", "Бис-акрил Protemp 4 / Luxatemp", "Временный цемент Temp-Bond NE"],
	defaultRecommendations: "Исключить вязкую и чрезмерно твердую пищу в области временной коронки. При расцементировке немедленно обратиться в клинику. Явка на примерку постоянной коронки через 5-7 дней.",
	order804nServices: [
		{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой", isMandatory: true, defaultQuantity: 1, priceKopecks: 1800000 },
		{ code: "A16.07.031.001", nameRu: "Препарирование зуба под коронку", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
		{ code: "A02.07.010", nameRu: "Снятие оттиска с одной челюсти", isMandatory: true, defaultQuantity: 2, priceKopecks: 200000 },
		{ code: "A16.07.004.001", nameRu: "Изготовление временной коронки прямым методом", isMandatory: true, defaultQuantity: 1, priceKopecks: 250000 },
	],
};

export const CROWN_CEMENTATION_TEMPLATE: Clinical1ClickTemplate = {
	id: "crown_cementation_k08_1",
	title: "Фиксация постоянной коронки",
	shortTitle: "Фиксация коронки",
	category: "orthopedics",
	icd10Code: "K08.1",
	icd10Title: "Потеря зубов вследствие разрушения / Протезирование",
	badge: "Фиксация",
	icon: "gem",
	isCore1Click: false,
	toothTargetRequired: true,
	defaultSubjectiveComplaints: "Жалоб на момент осмотра активно не предъявляет. Явился на плановую примерку и постоянную фиксацию изготовленной ортопедической коронки.",
	defaultAnamnesisMorbi: "Зуб ранее отпрепарирован под постоянную коронку, сняты оттиски, зафиксирована временная коронка.",
	defaultObjectiveStatus: "При осмотре {TOOTH}: временная коронка сохранена, десневой край бледно-розовый, без признаков воспаления. Препарированный культевой уступ интактен.",
	defaultPercussion: "negative",
	defaultThermalTest: "indifferent",
	defaultProbing: "none",
	defaultEodMicroamperes: null,
	defaultProcedureProtocol: "1. Снятие временной коронки, очистка культи зуба от остатков временного цемента щеткой с пастой без фтора.\n2. Примерка готовой постоянной цельнокерамической коронки IPS e.max: оценка краевого прилегания, точности посадки, аппроксимальных контактов и цвета.\n3. Коррекция окклюзии фольгой 8 мкм. Пациент полностью удовлетворен формой и цветом коронки.\n4. Протокол адгезивной фиксации: протравливание внутренней поверхности коронки 5% плавиковой кислотой (HF) 20 сек, силан Monobond Plus 60 сек. Обработка культи зуба 37% H3PO4 15 сек, смывание, адгезив.\n5. Постоянная фиксация коронки на композитный цемент двойного отверждения (RelyX Ultimate / Variolink Esthetic), удаление излишков, полимеризация под гелем Oxiguard.\n6. Финишная полировка границы перехода реставрации, контроль суперфлоссом.",
	defaultAnesthesia: "Без анестезии (депульпированный зуб) / Аппликационная анестезия",
	defaultMaterials: ["5% плавиковая кислота + силан Monobond Plus", "Композитный цемент RelyX Ultimate / Variolink Esthetic", "Глицериновый гель Oxiguard", "Артикуляционная фольга 8 мкм"],
	defaultRecommendations: "Не принимать жесткую пищу в течение 2 часов. Соблюдение индивидуальной гигиены с использованием суперфлосса. Контрольный осмотр через 14 дней.",
	order804nServices: [
		{ code: "A16.07.004", nameRu: "Восстановление зуба коронкой (фиксация)", isMandatory: true, defaultQuantity: 1, priceKopecks: 300000 },
		{ code: "A16.07.025", nameRu: "Избирательное пришлифовывание и полирование твердых тканей зуба", isMandatory: true, defaultQuantity: 1, priceKopecks: 100000 },
	],
};

export const ORTHOPEDIC_DIARY_TEMPLATES: readonly Clinical1ClickTemplate[] = [
	CROWN_PREP_EMAX_TEMPLATE,
	CROWN_CEMENTATION_TEMPLATE,
];
