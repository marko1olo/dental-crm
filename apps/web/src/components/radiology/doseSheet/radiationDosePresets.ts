/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUTORY RADIATION DOSE PRESETS & REGULATORY NORMS
 * SanPiN 2.6.1.1192-03 · SanPiN 2.6.1.2523-09 (НРБ-99/2009) · ОСПОРБ-99/2010
 * МУ 2.6.1.2944-11 (Контроль эффективных доз облучения пациентов)
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Нормативно-правовые акты РФ в сфере радиационной безопасности в стоматологии */
export const SANPIN_RADIATION_REGULATORY_AUTHORITIES = {
	sanpin1192_03: {
		code: "СанПиН 2.6.1.1192-03",
		title:
			"Гигиенические требования к устройству и эксплуатации рентгеновских кабинетов, аппаратов и проведению рентгенологических исследований",
		issuedBy: "Главный государственный санитарный врач РФ",
		registrationDate: "2003-02-14",
		relevantClauses: [
			"п. 7.1 — Лист учета дозовых нагрузок является обязательным вкладышем в Медицинскую карту стоматологического больного (форма № 043/у)",
			"п. 7.12 — Доза, полученная пациентом при проведении медицинского рентгенологического исследования, подлежит обязательной регистрации в листе учета дозовых нагрузок",
			"п. 7.13 — Предел дозы при проведении профилактических медицинских рентгенологических исследований составляет 1.0 мЗв/год",
			"п. 7.15 — Проведение рентгенологических исследований беременным женщинам и детям строго ограничено и проводится с применением средств индивидуальной защиты",
		],
	},
	nrb99_2009: {
		code: "СанПиН 2.6.1.2523-09 (НРБ-99/2009)",
		title: "Нормы радиационной безопасности",
		issuedBy: "Роспотребнадзор РФ",
		registrationDate: "2009-07-07",
		relevantClauses: [
			"п. 5.4.1 — Предел годовой эффективной дозы при профилактических исследованиях не должен превышать 1.0 мЗв",
			"п. 5.4.2 — При диагностических исследованиях дозовые нагрузки должны быть сведены к минимуму (принцип ALARA) при условии получения необходимой диагностической информации",
		],
	},
	osporb99_2010: {
		code: "СП 2.6.1.2612-10 (ОСПОРБ-99/2010)",
		title: "Основные санитарные правила обеспечения радиационной безопасности",
		issuedBy: "Главный государственный санитарный врач РФ",
		registrationDate: "2010-04-26",
		relevantClauses: [
			"Раздел 5 — Радиационная безопасность пациентов и населения при медицинском облучении",
			"п. 5.1.4 — Обязательный учет и контроль индивидуальных доз облучения пациентов",
		],
	},
	mu2944_11: {
		code: "МУ 2.6.1.2944-11",
		title:
			"Контроль эффективных доз облучения пациентов при проведении медицинских рентгенологических исследований",
		issuedBy: "Федеральная служба по надзору в сфере защиты прав потребителей и благополучия человека",
		registrationDate: "2011-07-15",
		relevantClauses: [
			"Методика расчета эффективных доз при дентальной визиографии, ортопантомографии и конусно-лучевой томографии",
		],
	},
} as const;

/** Статутарные дозовые лимиты и пороговые значения (мЗв) */
export const RADIATION_SAFETY_LIMITS_MSV = {
	/** Годовой предел для профилактических рентгенологических исследований (1.0 мЗв/год) */
	ANNUAL_PREVENTIVE_LIMIT_MSV: 1.0,
	/** Предупреждающий порог (желтая зона, 50% лимита = 0.5 мЗв/год) */
	WARNING_THRESHOLD_MSV: 0.5,
	/** Критический порог превышения (красная зона, >= 1.0 мЗв/год) */
	CRITICAL_EXCEEDED_THRESHOLD_MSV: 1.0,
	/** Предел разовой эффективной дозы при профилактическом скрининге */
	MAX_SINGLE_SCREENING_DOSE_MSV: 0.1,
	/** Рекомендуемый минимальный интервал между повторными КЛКТ (дни, кроме неотложных случаев) */
	RECOMMENDED_CBCT_INTERVAL_DAYS: 90,
} as const;

/** Цветовые зоны радиационной безопасности */
export type RadiationSafetyZone = "green" | "yellow" | "red";

