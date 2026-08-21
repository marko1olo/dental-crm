/**
 * insuranceMath.ts — Финансово-математическое ядро модуля ДМС (Добровольное медицинское страхование),
 * учет гарантийных писем, франшиз, исключений программ страхования и формирование реестров/актов.
 *
 * ИНВАРИАНТЫ:
 * 1. Копеечная точность без двоичного дрейфа IEEE-754: все финансовые операции округляются
 *    через целочисленные копейки (ROUND_HALF_UP).
 * 2. Железный баланс: dmsCoveredRub + patientPaidRub === lineTotalRub с точностью до копейки.
 * 3. 100% покрытие типов TypeScript без 'any'.
 */

export interface DmsInsurerItem {
	readonly id: string;
	readonly key: string;
	readonly shortName: string;
	readonly fullName: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly phone: string;
	readonly email: string;
	readonly standardDmsTerms: string;
}

/** Ведущие страховые компании РФ по ДМС (рыночные лидеры) */
export const RUSSIAN_DMS_INSURERS: readonly DmsInsurerItem[] = [
	{
		id: "sogaz",
		key: "sogaz",
		shortName: "АО «СОГАЗ»",
		fullName: "Акционерное общество «Страховое общество газовой промышленности»",
		inn: "7736035485",
		ogrn: "1027739820921",
		phone: "8 (800) 333-08-88",
		email: "dms@sogaz.ru",
		standardDmsTerms: "Терапия и хирургия 100%, плановое лечение по ГП, исключена ортодонтия и имплантация.",
	},
	{
		id: "ingosstrakh",
		key: "ingosstrakh",
		shortName: "СПАО «Ингосстрах»",
		fullName: "Страховое публичное акционерное общество «Ингосстрах»",
		inn: "7705042179",
		ogrn: "1027739362474",
		phone: "8 (495) 956-55-55",
		email: "med@ingos.ru",
		standardDmsTerms: "Покрытие по согласованию, франшиза 10-20% при расширенных опциях, строго по 804н.",
	},
	{
		id: "reso",
		key: "reso",
		shortName: "СПАО «РЕСО-Гарантия»",
		fullName: "Страховое публичное акционерное общество «РЕСО-Гарантия»",
		inn: "7710045520",
		ogrn: "1027700042413",
		phone: "8 (800) 234-18-02",
		email: "dms-expert@reso.ru",
		standardDmsTerms: "Кураторская экспертиза счетов, согласование гарантийных писем до 3 рабочих дней.",
	},
	{
		id: "alfastrakh",
		key: "alfastrakh",
		shortName: "АО «АльфаСтрахование»",
		fullName: "Акционерное общество «АльфаСтрахование»",
		inn: "7713056834",
		ogrn: "1027739795909",
		phone: "8 (800) 333-0-999",
		email: "curator_dms@alfastrah.ru",
		standardDmsTerms: "Цифровой шлюз согласования, исключены отбеливание, виниры и эстетика.",
	},
	{
		id: "vsk",
		key: "vsk",
		shortName: "САО «ВСК»",
		fullName: "Страховое акционерное общество «ВСК»",
		inn: "7710026574",
		ogrn: "1027700186062",
		phone: "8 (800) 775-77-51",
		email: "dms_claims@vsk.ru",
		standardDmsTerms: "Лимиты на терапию до 100 000 руб/год, обязательное указание номеров зубов и МКБ-10.",
	},
	{
		id: "soglasie",
		key: "soglasie",
		shortName: "ООО «СК «Согласие»",
		fullName: "Общество с ограниченной ответственностью «Страховая Компания «Согласие»",
		inn: "7706070733",
		ogrn: "1027700032700",
		phone: "8 (800) 755-00-01",
		email: "dms-info@soglasie.ru",
		standardDmsTerms: "Строгая проверка показаний при депульпировании, эндодонтия по гарантийным письмам.",
	},
	{
		id: "rosgosstrakh",
		key: "rosgosstrakh",
		shortName: "ПАО СК «Росгосстрах»",
		fullName: "Публичное акционерное общество Страховая Компания «Росгосстрах»",
		inn: "7707067683",
		ogrn: "1027739049689",
		phone: "8 (800) 200-09-00",
		email: "dms@rgs.ru",
		standardDmsTerms: "Базовые программы с софинансированием пациента (Copay 20%).",
	},
	{
		id: "ugoria",
		key: "ugoria",
		shortName: "АО «ГСК «Югория»",
		fullName: "Акционерное общество «Государственная страховая компания «Югория»",
		inn: "8601023568",
		ogrn: "1048605006159",
		phone: "8 (800) 100-82-00",
		email: "dms@ugsk.ru",
		standardDmsTerms: "Покрытие по прайс-листу клиники с понижающим коэффициентом 0.9.",
	},
];

