/**
 * demoClinicalCases.ts
 *
 * Глубокая клиническая проработка демонстрационных сценариев для 5 ролей (МАНДАТ 8y & МАНДАТ 8n):
 * 1. Терапевт: реальный пациент в кресле (Смирнова А. С.), зубная формула (кариес 16 MOD, пломба 24 O, пульпит 36 MO),
 *    дневник приёма SOAP по форме 043/у и смета лечения.
 * 2. Ортопед: наряд-заказ в ЗТЛ (коронка из диоксида циркония на 11, шкала VITA A2, этапы, оттиски, даты сдачи).
 * 3. Ортодонт: карта прикуса (дистальный прикус, скученность 12-22), элайнеры (капа 12 из 30), фиксация аттачментов.
 * 4. Хирург: план имплантации (зуб 46, имплант Straumann BLX 4.5x10, торк 35 Н·см), протокол анестезии, согласие ИДС.
 * 5. Главврач / Владелец: живой дашборд с реальной аналитикой (выручка 2.45М ₽, загрузка 3 кресел 78%, средний чек 6 200 ₽,
 *    сдельная зарплата врачей).
 */

export interface DemoOdontogramToothState {
	toothNumber: number;
	state: "caries" | "filling" | "pulpitis" | "periodontitis" | "crown" | "implant" | "missing" | "ortho_movement" | "attachment" | "healthy";
	surfaces?: string[];
	diagnosisCode?: string;
	titleRu: string;
	clinicalNote: string;
	color: string;
}

export interface DemoEstimateItem {
	code: string;
	name: string;
	toothNumber?: number;
	quantity: number;
	unitPriceRub: number;
	discountRub: number;
	totalRub: number;
}

export interface DemoEstimate {
	estimateNumber: string;
	patientId: string;
	patientName: string;
	doctorId: string;
	doctorName: string;
	dateIso: string;
	items: DemoEstimateItem[];
	totalGrossRub: number;
	totalDiscountRub: number;
	totalNetRub: number;
	status: "draft" | "approved" | "completed";
}

export interface DemoSoapDiary {
	visitId: string;
	patientId: string;
	dateIso: string;
	complaints: string;
	anamnesis: string;
	statusLocalis: string;
	diagnosisIcd10: string;
	diagnosisTooth: string;
	treatmentProtocol: string;
	recommendations: string;
	signedByDoctorName: string;
}

export interface DemoLabOrderCase {
	orderNumber: string;
	patientId: string;
	patientName: string;
	doctorName: string;
	labName: string;
	technicianName: string;
	toothFdi: number;
	constructionTypeRu: string;
	materialRu: string;
	vitaShade: string;
	stumpShade: string;
	sentDateIso: string;
	tryInDateIso: string;
	finalDeliveryDateIso: string;
	currentStageRu: string;
	currentStageIndex: number;
	totalStagesCount: number;
	patientPriceRub: number;
	labCostRub: number;
	doctorCommissionRub: number;
	digitalScanFile: string;
	clinicalNotes: string;
}

export interface DemoOrthoCase {
	patientId: string;
	patientName: string;
	doctorName: string;
	biteDiagnosisRu: string;
	angleClass: string;
	systemType: string;
	currentAlignerTray: number;
	totalAlignerTrays: number;
	progressPercent: number;
	attachmentTeeth: number[];
	iprProtocolRu: string;
	elasticsProtocolRu: string;
	nextVisitDateIso: string;
	photoProtocolCount: number;
	clinicalNotes: string;
}

export interface DemoSurgeonCase {
	patientId: string;
	patientName: string;
	doctorName: string;
	toothNumber: number;
	implantSystemRu: string;
	implantSizeRu: string;
	insertionTorqueNcm: number;
	stabilityIsq: number;
	boneDensityMisch: string;
	anesthesiaProtocolRu: string;
	surgicalProtocolRu: string;
	healingAbutmentSizeRu: string;
	sutureMaterialRu: string;
	consentSigned: boolean;
	consentFormNameRu: string;
	medicationPostOpRu: string[];
}

