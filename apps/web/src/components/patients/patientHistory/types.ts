/**
 * apps/web/src/components/patients/patientHistory/types.ts
 *
 * DENTE Dental CRM — Типы данных и DTO для клинического таймлайна истории пациента.
 * Layer 0: Чистые интерфейсы и контракты без побочных эффектов.
 */

import type { Appointment, Dashboard } from "@dental/shared";

export type ClinicalSpecialty =
	| "all"
	| "therapy"
	| "surgery"
	| "orthopedics"
	| "hygiene"
	| "orthodontics";

export interface SpecialtyFilterOption {
	id: ClinicalSpecialty;
	label: string;
}

export const SPECIALTY_FILTERS: SpecialtyFilterOption[] = [
	{ id: "all", label: "Все" },
	{ id: "therapy", label: "Терапия" },
	{ id: "surgery", label: "Хирургия & Имплантация" },
	{ id: "orthopedics", label: "Ортопедия" },
	{ id: "hygiene", label: "Профгигиена" },
	{ id: "orthodontics", label: "Ортодонтия" },
];

export interface ClinicalMaterialItem {
	name: string;
	quantity: number;
	unit: string;
}

export interface ClinicalAttachedScan {
	id?: string;
	title: string;
	previewUrl: string;
	kind: string;
	tooth?: string | null;
}

export interface ClinicalVisitItem {
	id: string;
	date: string; // ISO or DD.MM.YYYY
	time?: string | undefined;
	year: number;
	monthNumber: number;
	monthNameRu: string;
	toothNumber?: string | null | undefined;
	diagnosisCode: string;
	diagnosisTitle: string;
	doctorName: string;
	specialty: ClinicalSpecialty;
	specialtyLabelRu: string;
	amountRub: number;
	isPaid: boolean;
	paymentStatus: "paid" | "partial" | "scheduled" | "unpaid";
	warrantyUntil?: string | null | undefined;
	warrantyStatus?: "active" | "expired" | "not_applicable" | undefined;
	complaints?: string | undefined;
	anamnesis?: string | undefined;
	statusLocalis?: string | undefined;
	treatmentProtocol?: string | undefined;
	recommendations?: string | undefined;
	materialsDeducted?: ClinicalMaterialItem[] | undefined;
	attachedScan?: ClinicalAttachedScan | null | undefined;
	attachedScans?: ClinicalAttachedScan[] | undefined;
	isSigned?: boolean | undefined;
}

/** Алиас для соответствия спецификации таймлайна событий */
export type HistoryTimelineItem = ClinicalVisitItem;

export interface HistoryTimelineGroup {
	monthKey: string;
	monthNameRu: string;
	year: number;
	monthNumber: number;
	totalAmountRub: number;
	items: ClinicalVisitItem[];
}

export interface PatientHistoryFinancialSummaryData {
	totalBilledRub: number;
	totalPaidRub: number;
	totalPendingRub: number;
	visitsCount: number;
	warrantiesCount: number;
}

/** Корневой селектор вкладки: data-testid="patient-history-timeline-tab" */
export const PATIENT_HISTORY_TIMELINE_TAB_TEST_ID = "patient-history-timeline-tab";

export interface PatientHistoryTabProps {
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	visits?: ClinicalVisitItem[] | undefined;
	dashboard?: Dashboard | null | undefined;
	onNavigateToVisit?: ((visitId: string) => void) | undefined;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	onPrintProtocol?: ((visit: ClinicalVisitItem) => void) | undefined;
	onExtract043?: ((visit: ClinicalVisitItem) => void) | undefined;
	onAddToTreatmentPlan?: ((visit: ClinicalVisitItem) => void) | undefined;
	className?: string | undefined;
}