export interface RadiationZoneDefinition {
	zone: RadiationSafetyZone;
	minMsv: number;
	maxMsv: number;
	labelRu: string;
	statusBadgeRu: string;
	descriptionRu: string;
	recommendationRu: string;
	badgeClass: string;
	borderClass: string;
	textClass: string;
	bgClass: string;
}

export const RADIATION_ZONE_DEFINITIONS: Record<RadiationSafetyZone, RadiationZoneDefinition> = {
	green: {
		zone: "green",
		minMsv: 0,
		maxMsv: 0.5,
		labelRu: "Зеленая зона (< 0.5 мЗв/год)",
		statusBadgeRu: "Безопасный уровень (Оптимум)",
		descriptionRu: "Суммарная лучевая нагрузка находится в пределах оптимальных фоновых нормативных значений.",
		recommendationRu:
			"Ограничений на проведение плановых рентгенологических исследований нет. Соблюдать стандартный принцип ALARA.",
		badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
		borderClass: "border-emerald-500/30",
		textClass: "text-emerald-600 dark:text-emerald-400",
		bgClass: "bg-emerald-500/10",
	},
	yellow: {
		zone: "yellow",
		minMsv: 0.5,
		maxMsv: 1.0,
		labelRu: "Желтая зона (0.5 – 1.0 мЗв/год)",
		statusBadgeRu: "Умеренная нагрузка (Внимание)",
		descriptionRu: "Накопленная лучевая нагрузка достигла 50–99% годового профилактического предела.",
		recommendationRu:
			"Рекомендуется оптимизация рентген-назначений: предпочитать прицельную радиовизиографию с коллимацией, избегать дублирующих КЛКТ без острой необходимости.",
		badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
		borderClass: "border-amber-500/30",
		textClass: "text-amber-600 dark:text-amber-400",
		bgClass: "bg-amber-500/10",
	},
	red: {
		zone: "red",
		minMsv: 1.0,
		maxMsv: Number.POSITIVE_INFINITY,
		labelRu: "Красная зона (≥ 1.0 мЗв/год)",
		statusBadgeRu: "Превышение лимита (Требуется консилиум)",
		descriptionRu:
			"Достигнут или превышен рекомендуемый годовой диагностический лимит (1.0 мЗв, СанПиН 2.6.1.1192-03 п. 7.12).",
		recommendationRu:
			"Все последующие рентгенологические исследования проводятся исключительно по строгим жизненным показаниям с письменным обоснованием консилиума врачей в амбулаторной карте (форма 043/у).",
		badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
		borderClass: "border-rose-500/30",
		textClass: "text-rose-600 dark:text-rose-400",
		bgClass: "bg-rose-500/10",
	},
};

/** Модальности дентальной рентгенологии по СанПиН */
export type StatutoryRadiologyModality =
	| "visiography_intraoral"
	| "optg_panoramic"
	| "cbct_segmental"
	| "cbct_full_jaws"
	| "cbct_maxillofacial"
	| "teleradiography_trg"
	| "teleradiography_trg_frontal"
	| "bitewing_intraoral"
	| "film_intraoral_legacy";

export interface StatutoryDosePreset {
	id: StatutoryRadiologyModality;
	nameRu: string;
	shortNameRu: string;
	categoryRu: "Интраоральные" | "Панорамные" | "Томография (3D КЛКТ)" | "Телерентгенография" | "Архивные";
	typicalDoseMsv: number;
	typicalDoseMicrosv: number;
	minDoseMsv: number;
	maxDoseMsv: number;
	defaultKv: number;
	defaultMa: number;
	defaultExposureSec: number;
	sensorTypeRu: string;
	fovDescriptionRu: string;
	protectionEquipmentRu: string;
	clinicalIndicationRu: string;
	sanpinReferenceRu: string;
}