export interface DemoExecutiveKpiCase {
	periodName: string;
	monthRevenueFactRub: number;
	monthRevenuePlanRub: number;
	revenueExecutionPercent: number;
	chairOccupancyRatePercent: number;
	chair1OccupancyPercent: number;
	chair2OccupancyPercent: number;
	chair3OccupancyPercent: number;
	averageCheckRub: number;
	primaryConsultationsCount: number;
	acceptedTreatmentPlansCount: number;
	consultationToPlanConversionPercent: number;
	doctorPayroll: Array<{
		doctorId: string;
		doctorName: string;
		specialtyRu: string;
		revenueRub: number;
		commissionPercent: number;
		pieceworkSalaryRub: number;
	}>;
	totalPayrollRub: number;
	payrollToRevenuePercent: number;
}

export interface DemoBraveryDiploma {
	diplomaNumber: string;
	patientName: string;
	awardedDateIso: string;
	awardReasonRu: string;
	doctorName: string;
	clinicName: string;
}

// ============================================================================
// 1. КЕЙС ТЕРАПЕВТА: Пациент Смирнова А. С., кариес 16, пломба 24, пульпит 36
// ============================================================================
export const DEMO_THERAPIST_ODONTOGRAM: DemoOdontogramToothState[] = [
	{
		toothNumber: 16,
		state: "caries",
		surfaces: ["M", "O", "D"],
		diagnosisCode: "K02.1",
		titleRu: "Глубокий кариес дентина 16",
		clinicalNote: "Кариозная полость на жевательной, медиальной и дистальной поверхностях. Зондирование дна болезненно.",
		color: "var(--danger, #ef4444)",
	},
	{
		toothNumber: 24,
		state: "filling",
		surfaces: ["O"],
		diagnosisCode: "Z96.5",
		titleRu: "Световая пломба 24 (состоятельна)",
		clinicalNote: "Окклюзионная пломба Ceram.x Spectra ST, краевое прилегание идеальное, герметичность сохранена.",
		color: "var(--teal, #0d9488)",
	},
	{
		toothNumber: 36,
		state: "pulpitis",
		surfaces: ["M", "O"],
		diagnosisCode: "K04.0",
		titleRu: "Острый необратимый пульпит 36",
		clinicalNote: "Самопроизвольные ночные боли с иррадиацией. Перкуссия чувствительна. Показана эндодонтия под микроскопом.",
		color: "var(--gold, #f59e0b)",
	},
	{
		toothNumber: 18,
		state: "missing",
		diagnosisCode: "K08.1",
		titleRu: "Адентия зуба 18",
		clinicalNote: "Третий моляр отсутствует (не заложен / удален ранее).",
		color: "var(--muted, #64748b)",
	},
	{
		toothNumber: 28,
		state: "missing",
		diagnosisCode: "K08.1",
		titleRu: "Адентия зуба 28",
		clinicalNote: "Третий моляр отсутствует.",
		color: "var(--muted, #64748b)",
	},
	{
		toothNumber: 38,
		state: "missing",
		diagnosisCode: "K08.1",
		titleRu: "Адентия зуба 38",
		clinicalNote: "Третий моляр отсутствует.",
		color: "var(--muted, #64748b)",
	},
	{
		toothNumber: 48,
		state: "missing",
		diagnosisCode: "K08.1",
		titleRu: "Адентия зуба 48",
		clinicalNote: "Третий моляр отсутствует.",
		color: "var(--muted, #64748b)",
	},
];