/** Стандартные категории исключений программ ДМС */
export interface DmsExclusionDefinition {
	readonly id: string;
	readonly key: string;
	readonly title: string;
	readonly description: string;
	readonly defaultExcluded: boolean;
	readonly matchedCategories: readonly string[];
}

export const DMS_STANDARD_EXCLUSIONS: readonly DmsExclusionDefinition[] = [
	{
		id: "orthodontics",
		key: "orthodontics",
		title: "Ортодонтия (брекеты, элайнеры)",
		description: "Исправление прикуса, брекет-системы, каппы, ортодонтические аппараты",
		defaultExcluded: true,
		matchedCategories: ["orthodontics", "ortho"],
	},
	{
		id: "implantology",
		key: "implantology",
		title: "Имплантация и костная пластика",
		description: "Установка дентальных имплантатов, синус-лифтинг, остеопластика",
		defaultExcluded: true,
		matchedCategories: ["implantology", "implants"],
	},
	{
		id: "whitening",
		key: "whitening",
		title: "Отбеливание и косметическая эстетика",
		description: "Клиническое отбеливание зубов (Zoom, Beyond), украшения на зубы (скайсы)",
		defaultExcluded: true,
		matchedCategories: ["whitening", "aesthetic"],
	},
	{
		id: "veneers",
		key: "veneers",
		title: "Виниры и эстетическая реставрация",
		description: "Керамические и композитные виниры по косметическим показаниям",
		defaultExcluded: true,
		matchedCategories: ["aesthetic", "veneers"],
	},
	{
		id: "periodontology_surgery",
		key: "periodontology_surgery",
		title: "Хирургическая пародонтология",
		description: "Лоскутные операции, направленная тканевая регенерация, кюретаж закрытый/открытый",
		defaultExcluded: false,
		matchedCategories: ["periodontology_surgery", "surgery_periodontal"],
	},
	{
		id: "prosthetics_precious",
		key: "prosthetics_precious",
		title: "Протезирование с драгметаллами",
		description: "Коронки и мостовидные протезы с использованием золота, платины, диоксида циркония",
		defaultExcluded: true,
		matchedCategories: ["prosthetics_precious", "prosthetics_luxury"],
	},
];

/** Номенклатурный справочник услуг Минздрава 804н для сопоставления ДМС */
export interface Nomenclature804nItem {
	readonly code: string;
	readonly name: string;
	readonly category: "therapy" | "surgery" | "hygiene" | "orthopedics" | "orthodontics" | "diagnostics" | "anesthesia";
	readonly categoryTitleRu: string;
	readonly defaultPriceRub: number;
	readonly standardCoveredDms: boolean;
	readonly uet?: number | undefined;
}