/** Реестр стандартных архетипов исследований с эквивалентными эффективными дозами (СанПиН 2.6.1.1192-03) */
export const STATUTORY_RADIATION_DOSE_PRESETS: readonly StatutoryDosePreset[] = [
	{
		id: "visiography_intraoral",
		nameRu: "Прицельный дентальный снимок на радиовизиографе (RVG)",
		shortNameRu: "Визиограф (RVG)",
		categoryRu: "Интраоральные",
		typicalDoseMsv: 0.002, // 0.002 мЗв (2.0 мкЗв)
		typicalDoseMicrosv: 2.0,
		minDoseMsv: 0.001,
		maxDoseMsv: 0.003,
		defaultKv: 65,
		defaultMa: 7,
		defaultExposureSec: 0.08,
		sensorTypeRu: "Цифровой интраоральный CMOS/CCD датчик с высоким разрешением",
		fovDescriptionRu: "1–3 зуба (область 20x30 мм или 30x40 мм)",
		protectionEquipmentRu: "Защитный воротник для щитовидной железы + фартук (0.35 мм Pb)",
		clinicalIndicationRu: "Диагностика кариеса, пульпита, периодонтита, контроль эндодонтического лечения и обтурации каналов",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03 Таблица 7.1 / МУ 2.6.1.2944-11",
	},
	{
		id: "optg_panoramic",
		nameRu: "Цифровая ортопантомография (ОПТГ / Панорамный снимок)",
		shortNameRu: "ОПТГ (Панорама)",
		categoryRu: "Панорамные",
		typicalDoseMsv: 0.018, // 0.018 мЗв (18.0 мкЗв)
		typicalDoseMicrosv: 18.0,
		minDoseMsv: 0.010,
		maxDoseMsv: 0.025,
		defaultKv: 70,
		defaultMa: 10,
		defaultExposureSec: 12.0,
		sensorTypeRu: "Цифровой линейный датчик прямого считывания",
		fovDescriptionRu: "Зубные ряды верхней и нижней челюстей, альвеолярные отростки, ВНЧС, гайморовы пазухи",
		protectionEquipmentRu: "Защитная накидка/жилет со свинцовым эквивалентом не менее 0.35 мм Pb",
		clinicalIndicationRu: "Первичный скрининг, оценка зачатков зубов, пародонтальный статус, планирование ортодонтии и протезирования",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03 / МУ 2.6.1.2944-11",
	},
	{
		id: "cbct_segmental",
		nameRu: "Конусно-лучевая компьютерная томография (КЛКТ) сегмента 5х5 см",
		shortNameRu: "3D КЛКТ сегмента 5х5",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.035, // 0.035 мЗв (35.0 мкЗв)
		typicalDoseMicrosv: 35.0,
		minDoseMsv: 0.025,
		maxDoseMsv: 0.045,
		defaultKv: 85,
		defaultMa: 6,
		defaultExposureSec: 9.0,
		sensorTypeRu: "Плоскопанельный детектор FPD (Flat Panel Detector)",
		fovDescriptionRu: "Сегмент 50х50 мм (зона 2–4 смежных зубов)",
		protectionEquipmentRu: "Защитный жилет/фартук со свинцовым эквивалентом 0.35–0.5 мм Pb",
		clinicalIndicationRu: "Одиночная имплантация, сложная эндодонтия моляров (MB2 каналы), резекция верхушки корня",
		sanpinReferenceRu: "МУ 2.6.1.2944-11 Раздел 4",
	},
	{
		id: "cbct_full_jaws",
		nameRu: "Конусно-лучевая компьютерная томография (КЛКТ) обеих челюстей 8х8 / 10х10 см",
		shortNameRu: "3D КЛКТ челюстей 8х8 / 10х10",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.065, // 0.065 мЗв (65.0 мкЗв)
		typicalDoseMicrosv: 65.0,
		minDoseMsv: 0.040,
		maxDoseMsv: 0.080,
		defaultKv: 90,
		defaultMa: 7,
		defaultExposureSec: 14.0,
		sensorTypeRu: "Плоскопанельный сенсор FPD с технологией импульсного облучения",
		fovDescriptionRu: "FOV 80х80 мм или 100х100 мм (зубные дуги обеих челюстей)",
		protectionEquipmentRu: "Защитный жилет круговой защиты (0.5 мм Pb)",
		clinicalIndicationRu: "Тотальная имплантация (All-on-4/All-on-6), костная пластика, синус-лифтинг, ретинированные зубы 18, 28, 38, 48",
		sanpinReferenceRu: "МУ 2.6.1.2944-11 / СанПиН 2.6.1.2523-09",
	},
	{
		id: "cbct_maxillofacial",
		nameRu: "Конусно-лучевая компьютерная томография ЧЛХ и ВНЧС 15х15 см",
		shortNameRu: "3D КЛКТ ЧЛХ + ВНЧС 15х15",
		categoryRu: "Томография (3D КЛКТ)",
		typicalDoseMsv: 0.095, // 0.095 мЗв (95.0 мкЗв)
		typicalDoseMicrosv: 95.0,
		minDoseMsv: 0.080,
		maxDoseMsv: 0.140,
		defaultKv: 95,
		defaultMa: 8,
		defaultExposureSec: 18.0,
		sensorTypeRu: "Широкоформатный плоскопанельный детектор FPD 15x15",
		fovDescriptionRu: "FOV 150х150 мм (челюстно-лицевая область, оба ВНЧС, верхнечелюстные и лобные пазухи)",
		protectionEquipmentRu: "Защитный жилет + защитная юбка со свинцовым эквивалентом 0.5 мм Pb",
		clinicalIndicationRu: "Ортогнатическая хирургия, дисфункции ВНЧС, травмы лицевого скелета, патология околоносовых пазух",
		sanpinReferenceRu: "МУ 2.6.1.2944-11 / СанПиН 2.6.1.1192-03",
	},
	{
		id: "teleradiography_trg",
		nameRu: "Телерентгенография (ТРГ) черепа в боковой проекции",
		shortNameRu: "ТРГ боковая",
		categoryRu: "Телерентгенография",
		typicalDoseMsv: 0.006, // 0.006 мЗв (6.0 мкЗв)
		typicalDoseMicrosv: 6.0,
		minDoseMsv: 0.004,
		maxDoseMsv: 0.010,
		defaultKv: 75,
		defaultMa: 12,
		defaultExposureSec: 0.5,
		sensorTypeRu: "Цифровой цефалометрический детектор",
		fovDescriptionRu: "Череп в профиль (цефалометрический анализ углов и пропорций лицевого скелета)",
		protectionEquipmentRu: "Защитный воротник для щитовидной железы + фартук (0.35 мм Pb)",
		clinicalIndicationRu: "Ортодонтический цефалометрический анализ (Ricketts, Steiner, Tweed, Schwarz)",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03 / МУ 2.6.1.2944-11",
	},
	{
		id: "teleradiography_trg_frontal",
		nameRu: "Телерентгенография (ТРГ) черепа в прямой проекции",
		shortNameRu: "ТРГ прямая",
		categoryRu: "Телерентгенография",
		typicalDoseMsv: 0.006,
		typicalDoseMicrosv: 6.0,
		minDoseMsv: 0.004,
		maxDoseMsv: 0.010,
		defaultKv: 75,
		defaultMa: 12,
		defaultExposureSec: 0.5,
		sensorTypeRu: "Цифровой цефалометрический детектор",
		fovDescriptionRu: "Череп в фас (диагностика лицевых асимметрий)",
		protectionEquipmentRu: "Защитный воротник + фартук (0.35 мм Pb)",
		clinicalIndicationRu: "Диагностика выраженных асимметрий лица и челюстей перед ортодонтическим лечением",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03",
	},
	{
		id: "bitewing_intraoral",
		nameRu: "Интерпроксимальная радиовизиография (Bite-wing)",
		shortNameRu: "Bite-wing (Интерпроксимальный)",
		categoryRu: "Интраоральные",
		typicalDoseMsv: 0.0025,
		typicalDoseMicrosv: 2.5,
		minDoseMsv: 0.0015,
		maxDoseMsv: 0.0035,
		defaultKv: 65,
		defaultMa: 7,
		defaultExposureSec: 0.1,
		sensorTypeRu: "CMOS сенсор с позиционером Rinn",
		fovDescriptionRu: "Коронковые части зубов верхней и нижней челюстей одного сегмента",
		protectionEquipmentRu: "Защитный воротник + фартук (0.35 мм Pb)",
		clinicalIndicationRu: "Ранняя диагностика скрытого апроксимального кариеса и оценка краевого прилегания реставраций",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03",
	},
	{
		id: "film_intraoral_legacy",
		nameRu: "Пленочная прицельная рентгенография (архивная пленка класс D)",
		shortNameRu: "Пленка (архив)",
		categoryRu: "Архивные",
		typicalDoseMsv: 0.015,
		typicalDoseMicrosv: 15.0,
		minDoseMsv: 0.010,
		maxDoseMsv: 0.030,
		defaultKv: 70,
		defaultMa: 8,
		defaultExposureSec: 0.4,
		sensorTypeRu: "Дентальная фотопленка (класс D/E)",
		fovDescriptionRu: "1–2 зуба",
		protectionEquipmentRu: "Защитный фартук со свинцовым эквивалентом 0.35 мм Pb",
		clinicalIndicationRu: "Внесение архивных исследований, выполненных в сторонних ЛПУ на пленочных аппаратах",
		sanpinReferenceRu: "СанПиН 2.6.1.1192-03 Таблица 7.1",
	},
];

