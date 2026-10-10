/**
 * @file types.ts
 * @description Типы клинических демо-кейсов, пропсов модалки, этапов лечения и сметы по приказу 804н.
 * Layer 0: Контракты данных и клинические пресеты демо-режима (МАНДАТ 8y, МАНДАТ 8n).
 */

import type { DemoRoleProfile } from "../../../utils/demo/demoInteractiveSimulation.js";
import type {
	DemoOdontogramToothState,
	DemoSoapDiary,
	DemoLabOrderCase,
	DemoOrthoCase,
	DemoSurgeonCase,
	DemoExecutiveKpiCase,
} from "../../../utils/demo/demoClinicalCases.js";

export type DemoCaseCategory =
	| "all_on_4"
	| "total_rehab"
	| "orthodontics"
	| "therapy_endo"
	| "surgery_implant";

export interface DemoCaseMediaItem {
	id: string;
	title: string;
	type: "photo_before_after" | "ct_slice" | "xray_visio" | "stl_3d";
	beforeLabel: string;
	afterLabel: string;
	beforeDesc: string;
	afterDesc: string;
	currentSlice?: number;
	totalSlices?: number;
	boneDensityHounsfield?: number;
	scanResolution?: string;
}

export interface DemoTreatmentStage {
	id: string;
	stageNumber: number;
	title: string;
	specialty: "therapy" | "surgery" | "orthopedics" | "orthodontics" | "finish";
	specialtyRu: string;
	status: "completed" | "in_progress" | "planned";
	doctorName: string;
	durationDays: number;
	clinicalDescription: string;
	nomenclatureCodes: string[];
	stageCostRub: number;
}

export interface DemoFinancialItem {
	code: string;
	name: string;
	toothNumber?: string | number;
	quantity: number;
	unitPriceRub: number;
	discountRub: number;
	totalRub: number;
	patientSavingsRub: number;
}

export interface DemoClinicalCase {
	id: string;
	title: string;
	category: DemoCaseCategory;
	categoryLabel: string;
	roleKey: string;
	patientName: string;
	patientAge: number;
	diagnosisText: string;
	diagnosisIcd10: string;
	doctorName: string;
	summary: string;
	media: DemoCaseMediaItem[];
	stages: DemoTreatmentStage[];
	financialItems: DemoFinancialItem[];
	totalGrossRub: number;
	totalDiscountRub: number;
	totalNetRub: number;
	patientSavingsRub: number;
}

export interface DemoCaseViewerModalProps {
	readonly isOpen: boolean;
	readonly activeRoleKey: string;
	readonly onClose: () => void;
	readonly onSelectRole?: (roleKey: string) => void;
	readonly initialCaseId?: string;
}

// ============================================================================
// ПРЕСЕТЫ КЛИНИЧЕСКИХ ДЕМО-КЕЙСОВ
// ============================================================================