export const NOMENCLATURE_804N_CATALOG: readonly Nomenclature804nItem[] = [
	{
		code: "A16.07.002.001",
		name: "Восстановление зуба пломбой (I, V, VI класс по Блэку) с использованием светоотверждаемых материалов",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 4500,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "A16.07.002.002",
		name: "Восстановление зуба пломбой (II, III класс по Блэку)",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 5600,
		standardCoveredDms: true,
		uet: 1.5,
	},
	{
		code: "A16.07.002.003",
		name: "Восстановление зуба пломбой (IV класс по Блэку с разрушением более 1/2 коронки)",
		category: "therapy",
		categoryTitleRu: "Терапевтическая стоматология",
		defaultPriceRub: 7200,
		standardCoveredDms: true,
		uet: 2.25,
	},
	{
		code: "A16.07.030.001",
		name: "Инструментальная и медикаментозная обработка корневого канала (1 канал)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 3500,
		standardCoveredDms: true,
		uet: 1.25,
	},
	{
		code: "A16.07.030.002",
		name: "Инструментальная и медикаментозная обработка корневых каналов (2 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 5800,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.030.003",
		name: "Инструментальная и медикаментозная обработка корневых каналов (3 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 8200,
		standardCoveredDms: true,
		uet: 2.75,
	},
	{
		code: "A16.07.008.001",
		name: "Пломбирование корневого канала зуба гуттаперчей / биокерамикой (1 канал)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 4000,
		standardCoveredDms: true,
		uet: 1.25,
	},
	{
		code: "A16.07.008.002",
		name: "Пломбирование корневых каналов двухканального зуба (2 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 6700,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.008.003",
		name: "Пломбирование корневых каналов трехканального зуба (3 канала)",
		category: "therapy",
		categoryTitleRu: "Эндодонтия",
		defaultPriceRub: 9500,
		standardCoveredDms: true,
		uet: 2.75,
	},
	{
		code: "A16.07.001.001",
		name: "Удаление постоянного зуба (простое)",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 3200,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "A16.07.001.002",
		name: "Удаление зуба сложное с разъединением корней",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 5900,
		standardCoveredDms: true,
		uet: 2.0,
	},
	{
		code: "A16.07.024",
		name: "Операция удаления ретинированного, дистопированного или сверхкомплектного зуба",
		category: "surgery",
		categoryTitleRu: "Хирургическая стоматология",
		defaultPriceRub: 9800,
		standardCoveredDms: true,
		uet: 3.5,
	},
	{
		code: "A16.07.051",
		name: "Профессиональная гигиена полости рта и зубов (ультразвук + AirFlow + полировка)",
		category: "hygiene",
		categoryTitleRu: "Профилактика и гигиена",
		defaultPriceRub: 6500,
		standardCoveredDms: true,
		uet: 2.5,
	},
	{
		code: "A06.07.007",
		name: "Прицельная внутриротовая контактная рентгенография",
		category: "diagnostics",
		categoryTitleRu: "Диагностика и рентгенология",
		defaultPriceRub: 600,
		standardCoveredDms: true,
		uet: 0.5,
	},
	{
		code: "A06.07.004",
		name: "Ортопантомография (ОПТГ)",
		category: "diagnostics",
		categoryTitleRu: "Диагностика и рентгенология",
		defaultPriceRub: 1800,
		standardCoveredDms: true,
		uet: 1.0,
	},
	{
		code: "B01.003.004.001",
		name: "Местная анестезия (инфильтрационная, проводниковая, аппликационная)",
		category: "anesthesia",
		categoryTitleRu: "Анестезиология",
		defaultPriceRub: 900,
		standardCoveredDms: true,
		uet: 0.5,
	},
	{
		code: "A16.07.004",
		name: "Восстановление зуба коронкой металлокерамической",
		category: "orthopedics",
		categoryTitleRu: "Ортопедическая стоматология",
		defaultPriceRub: 18500,
		standardCoveredDms: false,
		uet: 4.0,
	},
	{
		code: "A16.07.006",
		name: "Установка дентального имплантата (хирургический этап)",
		category: "surgery",
		categoryTitleRu: "Имплантология",
		defaultPriceRub: 35000,
		standardCoveredDms: false,
		uet: 5.0,
	},
];

/** Структура гарантийного письма ДМС */
export interface DmsGuaranteeLetter {
	id: string;
	organizationId?: string | undefined;
	patientId: string;
	patientFullName: string;
	patientBirthDate?: string | undefined;
	policyNumber: string;
	insurerKey: string;
	insurerName: string;
	letterNumber: string;
	issueDate: string;
	validFrom: string;
	validUntil: string;
	maxCoverageRub: number;
	usedAmountRub: number;
	franchisePct: number;
	franchiseType: "percent" | "fixed_rub";
	franchiseFixedRub: number;
	programExclusions: string[];
	approvedServiceCodes: string[];
	approvedDiagnosisCodes: string[];
	notes: string;
	status: "active" | "expired" | "exhausted" | "cancelled";
}

/** Строка оказанной услуги для реестра ДМС */
export interface DmsRegistryServiceRecord {
	id: string;
	visitId: string;
	visitDate: string;
	patientId: string;
	patientFullName: string;
	policyNumber: string;
	letterNumber?: string | undefined;
	insurerName: string;
	serviceCode804n: string;
	serviceName: string;
	diagnosisCodeMkb10: string;
	toothNumber?: number | string | undefined;
	quantity: number;
	unitPriceRub: number;
	totalPriceRub: number;
	dmsCoveredRub: number;
	patientPaidRub: number;
	doctorFullName: string;
	isExcluded: boolean;
	exclusionReason?: string | undefined;
}