/** Реестр моделей дентальных рентгеновских аппаратов и томографов */
export interface DentalXRayApparatus {
	id: string;
	brand: string;
	model: string;
	type: "intraoral_rvg" | "panoramic_optg" | "cbct_3d" | "combined";
	modalities: StatutoryRadiologyModality[];
	nominalVoltageKv: number;
	maxVoltageKv: number;
	tubeCurrentMa: number;
	filtrationMmAl: number;
	sensorTech: string;
	focalSpotMm: number;
	hasDoseReductionMode: boolean;
}

export const DENTAL_XRAY_APPARATUS_REGISTRY: readonly DentalXRayApparatus[] = [
	{
		id: "kavo_3d_exam",
		brand: "KaVo",
		model: "3D eXam Vision",
		type: "combined",
		modalities: ["cbct_segmental", "cbct_full_jaws", "cbct_maxillofacial", "optg_panoramic"],
		nominalVoltageKv: 90,
		maxVoltageKv: 120,
		tubeCurrentMa: 7.0,
		filtrationMmAl: 2.5,
		sensorTech: "Amorphous Silicon Flat Panel (a-Si FPD)",
		focalSpotMm: 0.5,
		hasDoseReductionMode: true,
	},
	{
		id: "vatech_pax_i3d",
		brand: "Vatech",
		model: "PaX-i3D Smart Plus",
		type: "combined",
		modalities: ["cbct_segmental", "cbct_full_jaws", "optg_panoramic", "teleradiography_trg"],
		nominalVoltageKv: 85,
		maxVoltageKv: 99,
		tubeCurrentMa: 10.0,
		filtrationMmAl: 2.8,
		sensorTech: "CMOS Flat Panel с технологией анатомического FOV",
		focalSpotMm: 0.5,
		hasDoseReductionMode: true,
	},
	{
		id: "planmeca_promax_3d",
		brand: "Planmeca",
		model: "ProMax 3D Classic Ultra Low Dose",
		type: "combined",
		modalities: ["cbct_segmental", "cbct_full_jaws", "optg_panoramic", "teleradiography_trg"],
		nominalVoltageKv: 90,
		maxVoltageKv: 90,
		tubeCurrentMa: 12.0,
		filtrationMmAl: 2.5,
		sensorTech: "Flat Panel CMOS с алгоритмом Planmeca Ultra Low Dose™",
		focalSpotMm: 0.5,
		hasDoseReductionMode: true,
	},
	{
		id: "morita_veraview_x800",
		brand: "J. Morita",
		model: "Veraview X800 3D/2D",
		type: "combined",
		modalities: ["cbct_segmental", "cbct_full_jaws", "cbct_maxillofacial", "optg_panoramic"],
		nominalVoltageKv: 100,
		maxVoltageKv: 100,
		tubeCurrentMa: 8.0,
		filtrationMmAl: 3.0,
		sensorTech: "High-Definition Flat Panel Detector с размером вокселя 80 мкм",
		focalSpotMm: 0.5,
		hasDoseReductionMode: true,
	},
	{
		id: "sirona_orthophos_sl",
		brand: "Dentsply Sirona",
		model: "Orthophos SL 3D",
		type: "combined",
		modalities: ["cbct_segmental", "cbct_full_jaws", "optg_panoramic", "teleradiography_trg"],
		nominalVoltageKv: 85,
		maxVoltageKv: 90,
		tubeCurrentMa: 7.0,
		filtrationMmAl: 2.5,
		sensorTech: "DCS (Direct Conversion Sensor) с технологией резкого слоя",
		focalSpotMm: 0.5,
		hasDoseReductionMode: true,
	},
	{
		id: "carestream_cs2200",
		brand: "Carestream Dental",
		model: "CS 2200 High Frequency",
		type: "intraoral_rvg",
		modalities: ["visiography_intraoral", "bitewing_intraoral"],
		nominalVoltageKv: 65,
		maxVoltageKv: 70,
		tubeCurrentMa: 7.0,
		filtrationMmAl: 2.0,
		sensorTech: "Высокочастотный генератор 300 кГц + RVG 6200 CMOS",
		focalSpotMm: 0.7,
		hasDoseReductionMode: false,
	},
	{
		id: "fona_xdg",
		brand: "Fona Dental",
		model: "XDG Intraoral X-Ray",
		type: "intraoral_rvg",
		modalities: ["visiography_intraoral", "bitewing_intraoral", "film_intraoral_legacy"],
		nominalVoltageKv: 70,
		maxVoltageKv: 70,
		tubeCurrentMa: 7.0,
		filtrationMmAl: 2.0,
		sensorTech: "Микропроцессорный интраоральный рентген-аппарат",
		focalSpotMm: 0.4,
		hasDoseReductionMode: false,
	},
	{
		id: "progeny_preva",
		brand: "Midmark Progeny",
		model: "Preva DC Dental X-Ray System",
		type: "intraoral_rvg",
		modalities: ["visiography_intraoral", "bitewing_intraoral"],
		nominalVoltageKv: 65,
		maxVoltageKv: 70,
		tubeCurrentMa: 7.0,
		filtrationMmAl: 2.0,
		sensorTech: "DC постоянного потенциала с ультра-малым фокусным пятном 0.4 мм",
		focalSpotMm: 0.4,
		hasDoseReductionMode: false,
	},
];