export const DEMO_THERAPIST_SOAP_DIARY: DemoSoapDiary = {
	visitId: "01a00000-0000-0000-0001-000000000001",
	patientId: "01a00000-0000-0000-0000-000000000001",
	dateIso: new Date().toISOString(),
	complaints: "Кратковременные боли в правом верхнем жевательном зубе (16) при приёме холодной и сладкой пищи, быстро проходящие после устранения раздражителя.",
	anamnesis: "Кариозную полость пациентка заметила около 2 месяцев назад, за стоматологической помощью не обращалась. Соматически здорова. Аллергоанамнез не отягощен.",
	statusLocalis: "На жевательной, медиальной и дистальной поверхностях зуба 16 обнаружена глубокая кариозная полость, заполненная размягченным пигментированным дентином. Зондирование дна болезненно по эмалево-дентинной границе. Термопроба (холод) положительна, кратковременна. Перкуссия зуба 16 безболезненна. Слизистая оболочка в проекции верхушек корней бледно-розовая, без отека.",
	diagnosisIcd10: "K02.1 Кариес дентина (глубокий кариес зуба 16)",
	diagnosisTooth: "16",
	treatmentProtocol: "Инфильтрационная анестезия Sol. Articaini 1:200 000 1.7 мл. Изоляция операционного поля системой коффердам (кламп №W8A). Препарирование кариозной полости зуба 16 турбинным наконечником с водяным охлаждением, некрэктомия дна твердосплавным бором. Медикаментозная обработка 2% р-ром хлоргексидина биглюконата. Лечебная подкладка на основе МТА в глубокой точке дна, изолирующая прокладка СИЦ Vitrebond. Адгезивный протокол OptiBond FL (тотальное протравливание 37% ортофосфорной кислотой 15 сек). Послойная анатомическая реставрация наногибридным композитом Ceram.x Spectra ST (оттенки A2, A3). Шлифовка и полировка дисками Sof-Lex и головками Enhance с полировочной пастой Prisma Gloss. Контроль окклюзионных контактов копиркой Bausch 40 мкм.",
	recommendations: "Воздержаться от приема красящих продуктов и напитков в течение 24 часов. Плановый контрольный осмотр через 6 месяцев.",
	signedByDoctorName: "Д-р Соколов А. В.",
};

export const DEMO_THERAPIST_ESTIMATE: DemoEstimate = {
	estimateNumber: "СМЕТА-2026-0042",
	patientId: "01a00000-0000-0000-0000-000000000001",
	patientName: "Смирнова Анна Сергеевна",
	doctorId: "01a00000-0000-0000-0003-000000000001",
	doctorName: "Д-р Соколов А. В.",
	dateIso: new Date().toISOString(),
	items: [
		{
			code: "B01.065.001",
			name: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
			quantity: 1,
			unitPriceRub: 1500,
			discountRub: 0,
			totalRub: 1500,
		},
		{
			code: "B01.003.004.004",
			name: "Анестезия инфильтрационная (Артикаин с эпинефрином 1:200 000 1.7 мл)",
			toothNumber: 16,
			quantity: 1,
			unitPriceRub: 900,
			discountRub: 0,
			totalRub: 900,
		},
		{
			code: "A16.07.002.009",
			name: "Наложение изоляционной системы коффердам (раббердам)",
			toothNumber: 16,
			quantity: 1,
			unitPriceRub: 800,
			discountRub: 0,
			totalRub: 800,
		},
		{
			code: "A16.07.002.001",
			name: "Восстановление зуба пломбой (глубокий кариес MOD, нанокомпозит Ceram.x Spectra ST)",
			toothNumber: 16,
			quantity: 1,
			unitPriceRub: 4800,
			discountRub: 0,
			totalRub: 4800,
		},
		{
			code: "A16.07.002.011",
			name: "Полировка и глазурование пломбы из композитного материала",
			toothNumber: 16,
			quantity: 1,
			unitPriceRub: 600,
			discountRub: 0,
			totalRub: 600,
		},
	],
	totalGrossRub: 8600,
	totalDiscountRub: 0,
	totalNetRub: 8600,
	status: "approved",
};

// ============================================================================
// 2. КЕЙС ОРТОПЕДА: Пациент Воронов Д. И., наряд ЗТЛ коронка ZrO2 11, шкала VITA A2
// ============================================================================
export const DEMO_ORTHOPEDIST_LAB_ORDER: DemoLabOrderCase = {
	orderNumber: "ЗТЛ-2026-111",
	patientId: "01a00000-0000-0000-0000-000000000002",
	patientName: "Воронов Дмитрий Игоревич",
	doctorName: "Д-р Орлов А. В. (Ортопед)",
	labName: "CAD/CAM Центр Дентал-Мастер",
	technicianName: "Техник Соколов М. И.",
	toothFdi: 11,
	constructionTypeRu: "Одиночная анатомическая коронка",
	materialRu: "Диоксид циркония Katana HTML (Multi-Layer)",
	vitaShade: "A2",
	stumpShade: "ND2",
	sentDateIso: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
	tryInDateIso: new Date().toISOString().slice(0, 10),
	finalDeliveryDateIso: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
	currentStageRu: "Примерка каркаса / в бисквите",
	currentStageIndex: 4,
	totalStagesCount: 7,
	patientPriceRub: 28000,
	labCostRub: 8500,
	doctorCommissionRub: 5600,
	digitalScanFile: "scans/patient_voronov_upper_jaw_11.stl",
	clinicalNotes: "Интраоральный 3D скан (Medit i700). Круговой плечевой уступ 0.8 мм. Расцветка VITA classical A2: пришеечная треть A3, тело A2, режущий край эмалевый полупрозрачный Translucent с легким мамелоновым эффектом. Прикус фиксирован в центральном соотношении.",
};