/** Сводка по реестру ДМС */
export interface DmsRegistrySummary {
	totalServicesCount: number;
	totalAmountRub: number;
	totalDmsCoveredRub: number;
	totalPatientPaidRub: number;
	uniquePatientsCount: number;
	periodStart: string;
	periodEnd: string;
	insurerName: string;
	isBalanced: boolean;
}

// ─── КОПЕЕЧНАЯ МАТЕМАТИКА ──────────────────────────────────────────────────

/** Преобразование рублей в копейки без двоичной погрешности */
export function rubToKopecks(rub: number): number {
	if (!Number.isFinite(rub)) return 0;
	return Math.round(rub * 100);
}

/** Преобразование копеек в рубли */
export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks)) return 0;
	return Math.round(kopecks) / 100;
}

/** Форматирование рублей и копеек на русском языке: "1 250,50 ₽" */
export function formatRubKopecks(rub: number): string {
	const safeRub = Number.isFinite(rub) ? rub : 0;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(safeRub);
}

/** Расчет распределения стоимости услуги между ДМС и пациентом (с учетом франшизы, лимита и исключений) */
export function calculateServiceDmsDistribution(params: {
	priceRub: number;
	quantity?: number | undefined;
	isExcluded?: boolean | undefined;
	franchisePct?: number | undefined;
	franchiseFixedRub?: number | undefined;
	remainingLetterLimitRub?: number | null | undefined;
	remainingPolicyLimitRub?: number | null | undefined;
	isExplicitlyApproved?: boolean | undefined;
}): {
	lineTotalRub: number;
	dmsCoveredRub: number;
	patientPaidRub: number;
	effectiveCoveragePct: number;
	reason: string;
} {
	const quantity = Math.max(1, Math.round(params.quantity ?? 1));
	const unitPriceKop = rubToKopecks(params.priceRub);
	const lineTotalKop = unitPriceKop * quantity;
	const lineTotalRub = kopecksToRub(lineTotalKop);

	if (lineTotalKop <= 0) {
		return {
			lineTotalRub: 0,
			dmsCoveredRub: 0,
			patientPaidRub: 0,
			effectiveCoveragePct: 0,
			reason: "Нулевая стоимость услуги",
		};
	}

	// 1. Исключение из программы (если услуга в списке исключений и НЕ одобрена персонально ГП)
	if (params.isExcluded && !params.isExplicitlyApproved) {
		return {
			lineTotalRub,
			dmsCoveredRub: 0,
			patientPaidRub: lineTotalRub,
			effectiveCoveragePct: 0,
			reason: "Услуга входит в перечень исключений полиса ДМС (100% оплата пациентом)",
		};
	}

	// 2. Расчет базового покрытия с учетом франшизы (софинансирования)
	let targetCoveredKop = lineTotalKop;
	let reason = "100% покрытие по условиям программы ДМС";

	if (params.franchisePct && params.franchisePct > 0) {
		const clampedFranchisePct = Math.min(100, Math.max(0, params.franchisePct));
		const patientShareKop = Math.round(lineTotalKop * (clampedFranchisePct / 100));
		targetCoveredKop = Math.max(0, lineTotalKop - patientShareKop);
		reason = `Покрытие ДМС с франшизой пациента ${clampedFranchisePct}%`;
	} else if (params.franchiseFixedRub && params.franchiseFixedRub > 0) {
		const fixedFranchiseKop = rubToKopecks(params.franchiseFixedRub);
		const patientShareKop = Math.min(lineTotalKop, fixedFranchiseKop);
		targetCoveredKop = Math.max(0, lineTotalKop - patientShareKop);
		reason = `Покрытие ДМС за вычетом фиксированной франшизы (${params.franchiseFixedRub} ₽)`;
	}

	// 3. Ограничение доступным лимитом гарантийного письма
	if (params.remainingLetterLimitRub != null && Number.isFinite(params.remainingLetterLimitRub)) {
		const availableLetterKop = Math.max(0, rubToKopecks(params.remainingLetterLimitRub));
		if (targetCoveredKop > availableLetterKop) {
			targetCoveredKop = availableLetterKop;
			reason += ` (ограничено остатком гарантийного письма: ${params.remainingLetterLimitRub} ₽)`;
		}
	}

	// 4. Ограничение доступным годовым лимитом полиса
	if (params.remainingPolicyLimitRub != null && Number.isFinite(params.remainingPolicyLimitRub)) {
		const availablePolicyKop = Math.max(0, rubToKopecks(params.remainingPolicyLimitRub));
		if (targetCoveredKop > availablePolicyKop) {
			targetCoveredKop = availablePolicyKop;
			reason += ` (ограничено годовым лимитом полиса: ${params.remainingPolicyLimitRub} ₽)`;
		}
	}

	// 5. Железобетонный расчет копеек доплаты пациента
	const patientPaidKop = lineTotalKop - targetCoveredKop;

	const dmsCoveredRub = kopecksToRub(targetCoveredKop);
	const patientPaidRub = kopecksToRub(patientPaidKop);
	const effectiveCoveragePct = lineTotalKop > 0 ? Math.round((targetCoveredKop / lineTotalKop) * 100) : 0;

	return {
		lineTotalRub,
		dmsCoveredRub,
		patientPaidRub,
		effectiveCoveragePct,
		reason,
	};
}