/** Каталог средств индивидуальной защиты (СИЗ) по СанПиН 2.6.1.1192-03 Таблица 3 */
export const SANPIN_PROTECTIVE_EQUIPMENT_CATALOG = [
	{
		id: "thyroid_collar_035",
		nameRu: "Защитный воротник для щитовидной железы",
		leadEquivalentMmPb: 0.35,
		mandatoryFor: ["visiography_intraoral", "teleradiography_trg", "bitewing_intraoral"],
		descriptionRu: "Экранирование щитовидной железы при внутриротовой рентгенографии",
	},
	{
		id: "protective_apron_035",
		nameRu: "Защитный фартук (пелерина)",
		leadEquivalentMmPb: 0.35,
		mandatoryFor: ["visiography_intraoral", "optg_panoramic", "bitewing_intraoral"],
		descriptionRu: "Защита грудной клетки и органов брюшной полости",
	},
	{
		id: "protective_vest_050",
		nameRu: "Защитный жилет круговой защиты",
		leadEquivalentMmPb: 0.5,
		mandatoryFor: ["cbct_segmental", "cbct_full_jaws", "cbct_maxillofacial"],
		descriptionRu: "Круговая защита торса при конусно-лучевой компьютерной томографии 3D",
	},
	{
		id: "gonad_skirt_050",
		nameRu: "Защитная юбка (гонадопротектор)",
		leadEquivalentMmPb: 0.5,
		mandatoryFor: ["cbct_maxillofacial"],
		descriptionRu: "Дополнительное экранирование органов малого таза при объемных исследованиях ЧЛХ",
	},
	{
		id: "lead_glasses_035",
		nameRu: "Очки со свинцовыми стеклами",
		leadEquivalentMmPb: 0.35,
		mandatoryFor: [],
		descriptionRu: "Защита хрусталика глаза пациента при нахождении в зоне прямого пучка (по показаниям)",
	},
] as const;