export const DEMO_CLINICAL_CASES: Record<string, DemoClinicalCase> = {
	all_on_4: {
		id: "all_on_4",
		title: "Тотальная реабилитация All-on-4 (НЧ)",
		category: "all_on_4",
		categoryLabel: "Хирургия & Имплантация",
		roleKey: "surgeon",
		patientName: "Смирнова Анна Сергеевна",
		patientAge: 54,
		diagnosisText: "Полное вторичное отсутствие зубов на нижней челюсти, атрофия альвеолярного отростка 3 степени",
		diagnosisIcd10: "K08.1",
		doctorName: "Д-р Громов К. Д.",
		summary: "Установка 4 дентальных имплантатов в межментальной зоне с ангуляцией дистальных опор 30°, фиксация мультиюнит-абатментов и адаптационного моста с винтовой фиксацией.",
		media: [
			{
				id: "m_all4_ct",
				title: "КЛКТ срез: Межментальная зона",
				type: "ct_slice",
				beforeLabel: "Предоперационная КЛКТ",
				afterLabel: "Контроль позиционирования 4 имплантатов",
				beforeDesc: "Выраженная атрофия кости в области моляров, близость нижнечелюстного канала 4.2 мм",
				afterDesc: "Имплантаты установлены в обход ментальных отверстий, торк 45 Н·см, ISQ 76",
				currentSlice: 32,
				totalSlices: 64,
				boneDensityHounsfield: 720,
				scanResolution: "0.15 мм Воксель",
			},
			{
				id: "m_all4_photo",
				title: "Фотопротокол До/После",
				type: "photo_before_after",
				beforeLabel: "Исходная клиническая картина",
				afterLabel: "Фиксация немедленного адаптационного моста",
				beforeDesc: "Полная адентия нижней челюсти, западение нижней трети лица",
				afterDesc: "Восстановление окклюзионной высоты, эстетичный винтовой композитный мост",
			},
			{
				id: "m_all4_stl",
				title: "3D интраоральный скан STL",
				type: "stl_3d",
				beforeLabel: "Цифровой оттиск до вмешательства",
				afterLabel: "Скан-маркеры на мультиюнитах",
				beforeDesc: "Анатомический рельеф слизистой оболочки альвеолярного гребня",
				afterDesc: "Выгрузка координат шахт в Exocad для фрезеровки балочной конструкции",
			},
		],
		stages: [
			{
				id: "st_all4_1",
				stageNumber: 1,
				title: "Диагностика и 3D планирование",
				specialty: "therapy",
				specialtyRu: "Диагностика",
				status: "completed",
				doctorName: "Д-р Соколов А. В.",
				durationDays: 3,
				clinicalDescription: "КЛКТ челюстей, снятие цифровых оттисков, моделирование навигационного шаблона в 3D.",
				nomenclatureCodes: ["A06.07.013", "A02.07.010"],
				stageCostRub: 18500,
			},
			{
				id: "st_all4_2",
				stageNumber: 2,
				title: "Хирургическая имплантация All-on-4",
				specialty: "surgery",
				specialtyRu: "Хирургия",
				status: "completed",
				doctorName: "Д-р Громов К. Д.",
				durationDays: 1,
				clinicalDescription: "Установка 4 имплантатов Straumann BLX через навигационный шаблон, установка мультиюнит абатментов 17° и 30°.",
				nomenclatureCodes: ["A16.07.054", "A16.07.055", "B01.065.007"],
				stageCostRub: 245000,
			},
			{
				id: "st_all4_3",
				stageNumber: 3,
				title: "Немедленная нагрузка (Адаптационный мост)",
				specialty: "orthopedics",
				specialtyRu: "Ортопедия",
				status: "in_progress",
				doctorName: "Д-р Орлов А. В.",
				durationDays: 3,
				clinicalDescription: "Примерка и винтовая фиксация армированного провизорного моста на 72 часа после операции.",
				nomenclatureCodes: ["A16.07.023"],
				stageCostRub: 95000,
			},
			{
				id: "st_all4_4",
				stageNumber: 4,
				title: "Постоянное циркониевое протезирование",
				specialty: "finish",
				specialtyRu: "Финиш",
				status: "planned",
				doctorName: "Д-р Орлов А. В.",
				durationDays: 14,
				clinicalDescription: "Через 6 месяцев остеоинтеграции: фрезерованный циркониевый мост на титановой балке.",
				nomenclatureCodes: ["A16.07.023.001"],
				stageCostRub: 180000,
			},
		],
		financialItems: [
			{
				code: "A16.07.054",
				name: "Установка дентального имплантата Straumann BLX (4 ед.)",
				toothNumber: "34, 32, 42, 44",
				quantity: 4,
				unitPriceRub: 55000,
				discountRub: 22000,
				totalRub: 198000,
				patientSavingsRub: 22000,
			},
			{
				code: "A16.07.055",
				name: "Установка углового мультиюнит-абатмента с винтовой фиксацией",
				toothNumber: "34, 32, 42, 44",
				quantity: 4,
				unitPriceRub: 14000,
				discountRub: 5600,
				totalRub: 50400,
				patientSavingsRub: 5600,
			},
			{
				code: "A16.07.023",
				name: "Несъемный адаптационный мостовидный протез All-on-4 (армированный)",
				toothNumber: "Нижняя челюсть",
				quantity: 1,
				unitPriceRub: 95000,
				discountRub: 10000,
				totalRub: 85000,
				patientSavingsRub: 10000,
			},
			{
				code: "B01.065.007",
				name: "Анестезиологическое пособие (инфильтрационная/проводниковая)",
				toothNumber: "—",
				quantity: 4,
				unitPriceRub: 1800,
				discountRub: 0,
				totalRub: 7200,
				patientSavingsRub: 0,
			},
		],
		totalGrossRub: 378000,
		totalDiscountRub: 37600,
		totalNetRub: 340600,
		patientSavingsRub: 37600,
	},

	total_rehab: {
		id: "total_rehab",
		title: "Тотальная эстетическая реабилитация (Керамика)",
		category: "total_rehab",
		categoryLabel: "Ортопедия & Гнатология",
		roleKey: "orthopedist",
		patientName: "Кузнецов Михаил Юрьевич",
		patientAge: 46,
		diagnosisText: "Генерализованная патологическая стираемость твердых тканей зубов II степени, снижение прикуса",
		diagnosisIcd10: "K03.0",
		doctorName: "Д-р Орлов А. В.",
		summary: "Восстановление высоты прикуса с использованием депрограмматора Койса, препарирование под микроскопом, изготовление 28 цельнокерамических коронок и накладок E-max VITA A2.",
		media: [
			{
				id: "m_rehab_photo",
				title: "Фотопротокол улыбки До/После",
				type: "photo_before_after",
				beforeLabel: "Стертые режущие края, темные зубы",
				afterLabel: "Идеальная дуга улыбки VITA A2",
				beforeDesc: "Потеря 3.5 мм окклюзионной высоты, эстетический дискомфорт",
				afterDesc: "Восстановлена клыковая направляющая, гармоничные пропорции 78%",
			},
			{
				id: "m_rehab_ct",
				title: "КТ срез ВНЧС (Суставы)",
				type: "ct_slice",
				beforeLabel: "Компрессия суставной щели справа",
				afterLabel: "Центрированное положение мыщелков",
				beforeDesc: "Сужение суставной щели до 1.1 мм, щелканье при открывании рта",
				afterDesc: "Симметричное физиологическое положение головок в суставных ямках",
				currentSlice: 24,
				totalSlices: 48,
				boneDensityHounsfield: 680,
			},
		],
		stages: [
			{
				id: "st_rehab_1",
				stageNumber: 1,
				title: "Сплинт-терапия и депрограммация",
				specialty: "therapy",
				specialtyRu: "Гнатология",
				status: "completed",
				doctorName: "Д-р Орлов А. В.",
				durationDays: 21,
				clinicalDescription: "Ношение миорелаксирующей каппы, расслабление жевательных мышц, фиксация центрального соотношения.",
				nomenclatureCodes: ["A16.07.082"],
				stageCostRub: 45000,
			},
			{
				id: "st_rehab_2",
				stageNumber: 2,
				title: "Восковое моделирование Wax-up / Mock-up",
				specialty: "orthopedics",
				specialtyRu: "Моделирование",
				status: "completed",
				doctorName: "Д-р Орлов А. В.",
				durationDays: 7,
				clinicalDescription: "Примерка формы будущих зубов во рту из композита Protemp 4, согласование эстетики с пациентом.",
				nomenclatureCodes: ["A02.07.010.001"],
				stageCostRub: 35000,
			},
			{
				id: "st_rehab_3",
				stageNumber: 3,
				title: "Препарирование и фиксация E-max",
				specialty: "orthopedics",
				specialtyRu: "Ортопедия",
				status: "in_progress",
				doctorName: "Д-р Орлов А. В.",
				durationDays: 14,
				clinicalDescription: "Микропрепарирование эмали 0.3-0.5 мм, фиксация 28 керамических реставраций на Variolink Esthetic.",
				nomenclatureCodes: ["A16.07.004", "A16.07.003"],
				stageCostRub: 560000,
			},
		],
		financialItems: [
			{
				code: "A16.07.004",
				name: "Коронка цельнокерамическая E-max CAD (28 ед.)",
				toothNumber: "17-47",
				quantity: 28,
				unitPriceRub: 24000,
				discountRub: 67200,
				totalRub: 604800,
				patientSavingsRub: 67200,
			},
			{
				code: "A16.07.082",
				name: "Индивидуальный окклюзионный сплинт (шина)",
				toothNumber: "ВЧ",
				quantity: 1,
				unitPriceRub: 45000,
				discountRub: 5000,
				totalRub: 40000,
				patientSavingsRub: 5000,
			},
		],
		totalGrossRub: 717000,
		totalDiscountRub: 72200,
		totalNetRub: 644800,
		patientSavingsRub: 72200,
	},

	orthodontics: {
		id: "orthodontics",
		title: "Ортодонтическая коррекция элайнерами Spark",
		category: "orthodontics",
		categoryLabel: "Ортодонтия & Элайнеры",
		roleKey: "orthodontist",
		patientName: "Волкова Екатерина Дмитриевна",
		patientAge: 27,
		diagnosisText: "Дистальный прикус (Angle II класс), сужение зубных рядов, скученность резцов 12-22",
		diagnosisIcd10: "K07.2",
		doctorName: "Д-р Морозова Е. И.",
		summary: "Курс элайнеров Spark Advanced (30 кап): капа 12 из 30, фиксация аттачментов на 14, 13, 23, 24, интерпроксимальная сепарация 0.2 мм.",
		media: [
			{
				id: "m_ortho_photo",
				title: "Прогресс перемещения зубов (Капа 12/30)",
				type: "photo_before_after",
				beforeLabel: "Исходная скученность резцов",
				afterLabel: "Результат на 12-й неделе",
				beforeDesc: "Поворот зуба 12 на 25°, дефицит места 4 мм",
				afterDesc: "Устранена ротация резцов, выравнивание зубной дуги на 60%",
			},
			{
				id: "m_ortho_visio",
				title: "ТРГ снимок головы (Цефалометрия)",
				type: "xray_visio",
				beforeLabel: "ТРГ до лечения (Angle II/1)",
				afterLabel: "Контрольная ТРГ",
				beforeDesc: "Угол ANB 5.2°, протрузия резцов верхней челюсти",
				afterDesc: "Нормализация наклона резцов к базису челюсти",
			},
		],
		stages: [
			{
				id: "st_ortho_1",
				stageNumber: 1,
				title: "3D сетап Spark Approver",
				specialty: "orthodontics",
				specialtyRu: "Планирование",
				status: "completed",
				doctorName: "Д-р Морозова Е. И.",
				durationDays: 7,
				clinicalDescription: "Цифровой расчет пошагового перемещения зубов с визуализацией конечного результата.",
				nomenclatureCodes: ["A02.07.010"],
				stageCostRub: 25000,
			},
			{
				id: "st_ortho_2",
				stageNumber: 2,
				title: "Фиксация аттачментов и старт кап",
				specialty: "orthodontics",
				specialtyRu: "Ортодонтия",
				status: "completed",
				doctorName: "Д-р Морозова Е. И.",
				durationDays: 1,
				clinicalDescription: "Установка 8 композитных аттачментов Filtek Ultimate, выдача кап с 1 по 8.",
				nomenclatureCodes: ["A16.07.047"],
				stageCostRub: 18000,
			},
			{
				id: "st_ortho_3",
				stageNumber: 3,
				title: "Активная фаза: капы 9-20 (IPR)",
				specialty: "orthodontics",
				specialtyRu: "Ортодонтия",
				status: "in_progress",
				doctorName: "Д-р Морозова Е. И.",
				durationDays: 70,
				clinicalDescription: "Контрольный осмотр каждые 4 недели, сепарация контактных пунктов 0.2 мм, ношение эластиков.",
				nomenclatureCodes: ["A16.07.049"],
				stageCostRub: 195000,
			},
		],
		financialItems: [
			{
				code: "A16.07.048",
				name: "Ортодонтическое лечение с применением элайнеров Spark Advanced (полный курс)",
				toothNumber: "Обе челюсти",
				quantity: 1,
				unitPriceRub: 280000,
				discountRub: 35000,
				totalRub: 245000,
				patientSavingsRub: 35000,
			},
		],
		totalGrossRub: 280000,
		totalDiscountRub: 35000,
		totalNetRub: 245000,
		patientSavingsRub: 35000,
	},

	therapy_endo: {
		id: "therapy_endo",
		title: "Лечение кариеса 16 MOD и пульпита 36 под микроскопом",
		category: "therapy_endo",
		categoryLabel: "Терапия & Эндодонтия",
		roleKey: "therapist",
		patientName: "Смирнова Анна Сергеевна",
		patientAge: 32,
		diagnosisText: "Глубокий кариес дентина 16 (MOD), острый необратимый пульпит 36 (MO)",
		diagnosisIcd10: "K02.1, K04.0",
		doctorName: "Д-р Соколов А. В.",
		summary: "Изоляция коффердамом Sanctuary, препарирование кариеса 16 твердосплавными борами, реставрация Ceram.x Spectra ST; механическая обработка 3 каналов 36 никель-титановыми файлами ProTaper Gold, обтурация гуттаперчей методом вертикальной конденсации.",
		media: [
			{
				id: "m_endo_visio",
				title: "Прицельная радиовизиография 36",
				type: "xray_visio",
				beforeLabel: "Снимок до лечения: разрежение кости",
				afterLabel: "Контроль обтурации каналов до апекса",
				beforeDesc: "Глубокая кариозная полость, сообщение с пульповой камерой",
				afterDesc: "3 корневых канала плотно обтурированы гуттаперчей до физиологического апекса",
			},
			{
				id: "m_endo_photo",
				title: "Фотопротокол реставрации 16 под микроскопом",
				type: "photo_before_after",
				beforeLabel: "Кариозная полость MOD",
				afterLabel: "Анатомическая реставрация Ceram.x",
				beforeDesc: "Размягченный пигментированный дентин на дне полости",
				afterDesc: "Восстановлены фиссуры 1-го и 2-го порядка, контактные пункты плотные",
			},
		],
		stages: [
			{
				id: "st_endo_1",
				stageNumber: 1,
				title: "Изоляция и реставрация зуба 16",
				specialty: "therapy",
				specialtyRu: "Терапия",
				status: "completed",
				doctorName: "Д-р Соколов А. В.",
				durationDays: 1,
				clinicalDescription: "Коффердам, лечебная прокладка Theracal LC, послойная реставрация нанокомпозитом.",
				nomenclatureCodes: ["A16.07.002.001", "A16.07.002.011"],
				stageCostRub: 8600,
			},
			{
				id: "st_endo_2",
				stageNumber: 2,
				title: "Эндодонтия зуба 36 под микроскопом",
				specialty: "therapy",
				specialtyRu: "Эндодонтия",
				status: "in_progress",
				doctorName: "Д-р Соколов А. В.",
				durationDays: 3,
				clinicalDescription: "Ирригация гипохлоритом натрия 3% с ультразвуковой активацией, временная паста Calcept на 7 дней.",
				nomenclatureCodes: ["A16.07.030", "A16.07.008"],
				stageCostRub: 14200,
			},
		],
		financialItems: [
			{
				code: "A16.07.002.011",
				name: "Восстановление зуба пломбой (кариес MOD, светоотверждаемый композит)",
				toothNumber: 16,
				quantity: 1,
				unitPriceRub: 5200,
				discountRub: 0,
				totalRub: 5200,
				patientSavingsRub: 0,
			},
			{
				code: "A16.07.002.001",
				name: "Наложение лечебной прокладки Theracal LC",
				toothNumber: 16,
				quantity: 1,
				unitPriceRub: 1100,
				discountRub: 0,
				totalRub: 1100,
				patientSavingsRub: 0,
			},
			{
				code: "B01.065.007",
				name: "Анестезия инфильтрационная (Ubistesin Forte)",
				toothNumber: 16,
				quantity: 1,
				unitPriceRub: 1300,
				discountRub: 0,
				totalRub: 1300,
				patientSavingsRub: 0,
			},
			{
				code: "A16.07.091",
				name: "Использование коффердама (раббердама)",
				toothNumber: 16,
				quantity: 1,
				unitPriceRub: 1000,
				discountRub: 0,
				totalRub: 1000,
				patientSavingsRub: 0,
			},
		],
		totalGrossRub: 8600,
		totalDiscountRub: 0,
		totalNetRub: 8600,
		patientSavingsRub: 0,
	},
};
