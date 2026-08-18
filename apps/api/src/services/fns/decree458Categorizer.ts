/**
 * Government Decree No. 458 Expense Categorization Engine
 * Partitions dental medical services into:
 * - Code "1": Standard dental treatment (150,000 RUB deduction limit per Tax Code RF Art. 219)
 * - Code "2": Expensive treatment (Decree No. 458 Item 4 - unlimited tax deduction for complicated dental implantation,
 *             bone grafting, sinus lifting, and alveolar ridge reconstruction).
 */

export interface DentalServiceItemForFns {
	serviceId?: string;
	order804nCode?: string;
	serviceName: string;
	quantity: number;
	priceRub: number;
	isDecree458Expensive?: boolean;
}

export interface CategorizationResult {
	code: "1" | "2";
	reason: string;
	isExpensiveDecree458: boolean;
}

export interface PartitionedInvoiceSummary {
	code1TotalRub: number;
	code2TotalRub: number;
	grandTotalRub: number;
	code1Items: DentalServiceItemForFns[];
	code2Items: DentalServiceItemForFns[];
	itemsBreakdown: Array<{
		item: DentalServiceItemForFns;
		categoryCode: "1" | "2";
		reason: string;
		totalAmountRub: number;
	}>;
}

// Prefixes and Order 804n nomenclature codes classified under Decree No. 458 Item 4
const EXPENSIVE_804N_CODE_PREFIXES = [
	"A16.07.054", // Внутрикостная дентальная имплантация
	"A16.07.055", // Синус-лифтинг (костная пластика дна гайморовой пазухи)
	"A16.07.040", // Костная пластика челюстно-лицевой области / аугментация альвеолярного отростка
	"A16.07.006.001", // Остеотомия челюсти при реконструктивных вмешательствах
	"A16.07.098", // Установка скуловых имплантатов (Зигома / Zygoma)
	"A16.07.041", // Расщепление альвеолярного гребня
	"A16.07.026.002", // Гингивопластика в области имплантата при костной аугментации
];

// Clinical keywords designating expensive treatment under Decree 458 Item 4
const EXPENSIVE_KEYWORDS = [
	"имплантаци",
	"имплантат",
	"синус-лифтинг",
	"синуслифтинг",
	"костная пластика",
	"аугментация",
	"мембрана",
	"биоматериал",
	"bio-oss",
	"bio-gide",
	"нbone",
	"расщепление гребня",
	"зигома",
	"zygoma",
	"all-on-4",
	"all-on-6",
	"все на четырех",
	"все на шести",
	"направленная костная регенерация",
	"нкр",
	"пересадка костного блока",
];

// Exceptions: Standard procedures that mention implants but are not surgical implantation
const STANDARD_IMPLANT_MAINTENANCE_KEYWORDS = [
	"профессиональная гигиена",
	"чистка имплантатов",
	"полировка",
	"снятие слепка",
	"оттиск",
	"временная коронка",
];

/**
 * Categorizes an individual dental service item into Code 1 vs Code 2.
 */
export function categorizeDentalService(
	order804nCode?: string,
	serviceName?: string,
	clinicalContext?: string,
	hasVkProtocolJustification = false,
	isExplicitExpensive?: boolean,
): CategorizationResult {
	// If explicitly overridden
	if (isExplicitExpensive === true) {
		return {
			code: "2",
			reason:
				"Явное указание дорогостоящего лечения по Постановлению № 458 (п. 4)",
			isExpensiveDecree458: true,
		};
	}

	const cleanCode = (order804nCode || "").trim();
	const cleanName = (serviceName || "").toLowerCase();
	const cleanContext = (clinicalContext || "").toLowerCase();

	// 1. Check exact Order 804n prefixes
	for (const prefix of EXPENSIVE_804N_CODE_PREFIXES) {
		if (cleanCode.startsWith(prefix)) {
			return {
				code: "2",
				reason: `Код номенклатуры 804н '${cleanCode}' отнесен к дорогостоящему лечению (Постановление № 458 п. 4: дентальная имплантация / костная пластика)`,
				isExpensiveDecree458: true,
			};
		}
	}

	// 2. Check for maintenance / standard exceptions first
	for (const maint of STANDARD_IMPLANT_MAINTENANCE_KEYWORDS) {
		if (cleanName.includes(maint)) {
			return {
				code: "1",
				reason: `Услуга '${serviceName}' относится к стандартному терапевтическому/гигиеническому обслуживанию (Код 1)`,
				isExpensiveDecree458: false,
			};
		}
	}

	// 3. Keyword matching in service description or clinical context
	for (const kw of EXPENSIVE_KEYWORDS) {
		if (cleanName.includes(kw) || cleanContext.includes(kw)) {
			return {
				code: "2",
				reason: `Услуга '${serviceName}' содержит маркер дорогостоящего лечения '${kw}' по Постановлению № 458 п. 4`,
				isExpensiveDecree458: true,
			};
		}
	}

	// 4. Clinical Context with VK Protocol
	if (
		hasVkProtocolJustification &&
		(cleanContext.includes("атрофия") || cleanContext.includes("дефект кости"))
	) {
		return {
			code: "2",
			reason:
				"Лечение со сложной костной пластикой подтверждено протоколом врачебной комиссии (ВК) по Постановлению № 458 п. 4",
			isExpensiveDecree458: true,
		};
	}

	// Default: Code 1 (Standard treatment)
	return {
		code: "1",
		reason:
			"Стандартное стоматологическое лечение (терапия, ортопедия, профилактика, ортодонтия) в пределах лимита 150 000 руб.",
		isExpensiveDecree458: false,
	};
}

/**
 * Partitions an entire dental invoice into Code 1 and Code 2 sums and lists.
 */
export function partitionInvoiceForFns(
	items: DentalServiceItemForFns[],
	clinicalContext?: string,
	hasVkProtocol = false,
): PartitionedInvoiceSummary {
	let code1TotalRub = 0;
	let code2TotalRub = 0;
	const code1Items: DentalServiceItemForFns[] = [];
	const code2Items: DentalServiceItemForFns[] = [];
	const itemsBreakdown: PartitionedInvoiceSummary["itemsBreakdown"] = [];

	for (const item of items) {
		const totalItemAmount = Math.round(item.priceRub * item.quantity * 100) / 100;
		const categorization = categorizeDentalService(
			item.order804nCode,
			item.serviceName,
			clinicalContext,
			hasVkProtocol,
			item.isDecree458Expensive,
		);

		if (categorization.code === "2") {
			code2TotalRub = Math.round((code2TotalRub + totalItemAmount) * 100) / 100;
			code2Items.push(item);
		} else {
			code1TotalRub = Math.round((code1TotalRub + totalItemAmount) * 100) / 100;
			code1Items.push(item);
		}

		itemsBreakdown.push({
			item,
			categoryCode: categorization.code,
			reason: categorization.reason,
			totalAmountRub: totalItemAmount,
		});
	}

	const grandTotalRub = Math.round((code1TotalRub + code2TotalRub) * 100) / 100;

	return {
		code1TotalRub,
		code2TotalRub,
		grandTotalRub,
		code1Items,
		code2Items,
		itemsBreakdown,
	};
}