/** Поиск пресета по ID с безопасным дефолтом */
export function getStatutoryDosePreset(modalityId: string): StatutoryDosePreset {
	const found = STATUTORY_RADIATION_DOSE_PRESETS.find((p) => p.id === modalityId);
	if (found) return found;

	// Fallback to intraoral visiography
	return (
		STATUTORY_RADIATION_DOSE_PRESETS[0] || {
			id: "visiography_intraoral",
			nameRu: "Прицельный дентальный снимок на радиовизиографе (RVG)",
			shortNameRu: "Визиограф (RVG)",
			categoryRu: "Интраоральные",
			typicalDoseMsv: 0.002,
			typicalDoseMicrosv: 2.0,
			minDoseMsv: 0.001,
			maxDoseMsv: 0.003,
			defaultKv: 65,
			defaultMa: 7,
			defaultExposureSec: 0.08,
			sensorTypeRu: "Цифровой интраоральный CMOS/CCD датчик",
			fovDescriptionRu: "1–3 зуба",
			protectionEquipmentRu: "Защитный воротник для щитовидной железы + фартук (0.35 мм Pb)",
			clinicalIndicationRu: "Диагностика кариеса, пульпита",
			sanpinReferenceRu: "СанПиН 2.6.1.1192-03",
		}
	);
}
