/**
 * packages/shared/src/clinical/diagnosisServiceBundles.ts
 *
 * DENTE Dental CRM — Canonical Diagnosis-to-Services 1-Click Clinical Package Engine.
 * Compliant with:
 * - Order 804n of the Ministry of Health of the Russian Federation (Номенклатура медицинских услуг 804н).
 * - Federal Law 54-FZ Cashier Standard (strict integer kopecks, no IEEE-754 float drift).
 * - Mandate 8b: Money and legal documents exact to the kopeck.
 * - Mandate 8e: Doctor & Staff Autonomy (1-click checkout, 0-friction at chairside).
 * - Mandate 8k: Friction-Killer Law (Elimination of 10-minute manual searching across 300 price items).
 */

export interface CanonicalDiagnosisService {
	readonly id: string;
	readonly code804n: string;
	readonly title: string;
	readonly defaultPriceKopecks: number;
	readonly defaultPriceRub: number;
	readonly requiredByDefault: boolean;
	readonly category: string;
}

export interface CanonicalDiagnosisBundle {
	readonly id: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly toothState: string;
	readonly title: string;
	readonly shortLabel: string;
	readonly badge: string;
	readonly defaultTotalPriceKopecks: number;
	readonly defaultTotalPriceRub: number;
	readonly services: readonly CanonicalDiagnosisService[];
}

/**
 * 1. Кариес дентина (K02.1 / Caries)
 * Стандартный клинический пакет восстановления зуба световой пломбой по 804н:
 * - A11.07.012 Анестезия инфильтрационная (или проводниковая)
 * - A16.07.002.001 Наложение коффердама
 * - A16.07.002 Препарирование кариозной полости
 * - A16.07.002.010 Восстановление зуба пломбой светового отверждения (I, II, III класс)
 * - A16.07.002.011 Шлифовка и полировка пломбы
 */
export const CARIES_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "caries",
	diagnosisIcd10: "K02.1",
	diagnosisTitle: "Кариес дентина",
	toothState: "Caries",
	title: "Лечение кариеса",
	shortLabel: "Пакет: Лечение кариеса (K02.1)",
	badge: "Анестезия + Коффердам + Препарирование + Пломба + Полировка",
	defaultTotalPriceKopecks: 750000,
	defaultTotalPriceRub: 7500,
	services: [
		{
			id: "caries_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная (или проводниковая)",
			defaultPriceKopecks: 120000,
			defaultPriceRub: 1200,
			requiredByDefault: true,
			category: "Анестезия",
		},
		{
			id: "caries_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама",
			defaultPriceKopecks: 80000,
			defaultPriceRub: 800,
			requiredByDefault: true,
			category: "Терапия",
		},
		{
			id: "caries_prep",
			code804n: "A16.07.002",
			title: "Препарирование кариозной полости",
			defaultPriceKopecks: 100000,
			defaultPriceRub: 1000,
			requiredByDefault: true,
			category: "Терапия",
		},
		{
			id: "caries_restoration",
			code804n: "A16.07.002.010",
			title: "Восстановление зуба пломбой светового отверждения (I, II, III класс)",
			defaultPriceKopecks: 400000,
			defaultPriceRub: 4000,
			requiredByDefault: true,
			category: "Терапия",
		},
		{
			id: "caries_polishing",
			code804n: "A16.07.002.011",
			title: "Шлифовка и полировка пломбы",
			defaultPriceKopecks: 50000,
			defaultPriceRub: 500,
			requiredByDefault: true,
			category: "Терапия",
		},
	],
};

/**
 * 2. Пульпит (K04.0 / Pulpitis)
 * Клинический пакет эндодонтического лечения (1-й этап):
 * - A11.07.012 Анестезия инфильтрационная (или проводниковая)
 * - A16.07.002.001 Наложение коффердама
 * - A16.07.030.001 Экстирпация пульпы (депульпирование)
 * - A16.07.030.002 Механическая и медикаментозная обработка корневого канала
 * - A16.07.030.004 Временное пломбирование корневого канала лекарственным препаратом / Временная пломба
 */