export const DEFAULT_CLINICAL_VISITS: ClinicalVisitItem[] = [
	{
		id: "vis-101",
		date: "2026-10-12T14:30:00",
		time: "14:30",
		year: 2026,
		monthNumber: 10,
		monthNameRu: "Октябрь 2026",
		toothNumber: "16",
		diagnosisCode: "K02.1",
		diagnosisTitle: "Кариес дентина (средний)",
		doctorName: "Др. Иванов А.С.",
		specialty: "therapy",
		specialtyLabelRu: "Терапия",
		amountRub: 7500,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "10.2027",
		warrantyStatus: "active",
		complaints: "Кратковременная ноющая боль от холодного и сладкого в области верхнего правого коренного зуба 16.",
		anamnesis: "Соматически здоров. Аллергоанамнез не отягощен. Зуб ранее не лечен, боль появилась 2 недели назад.",
		statusLocalis: "Зуб 16: глубокая кариозная полость на жевательно-медиальной поверхности (MOD), дентин пигментирован, размягчен. Зондирование по эмалево-дентинной границе чувствительно, перкуссия безболезненна. Термопроба + (быстро проходит).",
		treatmentProtocol: "Инфильтрационная анестезия Sol. Ultracaini DS 1:200 000 — 1.7 мл. Изоляция системой коффердам (кламп #W8A). Препарирование кариозной полости, некрэктомия твердосплавным бором. Медикаментозная обработка 2% раствором хлоргексидина. Спиртовой протокол. Протравливание эмали 37% ортофосфорной кислотой 15 сек. Адгезивная система OptiBond FL. Послойная анатомическая реставрация нанокомпозитом Estelite Asteria (оттенки A3B, OcE). Полировка головками Enhance и пастой Prisma Gloss. Окклюзионный контроль артикуляционной бумагой Bausch 40 мкм.",
		recommendations: "Щадящая диета на 2 часа. Соблюдение гигиены полости рта. Плановый контрольный осмотр через 6 месяцев.",
		materialsDeducted: [
			{ name: "Ультракаин Д-С 1:200 000 (1.7 мл)", quantity: 1, unit: "карп." },
			{ name: "Игла карпульная 30G (0.3x21 мм)", quantity: 1, unit: "шт." },
			{ name: "Коффердам латексный Sanctuary", quantity: 1, unit: "шт." },
			{ name: "Estelite Asteria нанокомпозит", quantity: 0.25, unit: "г" },
			{ name: "OptiBond FL адгезив 2-этапный", quantity: 1, unit: "доза" },
		],
		attachedScan: {
			title: "Прицельный снимок RVG зуба 16 (контроль реставрации)",
			previewUrl: "/radiology/sample_rvg_tooth16.jpg",
			kind: "RVG",
			tooth: "16",
		},
		attachedScans: [
			{
				title: "Прицельный снимок RVG зуба 16",
				previewUrl: "/radiology/sample_rvg_tooth16.jpg",
				kind: "RVG",
				tooth: "16",
			},
			{
				title: "Окклюзионный фотопротокол 16",
				previewUrl: "/radiology/sample_rvg_tooth16.jpg",
				kind: "ФОТО",
				tooth: "16",
			},
		],
		isSigned: true,
	},
	{
		id: "vis-102",
		date: "2026-10-05T11:00:00",
		time: "11:00",
		year: 2026,
		monthNumber: 10,
		monthNameRu: "Октябрь 2026",
		toothNumber: null,
		diagnosisCode: "K03.6",
		diagnosisTitle: "Зубные отложения (над- и поддесневые)",
		doctorName: "Смирнова А.В.",
		specialty: "hygiene",
		specialtyLabelRu: "Профгигиена",
		amountRub: 5500,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: null,
		warrantyStatus: "not_applicable",
		complaints: "Кровоточивость десен при чистке зубов, пигментированный налет от кофе и чая.",
		anamnesis: "Регулярная гигиена 1 раз в 8 месяцев. Соматически здорова.",
		statusLocalis: "Слизистая оболочка бледно-розовая, десневой сосочек в области нижних резцов гиперемирован. Обильный наддесневой зубной камень на оральной поверхности 31-42, пигментированный налет на молярах.",
		treatmentProtocol: "Индикация зубного налета Curaprox. Ультразвуковой скейлинг Woodpecker с ирригацией хлоргексидином. Обработка аппаратом Air-Flow порошком на основе глицина (EMS). Полировка всех поверхностей щеточками и пастой Cleanic. Аппликация реминерализующего геля GC Tooth Mousse в индивидуальной капе 10 минут. Обучение стандартному методу чистки зубов.",
		recommendations: "Смена зубной щетки на мягкую (Curaprox 5460). Использование межзубных ершиков. Контрольный осмотр через 6 месяцев.",
		materialsDeducted: [
			{ name: "Порошок для Air-Flow на основе глицина", quantity: 1, unit: "пакет" },
			{ name: "Паста полировочная Cleanic", quantity: 1, unit: "доза" },
			{ name: "Гель GC Tooth Mousse", quantity: 1, unit: "доза" },
			{ name: "Набор смотровой одноразовый", quantity: 1, unit: "компл." },
		],
		attachedScan: null,
		isSigned: true,
	},
	{
		id: "vis-103",
		date: "2026-05-20T16:15:00",
		time: "16:15",
		year: 2026,
		monthNumber: 5,
		monthNameRu: "Май 2026",
		toothNumber: "36",
		diagnosisCode: "K04.0",
		diagnosisTitle: "Острый очаговый пульпит",
		doctorName: "Др. Иванов А.С.",
		specialty: "therapy",
		specialtyLabelRu: "Терапия",
		amountRub: 14200,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "05.2028",
		warrantyStatus: "active",
		complaints: "Острая приступообразная самопроизвольная боль, усиливающаяся в ночное время, иррадиирует в ухо.",
		anamnesis: "Боль возникла 2 дня назад. Прием анальгетиков дает кратковременный эффект.",
		statusLocalis: "Зуб 36: глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование в точке сообщения резко болезненно. Перкуссия слабо чувствительна. ЭОД 35 мкА.",
		treatmentProtocol: "Проводниковая мандибулярная анестезия Sol. Ultracaini Forte 1:100 000 — 1.7 мл. Изоляция коффердамом. Раскрытие полости зуба, ампутация и экстирпация пульпы из 3 каналов (МБ, МЯ, Д) под микроскопом Leica. Прохождение и инструментальная обработка ProTaper Gold до F2. Ирригация 3% NaOCl с УЗ-активацией, экспозиция 20 мин. Сушка бумажными штифтами. Трехмерная обтурация горячей гуттаперчей на носителе с герметиком AH Plus. Рентген-контроль. Временная герметичная пломба светового отверждения Clip.",
		recommendations: "Назначен повторный приём через 3 дня для постоянного восстановления коронковой части зуба 36 керамической накладкой Overlay.",
		materialsDeducted: [
			{ name: "Ультракаин Форте 1:100 000 (1.7 мл)", quantity: 1, unit: "карп." },
			{ name: "Файлы эндодонтические ProTaper Gold F2", quantity: 3, unit: "шт." },
			{ name: "Гуттаперчевые штифты конусные", quantity: 3, unit: "шт." },
			{ name: "Силер эпоксидный AH Plus", quantity: 1, unit: "доза" },
		],
		attachedScan: {
			title: "Контрольная радиовизиография обтурации каналов зуба 36",
			previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
			kind: "RVG",
			tooth: "36",
		},
		attachedScans: [
			{
				title: "Радиовизиография обтурации 36",
				previewUrl: "/radiology/sample_rvg_tooth36_periapical.jpg",
				kind: "RVG",
				tooth: "36",
			},
		],
		isSigned: true,
	},
	{
		id: "vis-104",
		date: "2026-05-12T12:00:00",
		time: "12:00",
		year: 2026,
		monthNumber: 5,
		monthNameRu: "Май 2026",
		toothNumber: "46",
		diagnosisCode: "K08.1",
		diagnosisTitle: "Потеря зуба (частичная адентия)",
		doctorName: "Ковалёв Д.И.",
		specialty: "surgery",
		specialtyLabelRu: "Хирургия & Имплантация",
		amountRub: 48000,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "Пожизненная",
		warrantyStatus: "active",
		complaints: "Отсутствие зуба 46, затрудненное пережевывание твердой пищи справа.",
		anamnesis: "Зуб 46 удален 8 месяцев назад по поводу периодонтита. Соматический статус без противопоказаний к дентальной имплантации.",
		statusLocalis: "В области отсутствующего зуба 46 альвеолярный отросток достаточной ширины (7.8 мм) и высоты (13.5 мм по данным КЛКТ). Слизистая оболочка интактна.",
		treatmentProtocol: "Торусальная и инфильтрационная анестезия Sol. Ultracaini DS Forte — 2.0 мл. Линейный разрез по гребню, отслаивание слизисто-надкостничного лоскута. Формирование ложа сверлами Straumann с обильным охлаждением физраствором. Установка премиального дентального имплантата Straumann BLX 4.0 x 10 мм. Первичная стабильность (торк) 38 Н/см. Установка винта-заглушки. Ушивание раны без натяжения монофиламентной нитью Prolene 5-0.",
		recommendations: "Холод на щеку 15 мин x 3 раза. Ванночки с 0.05% хлоргексидином 3 раза в день. Антибиотикопрофилактика (Амоксиклав 625 мг 2 раза в день 5 дней). Снятие швов через 10 дней.",
		materialsDeducted: [
			{ name: "Имплантат Straumann BLX 4.0x10 мм SLActive", quantity: 1, unit: "шт." },
			{ name: "Винт-заглушка Straumann", quantity: 1, unit: "шт." },
			{ name: "Шовный материал Prolene 5-0 (Ethicon)", quantity: 1, unit: "шт." },
			{ name: "Ультракаин Форте 1:100 000", quantity: 2, unit: "карп." },
		],
		attachedScan: {
			title: "Контрольная 3D КЛКТ позиционирования имплантата 46",
			previewUrl: "/radiology/sample_rvg_pathology.jpg",
			kind: "CBCT",
			tooth: "46",
		},
		attachedScans: [
			{
				title: "3D КЛКТ позиционирования 46",
				previewUrl: "/radiology/sample_rvg_pathology.jpg",
				kind: "CBCT",
				tooth: "46",
			},
			{
				title: "Панорамная томограмма ОПТГ",
				previewUrl: "/radiology/sample_rvg_pathology.jpg",
				kind: "ОПТГ",
				tooth: "46",
			},
		],
		isSigned: true,
	},
	{
		id: "vis-105",
		date: "2025-11-18T15:00:00",
		time: "15:00",
		year: 2025,
		monthNumber: 11,
		monthNameRu: "Ноябрь 2025",
		toothNumber: "21",
		diagnosisCode: "K07.2",
		diagnosisTitle: "Дефект твердых тканей, скол коронки",
		doctorName: "Соколова Е.М.",
		specialty: "orthopedics",
		specialtyLabelRu: "Ортопедия",
		amountRub: 35000,
		isPaid: true,
		paymentStatus: "paid",
		warrantyUntil: "11.2028",
		warrantyStatus: "active",
		complaints: "Эстетический дефект центрального резца 21, скол режущего края.",
		anamnesis: "Травма в анамнезе (бытовой скол 3 года назад). Зуб ранее эндодонтически пролечен.",
		statusLocalis: "Зуб 21: дефект коронковой части более 50%, изменение цвета в темно-серый оттенок. Периапикальные ткани без патологических изменений.",
		treatmentProtocol: "Препарирование зуба 21 под циркониевую коронку с круговым уступом 0.8 мм. Ретракция десны нитью Ultrapak #000. Цифровое интраоральное сканирование сканером Medit i700. Изготовление и фиксация временной коронки Protemp 4 на бетаметазоновый цемент Temp-Bond NE. Лабораторный наряд ЗТЛ на коронку из диоксида циркония (цвет A2 по VITA Classical).",
		recommendations: "Избегать откусывания жесткой пищи на временную коронку. Примерка постоянной циркониевой коронки через 5 дней.",
		materialsDeducted: [
			{ name: "Ретракционная нить Ultrapak #000", quantity: 1, unit: "доза" },
			{ name: "Композит для временных коронок Protemp 4", quantity: 1, unit: "доза" },
			{ name: "Временный цемент Temp-Bond NE", quantity: 1, unit: "доза" },
		],
		attachedScan: null,
		isSigned: true,
	},
];