// ============================================================================
// 3. КЕЙС ОРТОДОНТА: Пациент Ковалева Е. П., элайнеры 12 из 30, аттачменты
// ============================================================================
export const DEMO_ORTHODONTIST_CASE: DemoOrthoCase = {
	patientId: "01a00000-0000-0000-0000-000000000003",
	patientName: "Ковалева Елена Павловна",
	doctorName: "Д-р Морозова Е. И. (Ортодонт)",
	biteDiagnosisRu: "Дистальная окклюзия (II класс 1 подкласс по Энглю). Скученное положение резцов верхней и нижней челюсти 12, 11, 21, 22. Сужение верхнего зубного ряда.",
	angleClass: "Класс II, подкласс 1",
	systemType: "Элайнеры Spark Clear Aligners (30 капп)",
	currentAlignerTray: 12,
	totalAlignerTrays: 30,
	progressPercent: 40,
	attachmentTeeth: [14, 13, 23, 24],
	iprProtocolRu: "Выполнена интерпроксимальная сепарация эмали (IPR) контактных пунктов 11-21 на 0.2 мм и 21-22 на 0.15 мм алмазным сепарационным штрипсом под контролем калибра.",
	elasticsProtocolRu: "Назначено ношение межчелюстных эластиков II класса (размер 1/4\", сила 4.5 oz) для ночного ношения между кнопками на 13-46 и 23-36.",
	nextVisitDateIso: new Date(Date.now() + 28 * 86400000).toISOString().slice(0, 10),
	photoProtocolCount: 5,
	clinicalNotes: "Контроль динамики перемещения зубов. Капа №11 отработала в полном объеме, трекинг идеальный. Проведена фиксация композитных аттачментов на зубы 14, 13, 23, 24 по шаблону-переносчику с адгезивом Transbond XT. Выданы комплекты капп №12, №13, №14 с интервалом ношения 14 дней на каждую капу (не менее 22 часов в сутки).",
};

// ============================================================================
// 4. КЕЙС ХИРУРГА: Пациент Кузнецов М. В., имплантация 46 Straumann BLX 4.5x10, торк 35
// ============================================================================
export const DEMO_SURGEON_CASE: DemoSurgeonCase = {
	patientId: "01a00000-0000-0000-0000-000000000004",
	patientName: "Кузнецов Михаил Викторович",
	doctorName: "Д-р Громов К. Д. (Хирург-имплантолог)",
	toothNumber: 46,
	implantSystemRu: "Straumann BLX Roxolid SLActive",
	implantSizeRu: "Ø 4.5 мм × 10 мм",
	insertionTorqueNcm: 35,
	stabilityIsq: 74,
	boneDensityMisch: "D2 (плотная кортикальная пластинка, трабекулярная кость)",
	anesthesiaProtocolRu: "Мандибулярная (проводниковая) анестезия Sol. Ubistesini forte 1:100 000 1.7 мл + дополнительная инфильтрация по переходной складке 0.8 мл. Наступление глубокой анестезии через 4 минуты.",
	surgicalProtocolRu: "Разрез по гребню альвеолярного отростка в области отсутствующего зуба 46 с сохранением прикрепленной кератинизированной десны. Скелетирование гребня с отслаиванием слизисто-надкостничного лоскута. Подготовка костного ложа фрезами с ирригацией охлажденным физраствором 4°C. Установка импланта Straumann BLX Ø 4.5x10 мм с финальным торком 35 Н·см. Первичная стабильность проверена прибором Osstell (ISQ 74). Установлен формирователь десны Ø 5.0 мм высотой 3.0 мм. Рана ушита монофиламентом Prolene 5-0 (4 узловых шва). Гемостаз полный.",
	healingAbutmentSizeRu: "Формирователь десны Ø 5.0 мм, высота 3.0 мм",
	sutureMaterialRu: "Prolene 5-0 монофиламент (4 узловых шва)",
	consentSigned: true,
	consentFormNameRu: "Информированное добровольное согласие на операцию дентальной имплантации (Форма ИДС-ХИР-1051н)",
	medicationPostOpRu: [
		"Амоксиклав 875+125 мг по 1 таб 2 раза в день — 5 дней",
		"Нимесил 100 мг по 1 пакетику при болях (не более 2 раз в день)",
		"Ротовые ванночки с р-ром Хлоргексидина 0.05% со 2-х суток 3 раза в день",
		"Прикладывание сухого холода на область щеки по 15 мин с перерывами в первый день",
		"Явка на контрольный осмотр и снятие швов через 10 дней",
	],
};