export const PULPITIS_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "endo_1",
	diagnosisIcd10: "K04.0",
	diagnosisTitle: "Пульпит",
	toothState: "Pulpitis",
	title: "Эндодонтия (1-й этап)",
	shortLabel: "Пакет: Эндодонтия 1-й этап (K04.0)",
	badge: "Анестезия + Коффердам + Экстирпация + Обработка каналов + Временная пломба",
	defaultTotalPriceKopecks: 880000,
	defaultTotalPriceRub: 8800,
	services: [
		{
			id: "endo_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная (или проводниковая)",
			defaultPriceKopecks: 120000,
			defaultPriceRub: 1200,
			requiredByDefault: true,
			category: "Анестезия",
		},
		{
			id: "endo_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама",
			defaultPriceKopecks: 80000,
			defaultPriceRub: 800,
			requiredByDefault: true,
			category: "Терапия",
		},
		{
			id: "endo_extirpation",
			code804n: "A16.07.030.001",
			title: "Экстирпация пульпы (депульпирование)",
			defaultPriceKopecks: 200000,
			defaultPriceRub: 2000,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
		{
			id: "endo_prep_canals",
			code804n: "A16.07.030.002",
			title: "Механическая и медикаментозная обработка корневого канала",
			defaultPriceKopecks: 330000,
			defaultPriceRub: 3300,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
		{
			id: "endo_temp_fill",
			code804n: "A16.07.030.004",
			title: "Временное пломбирование корневого канала лекарственным препаратом / Временная пломба",
			defaultPriceKopecks: 150000,
			defaultPriceRub: 1500,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
	],
};

/**
 * 3. Периодонтит хронический / апикальный (K04.7 / Periodontitis)
 */
export const PERIODONTITIS_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "periodontitis",
	diagnosisIcd10: "K04.7",
	diagnosisTitle: "Хронический апикальный периодонтит",
	toothState: "Periodontitis",
	title: "Лечение периодонтита",
	shortLabel: "Пакет: Лечение периодонтита (K04.7)",
	badge: "Анестезия + Коффердам + Распломбирование + Обработка + Ca(OH)2",
	defaultTotalPriceKopecks: 960000,
	defaultTotalPriceRub: 9600,
	services: [
		{
			id: "perio_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная (или проводниковая)",
			defaultPriceKopecks: 120000,
			defaultPriceRub: 1200,
			requiredByDefault: true,
			category: "Анестезия",
		},
		{
			id: "perio_cofferdam",
			code804n: "A16.07.002.001",
			title: "Наложение коффердама",
			defaultPriceKopecks: 80000,
			defaultPriceRub: 800,
			requiredByDefault: true,
			category: "Терапия",
		},
		{
			id: "perio_unsealing",
			code804n: "A16.07.082",
			title: "Распломбирование корневого канала",
			defaultPriceKopecks: 250000,
			defaultPriceRub: 2500,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
		{
			id: "perio_prep_canals",
			code804n: "A16.07.030.002",
			title: "Механическая и медикаментозная обработка корневого канала",
			defaultPriceKopecks: 330000,
			defaultPriceRub: 3300,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
		{
			id: "perio_caoh2",
			code804n: "A16.07.091",
			title: "Временная обтурация корневого канала гидроксидом кальция (Ca(OH)2)",
			defaultPriceKopecks: 180000,
			defaultPriceRub: 1800,
			requiredByDefault: true,
			category: "Эндодонтия",
		},
	],
};

/**
 * 4. Удаление постоянного зуба (K08.1 / Missing / ExtractionIndicated)
 */
export const EXTRACTION_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "surgery_extraction",
	diagnosisIcd10: "K08.1",
	diagnosisTitle: "Потеря зубов вследствие удаления",
	toothState: "Missing",
	title: "Удаление зуба",
	shortLabel: "Пакет: Удаление зуба (K08.1)",
	badge: "Анестезия + Удаление + Местный гемостаз",
	defaultTotalPriceKopecks: 550000,
	defaultTotalPriceRub: 5500,
	services: [
		{
			id: "extract_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная (или проводниковая)",
			defaultPriceKopecks: 120000,
			defaultPriceRub: 1200,
			requiredByDefault: true,
			category: "Анестезия",
		},
		{
			id: "extract_tooth",
			code804n: "A16.07.001.001",
			title: "Удаление постоянного зуба",
			defaultPriceKopecks: 350000,
			defaultPriceRub: 3500,
			requiredByDefault: true,
			category: "Хирургия",
		},
		{
			id: "extract_hemostasis",
			code804n: "A16.07.001.002",
			title: "Остановка луночного кровотечения / местный гемостаз",
			defaultPriceKopecks: 80000,
			defaultPriceRub: 800,
			requiredByDefault: true,
			category: "Хирургия",
		},
	],
};

/**
 * 5. Профессиональная гигиена полости рта (K05.3 / Hygiene)
 */
export const HYGIENE_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "hygiene",
	diagnosisIcd10: "K05.3",
	diagnosisTitle: "Хронический пародонтит / Зубные отложения",
	toothState: "Healthy",
	title: "Профгигиена полости рта",
	shortLabel: "Пакет: Профгигиена (K05.3)",
	badge: "УЗ-скейлинг + AirFlow + Полировка + Фторирование",
	defaultTotalPriceKopecks: 650000,
	defaultTotalPriceRub: 6500,
	services: [
		{
			id: "hyg_ultrasound",
			code804n: "A16.07.050.001",
			title: "Ультразвуковое удаление зубных отложений (скейлинг)",
			defaultPriceKopecks: 250000,
			defaultPriceRub: 2500,
			requiredByDefault: true,
			category: "Гигиена",
		},
		{
			id: "hyg_airflow",
			code804n: "A16.07.050.002",
			title: "Удаление пигментированного налета аппаратом Air-Flow",
			defaultPriceKopecks: 220000,
			defaultPriceRub: 2200,
			requiredByDefault: true,
			category: "Гигиена",
		},
		{
			id: "hyg_polish",
			code804n: "A16.07.050.003",
			title: "Полировка всех зубов профессиональными абразивными пастами",
			defaultPriceKopecks: 80000,
			defaultPriceRub: 800,
			requiredByDefault: true,
			category: "Гигиена",
		},
		{
			id: "hyg_fluoride",
			code804n: "A11.07.012",
			title: "Глубокое фторирование эмали (реминерализация)",
			defaultPriceKopecks: 100000,
			defaultPriceRub: 1000,
			requiredByDefault: true,
			category: "Гигиена",
		},
	],
};

/**
 * 6. Ортопедическое восстановление зуба (K08.2 / Crown)
 */
export const CROWN_DIAGNOSIS_BUNDLE: CanonicalDiagnosisBundle = {
	id: "crown",
	diagnosisIcd10: "K08.2",
	diagnosisTitle: "Потеря коронковой части зуба",
	toothState: "Crown",
	title: "Коронка постоянная",
	shortLabel: "Пакет: Коронка постоянная (K08.2)",
	badge: "Анестезия + Препарирование + Слепки + Фиксация коронки",
	defaultTotalPriceKopecks: 2400000,
	defaultTotalPriceRub: 24000,
	services: [
		{
			id: "crown_anesth",
			code804n: "A11.07.012",
			title: "Анестезия инфильтрационная (или проводниковая)",
			defaultPriceKopecks: 120000,
			defaultPriceRub: 1200,
			requiredByDefault: true,
			category: "Анестезия",
		},
		{
			id: "crown_prep",
			code804n: "A16.07.004",
			title: "Препарирование зуба под искусственную коронку",
			defaultPriceKopecks: 250000,
			defaultPriceRub: 2500,
			requiredByDefault: true,
			category: "Ортопедия",
		},
		{
			id: "crown_impression",
			code804n: "A02.07.010",
			title: "Снятие двухслойного слепка силиконовой массой",
			defaultPriceKopecks: 180000,
			defaultPriceRub: 1800,
			requiredByDefault: true,
			category: "Ортопедия",
		},
		{
			id: "crown_fixation",
			code804n: "A16.07.004.002",
			title: "Восстановление зуба коронкой постоянной безметалловой",
			defaultPriceKopecks: 1850000,
			defaultPriceRub: 18500,
			requiredByDefault: true,
			category: "Ортопедия",
		},
	],
};

/** Реестр всех канонических клинических пакетов */
export const CANONICAL_DIAGNOSIS_BUNDLES: readonly CanonicalDiagnosisBundle[] = [
	CARIES_DIAGNOSIS_BUNDLE,
	PULPITIS_DIAGNOSIS_BUNDLE,
	PERIODONTITIS_DIAGNOSIS_BUNDLE,
	EXTRACTION_DIAGNOSIS_BUNDLE,
	HYGIENE_DIAGNOSIS_BUNDLE,
	CROWN_DIAGNOSIS_BUNDLE,
];

/**
 * Находит клинический пакет по состоянию зуба в одонтограмме.
 */
export function getDiagnosisBundleByToothState(state: string): CanonicalDiagnosisBundle | null {
	switch (state) {
		case "Caries":
			return CARIES_DIAGNOSIS_BUNDLE;
		case "Pulpitis":
			return PULPITIS_DIAGNOSIS_BUNDLE;
		case "Periodontitis":
			return PERIODONTITIS_DIAGNOSIS_BUNDLE;
		case "Missing":
		case "ExtractionIndicated":
			return EXTRACTION_DIAGNOSIS_BUNDLE;
		case "Crown":
			return CROWN_DIAGNOSIS_BUNDLE;
		default:
			return null;
	}
}

/**
 * Находит клинический пакет по коду диагноза МКБ-10.
 */
export function getDiagnosisBundleByIcd10(icd10: string): CanonicalDiagnosisBundle | null {
	const clean = icd10.trim().toUpperCase();
	if (clean.startsWith("K02")) return CARIES_DIAGNOSIS_BUNDLE;
	if (clean.startsWith("K04.0") || clean.startsWith("K04.1") || clean.startsWith("K04.2") || clean.startsWith("K04.3")) return PULPITIS_DIAGNOSIS_BUNDLE;
	if (clean.startsWith("K04.4") || clean.startsWith("K04.5") || clean.startsWith("K04.6") || clean.startsWith("K04.7") || clean.startsWith("K04.8") || clean.startsWith("K04.9")) return PERIODONTITIS_DIAGNOSIS_BUNDLE;
	if (clean.startsWith("K08.1")) return EXTRACTION_DIAGNOSIS_BUNDLE;
	if (clean.startsWith("K05")) return HYGIENE_DIAGNOSIS_BUNDLE;
	return CANONICAL_DIAGNOSIS_BUNDLES.find((b) => b.diagnosisIcd10.toUpperCase() === clean) ?? null;
}

/**
 * Разрешает услугу пакета против живого каталога клиники (если есть совпадение по коду 804н или названию).
 */
export function resolveServicePriceAgainstCatalog(
	service: CanonicalDiagnosisService,
	catalog: readonly any[] = [],
): {
	priceKopecks: number;
	priceRub: number;
	priceId: string | null;
	title: string;
	fromCatalog: boolean;
} {
	if (Array.isArray(catalog) && catalog.length > 0) {
		// 1. Точное совпадение по коду услуги 804н
		const byCode = catalog.find(
			(c) => (c?.code === service.code804n || c?.code804n === service.code804n) && c?.active !== false,
		);
		if (byCode) {
			const rub = typeof byCode.basePriceRub === "number" && Number.isFinite(byCode.basePriceRub)
				? byCode.basePriceRub
				: typeof byCode.priceRub === "number" && Number.isFinite(byCode.priceRub)
					? byCode.priceRub
					: service.defaultPriceRub;
			const kopecks = Math.round(rub * 100);
			return {
				priceKopecks: kopecks,
				priceRub: rub,
				priceId: byCode.id ?? null,
				title: byCode.title ?? service.title,
				fromCatalog: true,
			};
		}

		// 2. Совпадение по ключевым словам в названии
		const normalizedSvcTitle = service.title.toLowerCase().replace(/ё/g, "е");
		const byTitle = catalog.find((c) => {
			if (c?.active === false) return false;
			const cTitle = (c?.title || "").toLowerCase().replace(/ё/g, "е");
			return cTitle.includes(normalizedSvcTitle) || normalizedSvcTitle.includes(cTitle);
		});
		if (byTitle) {
			const rub = typeof byTitle.basePriceRub === "number" && Number.isFinite(byTitle.basePriceRub)
				? byTitle.basePriceRub
				: typeof byTitle.priceRub === "number" && Number.isFinite(byTitle.priceRub)
					? byTitle.priceRub
					: service.defaultPriceRub;
			const kopecks = Math.round(rub * 100);
			return {
				priceKopecks: kopecks,
				priceRub: rub,
				priceId: byTitle.id ?? null,
				title: byTitle.title ?? service.title,
				fromCatalog: true,
			};
		}
	}

	return {
		priceKopecks: service.defaultPriceKopecks,
		priceRub: service.defaultPriceRub,
		priceId: null,
		title: service.title,
		fromCatalog: false,
	};
}

export interface CustomizedBundleItem {
	readonly serviceId: string;
	readonly code804n: string;
	readonly title: string;
	readonly priceKopecks: number;
	readonly priceRub: number;
	readonly priceId: string | null;
	readonly requiredByDefault: boolean;
	readonly checked: boolean;
	readonly category: string;
	readonly toothCode: string | null;
}

export interface CustomizedBundleResult {
	readonly bundleId: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly items: readonly CustomizedBundleItem[];
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly checkedCount: number;
}

/**
 * Создает настраиваемый список услуг пакета с возможностью снятия/установки галочек
 * и точным копеечным расчетом.
 */
export function createCustomizedBundle(
	bundle: CanonicalDiagnosisBundle,
	options: {
		toothCode?: string | number | null | undefined;
		checkedServiceCodes?: readonly string[] | undefined;
		catalog?: readonly any[] | undefined;
	} = {},
): CustomizedBundleResult {
	const tooth = options.toothCode !== undefined && options.toothCode !== null
		? String(options.toothCode)
		: null;

	const checkedSet = options.checkedServiceCodes
		? new Set(options.checkedServiceCodes)
		: null;

	const items: CustomizedBundleItem[] = bundle.services.map((svc) => {
		const resolved = resolveServicePriceAgainstCatalog(svc, options.catalog);
		const isChecked = checkedSet !== null
			? checkedSet.has(svc.code804n)
			: svc.requiredByDefault;

		return {
			serviceId: svc.id,
			code804n: svc.code804n,
			title: resolved.title,
			priceKopecks: resolved.priceKopecks,
			priceRub: resolved.priceRub,
			priceId: resolved.priceId,
			requiredByDefault: svc.requiredByDefault,
			checked: isChecked,
			category: svc.category,
			toothCode: tooth,
		};
	});

	const checkedItems = items.filter((it) => it.checked);
	const totalKopecks = checkedItems.reduce((acc, it) => acc + it.priceKopecks, 0);
	const totalRub = Math.round(totalKopecks) / 100;

	return {
		bundleId: bundle.id,
		diagnosisIcd10: bundle.diagnosisIcd10,
		diagnosisTitle: bundle.diagnosisTitle,
		items,
		totalKopecks,
		totalRub,
		checkedCount: checkedItems.length,
	};
}

export interface Cashier54FzItemPayload {
	readonly name: string;
	readonly code804n: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly sumKopecks: number;
	readonly taxRate: "none" | "vat20" | "vat10";
	readonly paymentSubject: 4; // Услуга по ФФД 1.2
	readonly paymentMethod: 4; // Полный расчет
	readonly toothNumber?: number | undefined;
	readonly toothCode?: string | undefined;
}

export interface Cashier54FzBundleExport {
	readonly source: "chairside_diagnosis_package";
	readonly bundleId: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitle: string;
	readonly toothCode?: string | undefined;
	readonly toothNumber?: number | undefined;
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly itemsCount: number;
	readonly receiptItems: readonly Cashier54FzItemPayload[];
}

/**
 * 1-клик экспорт в кассу 54-ФЗ с ценами строго в целых копейках.
 */
export function exportCustomizedBundleToCashier54Fz(
	customized: CustomizedBundleResult,
	metadata: {
		patientId?: string | undefined;
		visitId?: string | undefined;
		toothNumber?: number | string | undefined;
	} = {},
): Cashier54FzBundleExport {
	const activeItems = customized.items.filter((it) => it.checked);
	const toothNum = metadata.toothNumber !== undefined
		? Number(metadata.toothNumber) || undefined
		: undefined;
	const toothCodeStr = metadata.toothNumber !== undefined
		? String(metadata.toothNumber)
		: undefined;

	const receiptItems: Cashier54FzItemPayload[] = activeItems.map((item) => {
		const toothSuffix = toothCodeStr ? ` (зуб ${toothCodeStr})` : "";
		return {
			name: `[${item.code804n}] ${item.title}${toothSuffix}`,
			code804n: item.code804n,
			priceKopecks: item.priceKopecks,
			quantity: 1,
			sumKopecks: item.priceKopecks,
			taxRate: "none", // Стоматологические услуги освобождены от НДС (подп. 2 п. 2 ст. 149 НК РФ)
			paymentSubject: 4,
			paymentMethod: 4,
			toothNumber: toothNum,
			toothCode: toothCodeStr,
		};
	});

	const totalKopecks = receiptItems.reduce((acc, it) => acc + it.sumKopecks, 0);
	const totalRub = Math.round(totalKopecks) / 100;

	return {
		source: "chairside_diagnosis_package",
		bundleId: customized.bundleId,
		diagnosisIcd10: customized.diagnosisIcd10,
		diagnosisTitle: customized.diagnosisTitle,
		toothCode: toothCodeStr,
		toothNumber: toothNum,
		patientId: metadata.patientId,
		visitId: metadata.visitId,
		totalKopecks,
		totalRub,
		itemsCount: receiptItems.length,
		receiptItems,
	};
}

/**
 * Структурированный элемент услуги Номенклатуры 804н, привязанный к зубу (Мандаты 8b, 8e).
 * Гарантирует сохранение номера зуба toothNumber / toothCode в биллинге и карте пациента.
 */
export interface ToothClinicalServicePayload {
	readonly serviceId: string;
	readonly code804n: string;
	readonly toothNumber?: number | string | undefined;
	readonly toothCode?: string | undefined;
	readonly name: string;
	readonly priceRub: number;
	readonly priceKopecks?: number | undefined;
	readonly quantity: number;
	readonly category?: string | undefined;
}

/**
 * Канонические экспресс-пресеты услуг Номенклатуры 804н для 1-клик назначения в модалке зуба:
 * - Кариес: A16.07.002.010 Восстановление зуба пломбой световой (4 500 ₽)
 * - Пульпит: A16.07.030 Пульпотомия / Лечение каналов (3 500 ₽) + пломба (4 500 ₽)
 * - Коронка: A16.07.004 Коронка металлокерамическая / диоксид циркония (24 000 ₽)
 * - Удаление: A16.07.001 Удаление постоянного зуба (3 500 ₽)
 * - Анестезия: A11.07.012 Анестезия инфильтрационная (1 200 ₽)
 */
export const TOOTH_804N_PRESETS = {
	cariesFilling: {
		serviceId: "caries_restoration_804n",
		code804n: "A16.07.002.010",
		name: "Восстановление зуба пломбой световой",
		priceRub: 4500,
		priceKopecks: 450000,
		quantity: 1,
		category: "Терапия",
	},
	endoCanals: {
		serviceId: "endo_canals_804n",
		code804n: "A16.07.030",
		name: "Пульпотомия / Лечение каналов",
		priceRub: 3500,
		priceKopecks: 350000,
		quantity: 1,
		category: "Эндодонтия",
	},
	crownZirconia: {
		serviceId: "crown_zirconia_804n",
		code804n: "A16.07.004",
		name: "Коронка металлокерамическая / диоксид циркония",
		priceRub: 24000,
		priceKopecks: 2400000,
		quantity: 1,
		category: "Ортопедия",
	},
	extractionPermanent: {
		serviceId: "extraction_permanent_804n",
		code804n: "A16.07.001",
		name: "Удаление постоянного зуба",
		priceRub: 3500,
		priceKopecks: 350000,
		quantity: 1,
		category: "Хирургия",
	},
	anesthesiaInfiltration: {
		serviceId: "anesthesia_infilt_804n",
		code804n: "A11.07.012",
		name: "Анестезия инфильтрационная",
		priceRub: 1200,
		priceKopecks: 120000,
		quantity: 1,
		category: "Анестезия",
	},
} as const;