/** Расчет сводных итогов реестра */
export function calculateRegistryTotals(
	records: readonly DmsRegistryServiceRecord[],
	insurerName: string = "Все страховые компании",
	periodStart: string = "",
	periodEnd: string = "",
): DmsRegistrySummary {
	let totalAmountKop = 0;
	let totalDmsCoveredKop = 0;
	let totalPatientPaidKop = 0;
	const patientIds = new Set<string>();

	for (const r of records) {
		const amountKop = rubToKopecks(r.totalPriceRub);
		const dmsKop = rubToKopecks(r.dmsCoveredRub);
		const patientKop = rubToKopecks(r.patientPaidRub);

		totalAmountKop += amountKop;
		totalDmsCoveredKop += dmsKop;
		totalPatientPaidKop += patientKop;
		if (r.patientId) patientIds.add(r.patientId);
	}

	const isBalanced = totalDmsCoveredKop + totalPatientPaidKop === totalAmountKop;

	return {
		totalServicesCount: records.length,
		totalAmountRub: kopecksToRub(totalAmountKop),
		totalDmsCoveredRub: kopecksToRub(totalDmsCoveredKop),
		totalPatientPaidRub: kopecksToRub(totalPatientPaidKop),
		uniquePatientsCount: patientIds.size,
		periodStart,
		periodEnd,
		insurerName,
		isBalanced,
	};
}

/** Поиск номенклатурных услуг 804н по коду или названию */
export function search804nServices(query: string): Nomenclature804nItem[] {
	const q = query.trim().toLowerCase();
	if (!q) return [...NOMENCLATURE_804N_CATALOG];
	return NOMENCLATURE_804N_CATALOG.filter(
		(item) => item.code.toLowerCase().includes(q) || item.name.toLowerCase().includes(q) || item.categoryTitleRu.toLowerCase().includes(q),
	);
}

/**
 * Экспорт реестра в формат CSV (с поддержкой Excel, кодировка UTF-8 с BOM, разделитель ';')
 */