// ============================================================================
// 5. КЕЙС ГЛАВВРАЧА: Живой дашборд (выручка 2.45М ₽, загрузка 78%, чек 6 200 ₽, зарплаты)
// ============================================================================
export const DEMO_EXECUTIVE_KPI_CASE: DemoExecutiveKpiCase = {
	periodName: "Текущий месяц (Сентябрь 2026)",
	monthRevenueFactRub: 2450000,
	monthRevenuePlanRub: 2500000,
	revenueExecutionPercent: 98,
	chairOccupancyRatePercent: 78,
	chair1OccupancyPercent: 82,
	chair2OccupancyPercent: 76,
	chair3OccupancyPercent: 74,
	averageCheckRub: 6200,
	primaryConsultationsCount: 98,
	acceptedTreatmentPlansCount: 77,
	consultationToPlanConversionPercent: 78.4,
	doctorPayroll: [
		{
			doctorId: "01a00000-0000-0000-0003-000000000001",
			doctorName: "Д-р Соколов А. В.",
			specialtyRu: "Терапевт",
			revenueRub: 860000,
			commissionPercent: 25,
			pieceworkSalaryRub: 215000,
		},
		{
			doctorId: "01a00000-0000-0000-0003-000000000006",
			doctorName: "Д-р Орлов А. В.",
			specialtyRu: "Ортопед",
			revenueRub: 750000,
			commissionPercent: 20,
			pieceworkSalaryRub: 150000,
		},
		{
			doctorId: "01a00000-0000-0000-0003-000000000003",
			doctorName: "Д-р Громов К. Д.",
			specialtyRu: "Хирург-имплантолог",
			revenueRub: 420000,
			commissionPercent: 22,
			pieceworkSalaryRub: 92400,
		},
		{
			doctorId: "01a00000-0000-0000-0003-000000000002",
			doctorName: "Д-р Морозова Е. И.",
			specialtyRu: "Ортодонт",
			revenueRub: 300000,
			commissionPercent: 22,
			pieceworkSalaryRub: 66000,
		},
		{
			doctorId: "01a00000-0000-0000-0003-000000000004",
			doctorName: "Д-р Воронов М. С.",
			specialtyRu: "Главврач / Владелец",
			revenueRub: 120000,
			commissionPercent: 100, // оклад 80к + управленческий бонус 40к
			pieceworkSalaryRub: 120000,
		},
	],
	totalPayrollRub: 643400,
	payrollToRevenuePercent: 26.2,
};

// ============================================================================
// ДИПЛОМ ЗА ХРАБРОСТЬ (ДЛЯ ДЕТСКОГО И ТЕРАПЕВТИЧЕСКОГО ПРИЁМА)
// ============================================================================
export function generateDemoDiplomaForBravery(patientName = "Смирнова Анна Сергеевна"): DemoBraveryDiploma {
	return {
		diplomaNumber: "ДИПЛОМ-2026-ХРАБРОСТЬ-01",
		patientName,
		awardedDateIso: new Date().toISOString().slice(0, 10),
		awardReasonRu: "За выдающееся мужество, безупречное спокойствие в кресле стоматолога и образцовую улыбку!",
		doctorName: "Д-р Соколов А. В.",
		clinicName: "Стоматологическая Клиника DENTE",
	};
}