export function exportRegistryToCsv(
	records: readonly DmsRegistryServiceRecord[],
	clinicInfo: { name: string; inn: string; kpp?: string | undefined },
	insurerName: string,
	periodStr: string,
): string {
	const escapeCsv = (val: string | number | null | undefined): string => {
		if (val == null) return '""';
		const str = String(val).replace(/"/g, '""');
		return `"${str}"`;
	};

	const headerLines: string[] = [
		`# Реестр оказанных медицинских услуг по ДМС;${escapeCsv(clinicInfo.name)};ИНН: ${escapeCsv(clinicInfo.inn)}`,
		`# Страховая компания: ${escapeCsv(insurerName)};Период: ${escapeCsv(periodStr)}`,
		`# Дата формирования: ${new Date().toLocaleDateString("ru-RU")}`,
		"",
		[
			escapeCsv("№ п/п"),
			escapeCsv("Дата визита"),
			escapeCsv("ФИО Пациента"),
			escapeCsv("Номер полиса ДМС"),
			escapeCsv("№ Гар. письма"),
			escapeCsv("Код услуги 804н"),
			escapeCsv("Наименование услуги"),
			escapeCsv("Диагноз (МКБ-10)"),
			escapeCsv("Зуб"),
			escapeCsv("Кол-во"),
			escapeCsv("Цена за ед. (руб)"),
			escapeCsv("Сумма всего (руб)"),
			escapeCsv("Покрыто ДМС (руб)"),
			escapeCsv("Доплата пациента (руб)"),
			escapeCsv("Врач-стоматолог"),
			escapeCsv("Статус/Примечание"),
		].join(";"),
	];

	const rows = records.map((r, idx) => {
		return [
			escapeCsv(idx + 1),
			escapeCsv(r.visitDate),
			escapeCsv(r.patientFullName),
			escapeCsv(r.policyNumber),
			escapeCsv(r.letterNumber || "—"),
			escapeCsv(r.serviceCode804n),
			escapeCsv(r.serviceName),
			escapeCsv(r.diagnosisCodeMkb10 || "—"),
			escapeCsv(r.toothNumber || "—"),
			escapeCsv(r.quantity),
			escapeCsv(r.unitPriceRub.toFixed(2)),
			escapeCsv(r.totalPriceRub.toFixed(2)),
			escapeCsv(r.dmsCoveredRub.toFixed(2)),
			escapeCsv(r.patientPaidRub.toFixed(2)),
			escapeCsv(r.doctorFullName || "—"),
			escapeCsv(r.isExcluded ? `Исключение (${r.exclusionReason || "не покрывается"})` : "Покрыто ДМС"),
		].join(";");
	});

	const totals = calculateRegistryTotals(records, insurerName, "", "");
	const totalRow = [
		escapeCsv("ИТОГО"),
		escapeCsv(""),
		escapeCsv(`Пациентов: ${totals.uniquePatientsCount}`),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(`Всего услуг: ${totals.totalServicesCount}`),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(""),
		escapeCsv(totals.totalAmountRub.toFixed(2)),
		escapeCsv(totals.totalDmsCoveredRub.toFixed(2)),
		escapeCsv(totals.totalPatientPaidRub.toFixed(2)),
		escapeCsv(""),
		escapeCsv(totals.isBalanced ? "БАЛАНС СХОДИТСЯ" : "ОШИБКА БАЛАНСА"),
	].join(";");

	const csvContent = "\uFEFF" + [...headerLines, ...rows, "", totalRow].join("\r\n");
	return csvContent;
}

/**
 * Генерация HTML-шаблона двустороннего акта сдачи-приемки оказанных услуг по ДМС для печати
 */
export function generateBilateralAcceptanceActHtml(params: {
	records: readonly DmsRegistryServiceRecord[];
	summary: DmsRegistrySummary;
	clinicInfo: {
		name: string;
		inn: string;
		kpp?: string | undefined;
		ogrn?: string | undefined;
		address: string;
		chiefDoctor: string;
		bankAccount?: string | undefined;
		bic?: string | undefined;
		corrAccount?: string | undefined;
	};
	insurerInfo: {
		name: string;
		inn?: string | undefined;
		ogrn?: string | undefined;
		contractNumber: string;
		contractDate: string;
		representative: string;
	};
	actNumber: string;
	actDate: string;
}): string {
	const { records, summary, clinicInfo, insurerInfo, actNumber, actDate } = params;

	const rowsHtml = records
		.map(
			(r, i) => `
		<tr>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${i + 1}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.visitDate}</td>
			<td style="border: 1px solid #000; padding: 4px; font-weight: 600;">${r.patientFullName}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.policyNumber}</td>
			<td style="border: 1px solid #000; padding: 4px; font-family: monospace;">${r.serviceCode804n}</td>
			<td style="border: 1px solid #000; padding: 4px;">${r.serviceName} ${r.toothNumber ? `(зуб ${r.toothNumber})` : ""}</td>
			<td style="text-align: center; border: 1px solid #000; padding: 4px;">${r.quantity}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.unitPriceRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px; font-weight: bold;">${formatRubKopecks(r.dmsCoveredRub)}</td>
			<td style="text-align: right; border: 1px solid #000; padding: 4px;">${formatRubKopecks(r.patientPaidRub)}</td>
		</tr>
	`,
		)
		.join("");

	return `
<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт сдачи-приемки оказанных медицинских услуг ДМС № ${actNumber}</title>
	<style>
		@page { size: A4 portrait; margin: 15mm; }
		body { font-family: 'Times New Roman', serif; font-size: 11pt; line-height: 1.3; color: #000; margin: 0; padding: 10px; }
		h1 { font-size: 14pt; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
		.subtitle { text-align: center; font-size: 11pt; margin-bottom: 16px; }
		.parties { margin-bottom: 14px; text-align: justify; }
		table.registry-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 9.5pt; }
		table.registry-table th { border: 1px solid #000; background: #f0f0f0; padding: 5px; text-align: center; font-weight: bold; }
		.totals-block { margin: 16px 0; font-size: 11pt; }
		.totals-block strong { font-size: 12pt; }
		.signatures { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
		.sign-box { width: 46%; border-top: 1px solid #000; padding-top: 8px; }
		.sign-title { font-weight: bold; margin-bottom: 6px; }
		.stamp-place { margin-top: 40px; font-size: 9pt; color: #555; }
		@media print {
			body { padding: 0; }
			.no-print { display: none; }
		}
	</style>
</head>
<body>
	<h1>АКТ СДАЧИ-ПРИЕМКИ № ${actNumber}</h1>
	<div class="subtitle">оказанных медицинских услуг по Договору ДМС № ${insurerInfo.contractNumber} от ${insurerInfo.contractDate} г.</div>
	<div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold;">
		<div>г. Москва</div>
		<div>${actDate} г.</div>
	</div>

	<div class="parties">
		<strong>Исполнитель:</strong> ${clinicInfo.name}, ИНН ${clinicInfo.inn}, ОГРН ${clinicInfo.ogrn || "—"}, адрес: ${clinicInfo.address}, в лице Главного врача ${clinicInfo.chiefDoctor}, с одной стороны, и<br>
		<strong>Заказчик (Страховщик):</strong> ${insurerInfo.name}, ИНН ${insurerInfo.inn || "—"}, в лице ${insurerInfo.representative}, с другой стороны, составили настоящий Акт о нижеследующем:
	</div>

	<div style="margin-bottom: 8px;">
		1. В соответствии с условиями Договора ДМС Исполнителем в период с <strong>${summary.periodStart || "начало месяца"}</strong> по <strong>${summary.periodEnd || "конец месяца"}</strong> были надлежащим образом и в полном объеме оказаны медицинские услуги застрахованным лицам Заказчика:
	</div>

	<table class="registry-table">
		<thead>
			<tr>
				<th>№</th>
				<th>Дата</th>
				<th>Застрахованный (Пациент)</th>
				<th>Полис ДМС</th>
				<th>Код 804н</th>
				<th>Наименование услуги</th>
				<th>Кол-во</th>
				<th>Тариф (руб)</th>
				<th>К оплате ДМС</th>
				<th>Доплата пациента</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #fafafa;">
				<td colspan="6" style="border: 1px solid #000; padding: 6px; text-align: right;">ИТОГО К ОПЛАТЕ СТРАХОВЩИКОМ:</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: center;">${summary.totalServicesCount}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalAmountRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right; color: #000; font-size: 10.5pt;">${formatRubKopecks(summary.totalDmsCoveredRub)}</td>
				<td style="border: 1px solid #000; padding: 6px; text-align: right;">${formatRubKopecks(summary.totalPatientPaidRub)}</td>
			</tr>
		</tbody>
	</table>

	<div class="totals-block">
		2. Общая стоимость оказанных медицинских услуг составляет <strong>${formatRubKopecks(summary.totalAmountRub)}</strong>.<br>
		3. Сумма, подлежащая перечислению Страховщиком на расчетный счет Исполнителя: <strong>${formatRubKopecks(summary.totalDmsCoveredRub)}</strong> (НДС не облагается на основании пп. 2 п. 2 ст. 149 НК РФ).<br>
		4. Сумма софинансирования/доплаты, оплаченная непосредственно пациентами: <strong>${formatRubKopecks(summary.totalPatientPaidRub)}</strong>.<br>
		5. Стороны взаимных претензий по объему, качеству и срокам оказания медицинских услуг не имеют.
	</div>

	<div class="signatures">
		<div class="sign-box">
			<div class="sign-title">ОТ ИСПОЛНИТЕЛЯ (Клиника):</div>
			<div>${clinicInfo.name}</div>
			<div style="margin-top: 15px;">Главный врач: ________________ / ${clinicInfo.chiefDoctor} /</div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div class="sign-box">
			<div class="sign-title">ОТ ЗАКАЗЧИКА (Страховщик):</div>
			<div>${insurerInfo.name}</div>
			<div style="margin-top: 15px;">Представитель: ________________ / ${insurerInfo.representative} /</div>
			<div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>
`;
}
