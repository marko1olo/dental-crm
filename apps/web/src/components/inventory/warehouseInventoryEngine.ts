/**
 * ============================================================================
 * WAREHOUSE INVENTORY AUDIT & FEFO ENGINE (ИНВ-3, ИНВ-19, ТОРГ-16)
 * Математическое и нормативное ядро складской инвентаризации стоматологической клиники:
 * - Инвентаризационная опись ТМЦ (форма ИНВ-3, ОКУД 0317004)
 * - Сличительная ведомость расхождений (форма ИНВ-19, ОКУД 0317019)
 * - Партионный учет и контроль сроков годности FEFO (First-Expired, First-Out)
 * - Актирование списания просроченных ТМЦ (форма ТОРГ-16, ОКУД 0330216)
 * - Расчет излишков, недостач и копеечного баланса (пп. 2 п. 2 ст. 149 НК РФ / 54-ФЗ)
 * - Выгрузка данных в CSV (UTF-8 BOM) и 1C CommerceML XML
 * ============================================================================
 */

export type WarehouseInventoryStatus =
	| "draft"
	| "in_progress"
	| "reconciliation"
	| "approved"
	| "applied"
	| "cancelled";

export type FefoStatus = "fresh" | "warning_60" | "warning_30" | "expired";

export type InventoryDiscrepancyType = "match" | "surplus" | "shortage";

export type WarehouseCommissionRole = "chairman" | "member" | "accountant" | "mol";

export interface WarehouseInventoryCommissionMember {
	readonly fullName: string;
	readonly position: string;
	readonly role: WarehouseCommissionRole;
	readonly roleRu?: string | undefined;
}

export interface WarehouseAuditItemLine {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly manufactureDate?: string | undefined;
	readonly expiryDate: string;
	readonly storageLocationRu?: string | undefined;
	readonly temperatureRegimeRu?: string | undefined;
	readonly bookQuantity: number;
	readonly actualQuantity: number;
	readonly unitCostKopecks: number;
	readonly discrepancyType: InventoryDiscrepancyType;
	readonly discrepancyQuantity: number;
	readonly bookTotalKopecks: number;
	readonly actualTotalKopecks: number;
	readonly discrepancyCostKopecks: number;
	readonly fefoStatus: FefoStatus;
	readonly daysUntilExpiration: number;
	readonly isWriteoffRequired: boolean;
	readonly notes?: string | undefined;
}

export interface WarehouseInventoryAuditDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly auditStartDate: string;
	readonly auditEndDate: string;
	readonly auditDate: string;
	readonly branchId: string;
	readonly branchNameRu: string;
	readonly warehouseNameRu: string;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly status: WarehouseInventoryStatus;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly items: readonly WarehouseAuditItemLine[];
	readonly notes?: string | undefined;
	readonly organizationNameRu: string;
	readonly organizationOkpo: string;
	readonly organizationInn: string;
}

export interface InventoryAuditTotals {
	readonly totalItemsCount: number;
	readonly matchedItemsCount: number;
	readonly surplusItemsCount: number;
	readonly shortageItemsCount: number;
	readonly expiredItemsCount: number;
	readonly warningItemsCount: number;
	readonly totalBookQuantity: number;
	readonly totalActualQuantity: number;
	readonly totalSurplusQuantity: number;
	readonly totalShortageQuantity: number;
	readonly totalBookCostKopecks: number;
	readonly totalActualCostKopecks: number;
	readonly totalSurplusCostKopecks: number;
	readonly totalShortageCostKopecks: number;
	readonly netDiscrepancyCostKopecks: number;
	readonly totalExpiredCostKopecks: number;
	readonly totalBookCostRubles: number;
	readonly totalActualCostRubles: number;
	readonly totalSurplusCostRubles: number;
	readonly totalShortageCostRubles: number;
	readonly netDiscrepancyCostRubles: number;
	readonly totalExpiredCostRubles: number;
}

export interface Torg16WriteoffLineItem {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly quantity: number;
	readonly unitCostKopecks: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
	readonly defectDescriptionRu: string;
}

export interface WarehouseTorg16WriteoffAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly inventoryDocNumber: string;
	readonly organizationNameRu: string;
	readonly organizationOkpo: string;
	readonly organizationInn: string;
	readonly warehouseNameRu: string;
	readonly molFullName: string;
	readonly molPosition: string;
	readonly reasonRu: string;
	readonly commission: readonly WarehouseInventoryCommissionMember[];
	readonly items: readonly Torg16WriteoffLineItem[];
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly totalCostRubles: number;
}

// ---------------------------------------------------------------------------
// Конвертация валют и копеечная арифметика
// ---------------------------------------------------------------------------

export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

export function rublesToKopecks(rubles: number): number {
	return Math.round(rubles * 100);
}

export function formatRubCurrency(rublesOrKopecks: number, isKopecks = false): string {
	const rub = isKopecks ? kopecksToRubles(rublesOrKopecks) : rublesOrKopecks;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

export function formatKopecksToRublesPlain(kopecks: number): string {
	return (Math.round(kopecks) / 100).toFixed(2);
}

/**
 * Пропись суммы в рублях и копейках для официальных бланков РФ (ИНВ-3, ИНВ-19, ТОРГ-16)
 */
export function numberToRussianWordsKopecks(kopecks: number): string {
	const absKopecks = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(absKopecks / 100);
	const kop = absKopecks % 100;

	if (rubles === 0) {
		return `Ноль рублей ${kop.toString().padStart(2, "0")} копеек`;
	}

	const onesMap = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const onesFemMap = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
	const teensMap = [
		"десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать",
		"пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать",
	];
	const tensMap = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
	const hundredsMap = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];

	function tripletToWords(num: number, isFemale: boolean): string {
		const h = Math.floor(num / 100);
		const t = Math.floor((num % 100) / 10);
		const o = num % 10;
		const parts: string[] = [];

		if (h > 0) parts.push(hundredsMap[h] || "");
		if (t === 1) {
			parts.push(teensMap[o] || "");
		} else {
			if (t > 1) parts.push(tensMap[t] || "");
			if (o > 0) parts.push((isFemale ? onesFemMap : onesMap)[o] || "");
		}
		return parts.filter(Boolean).join(" ");
	}

	function pluralize(n: number, forms: [string, string, string]): string {
		const rem100 = n % 100;
		const rem10 = n % 10;
		if (rem100 >= 11 && rem100 <= 19) return forms[2];
		if (rem10 === 1) return forms[0];
		if (rem10 >= 2 && rem10 <= 4) return forms[1];
		return forms[2];
	}

	const billions = Math.floor(rubles / 1_000_000_000);
	const millions = Math.floor((rubles % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((rubles % 1_000_000) / 1_000);
	const remainder = rubles % 1_000;

	const wordChunks: string[] = [];

	if (billions > 0) {
		wordChunks.push(tripletToWords(billions, false));
		wordChunks.push(pluralize(billions, ["миллиард", "миллиарда", "миллиардов"]));
	}
	if (millions > 0) {
		wordChunks.push(tripletToWords(millions, false));
		wordChunks.push(pluralize(millions, ["миллион", "миллиона", "миллионов"]));
	}
	if (thousands > 0) {
		wordChunks.push(tripletToWords(thousands, true));
		wordChunks.push(pluralize(thousands, ["тысяча", "тысячи", "тысяч"]));
	}
	if (remainder > 0) {
		wordChunks.push(tripletToWords(remainder, false));
	}

	const rubText = pluralize(rubles, ["рубль", "рубля", "рублей"]);
	const kopText = pluralize(kop, ["копейка", "копейки", "копеек"]);
	const combinedWords = wordChunks.filter(Boolean).join(" ");
	const capitalized = combinedWords ? combinedWords.charAt(0).toUpperCase() + combinedWords.slice(1) : "Ноль";

	return `${capitalized} ${rubText} ${kop.toString().padStart(2, "0")} ${kopText}`;
}

// ---------------------------------------------------------------------------
// FEFO (First-Expired, First-Out) расчёт сроков годности
// ---------------------------------------------------------------------------

export function calculateDaysUntilExpiration(expiryDateStr: string, referenceDateStr?: string): number {
	const refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
	const expDate = new Date(expiryDateStr);

	if (Number.isNaN(refDate.getTime()) || Number.isNaN(expDate.getTime())) {
		return 0;
	}

	const diffTime = expDate.getTime() - refDate.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFefoStatus(
	expiryDateStr: string,
	referenceDateStr?: string,
): {
	fefoStatus: FefoStatus;
	daysUntilExpiration: number;
	badgeLabelRu: string;
	hexColor: string;
	cssModifier: string;
} {
	const days = calculateDaysUntilExpiration(expiryDateStr, referenceDateStr);

	if (days <= 0) {
		return {
			fefoStatus: "expired",
			daysUntilExpiration: days,
			badgeLabelRu: "Просрочен",
			hexColor: "#ef4444",
			cssModifier: "expired",
		};
	}
	if (days <= 30) {
		return {
			fefoStatus: "warning_30",
			daysUntilExpiration: days,
			badgeLabelRu: `< 30 дней (${days} дн.)`,
			hexColor: "#f97316",
			cssModifier: "warning-30",
		};
	}
	if (days <= 60) {
		return {
			fefoStatus: "warning_60",
			daysUntilExpiration: days,
			badgeLabelRu: `< 60 дней (${days} дн.)`,
			hexColor: "#eab308",
			cssModifier: "warning-60",
		};
	}
	return {
		fefoStatus: "fresh",
		daysUntilExpiration: days,
		badgeLabelRu: `Свежий (${days} дн.)`,
		hexColor: "#10b981",
		cssModifier: "fresh",
	};
}

export function sortAuditItemsByFefo(items: readonly WarehouseAuditItemLine[]): WarehouseAuditItemLine[] {
	return [...items].sort((a, b) => {
		const diff = a.daysUntilExpiration - b.daysUntilExpiration;
		if (diff !== 0) return diff;
		return a.nameRu.localeCompare(b.nameRu, "ru");
	});
}

// ---------------------------------------------------------------------------
// Создание и пересчёт строк инвентаризации
// ---------------------------------------------------------------------------

export function computeAuditLineItem(
	raw: {
		readonly itemId: string;
		readonly sku: string;
		readonly nameRu: string;
		readonly category?: string | undefined;
		readonly unitRu: string;
		readonly okeiCode: string;
		readonly batchNumber: string;
		readonly manufactureDate?: string | undefined;
		readonly expiryDate: string;
		readonly storageLocationRu?: string | undefined;
		readonly temperatureRegimeRu?: string | undefined;
		readonly bookQuantity: number;
		readonly actualQuantity: number;
		readonly unitCostKopecks: number;
		readonly notes?: string | undefined;
		readonly isWriteoffRequired?: boolean | undefined;
	},
	referenceDateStr?: string,
): WarehouseAuditItemLine {
	const bookQty = Math.max(0, raw.bookQuantity);
	const actQty = Math.max(0, raw.actualQuantity);
	const unitCost = Math.max(0, Math.round(raw.unitCostKopecks));
	const qtyDiff = actQty - bookQty;

	let discrepancyType: InventoryDiscrepancyType = "match";
	if (qtyDiff > 0) {
		discrepancyType = "surplus";
	} else if (qtyDiff < 0) {
		discrepancyType = "shortage";
	}

	const bookTotalKopecks = Math.round(bookQty * unitCost);
	const actualTotalKopecks = Math.round(actQty * unitCost);
	const discrepancyCostKopecks = Math.round(qtyDiff * unitCost);

	const fefoInfo = calculateFefoStatus(raw.expiryDate, referenceDateStr);
	const isWriteoffRequired = raw.isWriteoffRequired || fefoInfo.fefoStatus === "expired";

	return {
		itemId: raw.itemId,
		sku: raw.sku,
		nameRu: raw.nameRu,
		category: raw.category || "Общие стоматологические материалы",
		unitRu: raw.unitRu,
		okeiCode: raw.okeiCode,
		batchNumber: raw.batchNumber,
		manufactureDate: raw.manufactureDate,
		expiryDate: raw.expiryDate,
		storageLocationRu: raw.storageLocationRu || "Складской бокс A-1",
		temperatureRegimeRu: raw.temperatureRegimeRu || "+15°C..+25°C",
		bookQuantity: bookQty,
		actualQuantity: actQty,
		unitCostKopecks: unitCost,
		discrepancyType,
		discrepancyQuantity: qtyDiff,
		bookTotalKopecks,
		actualTotalKopecks,
		discrepancyCostKopecks,
		fefoStatus: fefoInfo.fefoStatus,
		daysUntilExpiration: fefoInfo.daysUntilExpiration,
		isWriteoffRequired,
		notes: raw.notes,
	};
}

// ---------------------------------------------------------------------------
// Расчет сводных итогов инвентаризации
// ---------------------------------------------------------------------------

export function calculateInventoryAuditTotals(
	items: readonly WarehouseAuditItemLine[],
): InventoryAuditTotals {
	let matchedItemsCount = 0;
	let surplusItemsCount = 0;
	let shortageItemsCount = 0;
	let expiredItemsCount = 0;
	let warningItemsCount = 0;

	let totalBookQuantity = 0;
	let totalActualQuantity = 0;
	let totalSurplusQuantity = 0;
	let totalShortageQuantity = 0;

	let totalBookCostKopecks = 0;
	let totalActualCostKopecks = 0;
	let totalSurplusCostKopecks = 0;
	let totalShortageCostKopecks = 0;
	let totalExpiredCostKopecks = 0;

	for (const item of items) {
		totalBookQuantity += item.bookQuantity;
		totalActualQuantity += item.actualQuantity;
		totalBookCostKopecks += item.bookTotalKopecks;
		totalActualCostKopecks += item.actualTotalKopecks;

		if (item.fefoStatus === "expired") {
			expiredItemsCount += 1;
			totalExpiredCostKopecks += item.actualTotalKopecks;
		} else if (item.fefoStatus === "warning_30" || item.fefoStatus === "warning_60") {
			warningItemsCount += 1;
		}

		if (item.discrepancyType === "match") {
			matchedItemsCount += 1;
		} else if (item.discrepancyType === "surplus") {
			surplusItemsCount += 1;
			totalSurplusQuantity += item.discrepancyQuantity;
			totalSurplusCostKopecks += item.discrepancyCostKopecks;
		} else if (item.discrepancyType === "shortage") {
			shortageItemsCount += 1;
			const absShortageQty = Math.abs(item.discrepancyQuantity);
			totalShortageQuantity += absShortageQty;
			totalShortageCostKopecks += Math.abs(item.discrepancyCostKopecks);
		}
	}

	const netDiscrepancyCostKopecks = totalActualCostKopecks - totalBookCostKopecks;

	return {
		totalItemsCount: items.length,
		matchedItemsCount,
		surplusItemsCount,
		shortageItemsCount,
		expiredItemsCount,
		warningItemsCount,
		totalBookQuantity,
		totalActualQuantity,
		totalSurplusQuantity,
		totalShortageQuantity,
		totalBookCostKopecks,
		totalActualCostKopecks,
		totalSurplusCostKopecks,
		totalShortageCostKopecks,
		netDiscrepancyCostKopecks,
		totalExpiredCostKopecks,
		totalBookCostRubles: kopecksToRubles(totalBookCostKopecks),
		totalActualCostRubles: kopecksToRubles(totalActualCostKopecks),
		totalSurplusCostRubles: kopecksToRubles(totalSurplusCostKopecks),
		totalShortageCostRubles: kopecksToRubles(totalShortageCostKopecks),
		netDiscrepancyCostRubles: kopecksToRubles(netDiscrepancyCostKopecks),
		totalExpiredCostRubles: kopecksToRubles(totalExpiredCostKopecks),
	};
}

// ---------------------------------------------------------------------------
// Валидация документа инвентаризации
// ---------------------------------------------------------------------------

export function validateInventoryAuditDraft(
	doc: Partial<WarehouseInventoryAuditDocument>,
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!doc.documentNumber || doc.documentNumber.trim().length === 0) {
		errors.push("Номер инвентаризационной описи обязателен.");
	}

	if (!doc.orderNumber || doc.orderNumber.trim().length === 0) {
		errors.push("Номер приказа о проведении инвентаризации (ИНВ-22) обязателен.");
	}

	if (!doc.molFullName || doc.molFullName.trim().length === 0) {
		errors.push("ФИО материально ответственного лица (МОЛ) обязательно.");
	}

	if (!doc.commission || doc.commission.length === 0) {
		errors.push("Комиссия должна состоять минимум из двух уполномоченных членов.");
	} else if (!doc.commission.some((c) => c.role === "chairman")) {
		warnings.push("В составе инвентаризационной комиссии не указан председатель.");
	}

	if (!doc.items || doc.items.length === 0) {
		errors.push("Инвентаризационная опись должна содержать хотя бы одну позицию ТМЦ.");
	} else {
		for (const it of doc.items) {
			if (it.bookQuantity < 0 || it.actualQuantity < 0) {
				errors.push(`Товар «${it.nameRu}» содержит отрицательное количество.`);
			}
			if (!it.batchNumber || it.batchNumber.trim().length === 0) {
				warnings.push(`Товар «${it.nameRu}» не имеет номера серии (LOT).`);
			}
			if (it.fefoStatus === "expired") {
				warnings.push(`Товар «${it.nameRu}» (партия ${it.batchNumber}) просрочен и подлежит списанию по ТОРГ-16.`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

// ---------------------------------------------------------------------------
// Формирование акта списания по сроку годности (ТОРГ-16)
// ---------------------------------------------------------------------------

export function generateTorg16ActFromInventory(
	doc: WarehouseInventoryAuditDocument,
	customReason?: string,
): WarehouseTorg16WriteoffAct {
	const expiredLines = doc.items.filter(
		(it) => it.isWriteoffRequired || it.fefoStatus === "expired" || it.daysUntilExpiration <= 0,
	);

	let totalQuantity = 0;
	let totalCostKopecks = 0;

	const items: Torg16WriteoffLineItem[] = expiredLines.map((it) => {
		const qty = it.actualQuantity > 0 ? it.actualQuantity : it.bookQuantity;
		const lineCost = Math.round(qty * it.unitCostKopecks);
		totalQuantity += qty;
		totalCostKopecks += lineCost;

		return {
			itemId: it.itemId,
			sku: it.sku,
			nameRu: it.nameRu,
			unitRu: it.unitRu,
			okeiCode: it.okeiCode,
			batchNumber: it.batchNumber,
			expiryDate: it.expiryDate,
			quantity: qty,
			unitCostKopecks: it.unitCostKopecks,
			totalCostKopecks: lineCost,
			totalCostRubles: kopecksToRubles(lineCost),
			defectDescriptionRu: `Истек срок годности (${it.expiryDate}), выбытие по FEFO аудиту`,
		};
	});

	return {
		actNumber: `ТОРГ-16-${doc.documentNumber.replace(/[^0-9a-zA-Zа-яА-Я-]/g, "")}`,
		actDate: doc.auditDate || new Date().toISOString().slice(0, 10),
		inventoryDocNumber: doc.documentNumber,
		organizationNameRu: doc.organizationNameRu,
		organizationOkpo: doc.organizationOkpo,
		organizationInn: doc.organizationInn,
		warehouseNameRu: doc.warehouseNameRu,
		molFullName: doc.molFullName,
		molPosition: doc.molPosition,
		reasonRu: customReason || "Истечение гарантированного срока годности материалов (FEFO контроль)",
		commission: doc.commission,
		items,
		totalQuantity,
		totalCostKopecks,
		totalCostRubles: kopecksToRubles(totalCostKopecks),
	};
}

// ---------------------------------------------------------------------------
// Экспорт в CSV (UTF-8 BOM)
// ---------------------------------------------------------------------------

export function exportInventoryToCsv(doc: WarehouseInventoryAuditDocument): string {
	const header = [
		"№ п/п",
		"Артикул",
		"Наименование ТМЦ",
		"Категория",
		"Ед.изм",
		"Код ОКЕИ",
		"Партия (LOT)",
		"Срок годности",
		"FEFO Статус",
		"Учетное кол-во",
		"Фактическое кол-во",
		"Разница (кол-во)",
		"Тип расхождения",
		"Учетная цена (руб)",
		"Учетная сумма (руб)",
		"Фактическая сумма (руб)",
		"Излишек (руб)",
		"Недостача (руб)",
		"Место хранения",
	].join(";");

	const rows = doc.items.map((it, idx) => {
		const surplusRub = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageRub = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";
		const fefoRu = it.fefoStatus === "expired" ? "Просрочен" : it.fefoStatus === "warning_30" ? "<30 дней" : it.fefoStatus === "warning_60" ? "<60 дней" : "Свежий";
		const discRu = it.discrepancyType === "surplus" ? "Излишек" : it.discrepancyType === "shortage" ? "Недостача" : "Норма";

		return [
			idx + 1,
			`"${it.sku.replace(/"/g, '""')}"`,
			`"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.category.replace(/"/g, '""')}"`,
			`"${it.unitRu}"`,
			`"${it.okeiCode}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`,
			it.expiryDate,
			`"${fefoRu}"`,
			it.bookQuantity,
			it.actualQuantity,
			it.discrepancyQuantity,
			`"${discRu}"`,
			kopecksToRubles(it.unitCostKopecks).toFixed(2),
			kopecksToRubles(it.bookTotalKopecks).toFixed(2),
			kopecksToRubles(it.actualTotalKopecks).toFixed(2),
			surplusRub,
			shortageRub,
			`"${(it.storageLocationRu || "").replace(/"/g, '""')}"`,
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function exportInv19DiscrepanciesToCsv(doc: WarehouseInventoryAuditDocument): string {
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");
	const header = [
		"№",
		"Артикул",
		"Наименование ТМЦ",
		"Партия (LOT)",
		"Срок годности",
		"Учетное кол-во",
		"Фактическое кол-во",
		"Излишек (кол-во)",
		"Излишек (руб)",
		"Недостача (кол-во)",
		"Недостача (руб)",
		"Учетная цена (руб)",
	].join(";");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return [
			idx + 1,
			`"${it.sku.replace(/"/g, '""')}"`,
			`"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`,
			it.expiryDate,
			it.bookQuantity,
			it.actualQuantity,
			surplusQty,
			surplusSum,
			shortageQty,
			shortageSum,
			kopecksToRubles(it.unitCostKopecks).toFixed(2),
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

// ---------------------------------------------------------------------------
// Экспорт в формат 1С (CommerceML 2.09 / XML Инвентаризация)
// ---------------------------------------------------------------------------

export function exportInventoryTo1C(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const xmlItems = doc.items.map((it) => `
    <Товар>
      <Ид>${it.itemId}</Ид>
      <Артикул>${it.sku}</Артикул>
      <Наименование>${it.nameRu}</Наименование>
      <БазоваяЕдиница Код="${it.okeiCode}">${it.unitRu}</БазоваяЕдиница>
      <Серия>${it.batchNumber}</Серия>
      <СрокГодности>${it.expiryDate}</СрокГодности>
      <КоличествоУчет>${it.bookQuantity}</КоличествоУчет>
      <КоличествоФакт>${it.actualQuantity}</КоличествоФакт>
      <КоличествоОтклонение>${it.discrepancyQuantity}</КоличествоОтклонение>
      <Цена>${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</Цена>
      <СуммаУчет>${kopecksToRubles(it.bookTotalKopecks).toFixed(2)}</СуммаУчет>
      <СуммаФакт>${kopecksToRubles(it.actualTotalKopecks).toFixed(2)}</СуммаФакт>
    </Товар>`).join("");

	return `<?xml version="1.0" encoding="UTF-8"?>
<КоммерческаяИнформация ВерсияСхемы="2.09" ДатаФормирования="${new Date().toISOString()}">
  <Документ.ИнвентаризацияТоваровНаСкладе>
    <Номер>${doc.documentNumber}</Номер>
    <Дата>${doc.auditDate}</Дата>
    <Организация>
      <Наименование>${doc.organizationNameRu}</Наименование>
      <ОКПО>${doc.organizationOkpo}</ОКПО>
      <ИНН>${doc.organizationInn}</ИНН>
    </Организация>
    <Склад>${doc.warehouseNameRu}</Склад>
    <МОЛ>${doc.molFullName}</МОЛ>
    <Основание>Приказ № ${doc.orderNumber} от ${doc.orderDate}</Основание>
    <СуммаУчетВсего>${totals.totalBookCostRubles.toFixed(2)}</СуммаУчетВсего>
    <СуммаФактВсего>${totals.totalActualCostRubles.toFixed(2)}</СуммаФактВсего>
    <СуммаИзлишекВсего>${totals.totalSurplusCostRubles.toFixed(2)}</СуммаИзлишекВсего>
    <СуммаНедостачаВсего>${totals.totalShortageCostRubles.toFixed(2)}</СуммаНедостачаВсего>
    <Товары>${xmlItems}
    </Товары>
  </Документ.ИнвентаризацияТоваровНаСкладе>
</КоммерческаяИнформация>`;
}

// ---------------------------------------------------------------------------
// Печатные формы (ИНВ-3, ИНВ-19, ТОРГ-16)
// ---------------------------------------------------------------------------

export function generateInv3Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const rows = doc.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: center;">${it.okeiCode}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.actualQuantity}</td>
      <td style="text-align: right; font-weight: bold;">${kopecksToRubles(it.actualTotalKopecks).toFixed(2)}</td>
      <td style="text-align: right;">${it.bookQuantity}</td>
      <td style="text-align: right;">${kopecksToRubles(it.bookTotalKopecks).toFixed(2)}</td>
    </tr>`).join("");

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position} (${c.role === "chairman" ? "Председатель" : "Член комиссии"}):</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-3: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .receipt-box { border: 1px solid #000; padding: 8px; font-size: 9.5pt; margin-bottom: 12px; }
    .footer-box { margin-top: 16px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-3<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317004</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад / Подразделение:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>Материально ответственное лицо:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
      <b>Номер описи:</b> ${doc.documentNumber}<br>
      <b>Дата составления:</b> ${doc.auditDate}<br>
      <b>Основание:</b> Приказ № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>ИНВЕНТАРИЗАЦИОННАЯ ОПИСЬ</h2>
  <h3>товарно-материальных ценностей № ${doc.documentNumber}</h3>

  <div class="receipt-box">
    <b>Расписка:</b> К началу проведения инвентаризации все расходные и приходные документы на товарно-материальные ценности сданы в бухгалтерию, и все ценности, поступившие на мою ответственность, оприходованы, а выбывшие списаны в расход.<br>
    Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
  </div>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th>
        <th rowspan="2">Наименование ТМЦ</th>
        <th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th>
        <th rowspan="2">Срок годности</th>
        <th colspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th>
        <th colspan="2">Фактическое наличие</th>
        <th colspan="2">По данным учета</th>
      </tr>
      <tr>
        <th>наим.</th>
        <th>ОКЕИ</th>
        <th>Кол-во</th>
        <th>Сумма (руб.)</th>
        <th>Кол-во</th>
        <th>Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="8" style="text-align: right;">ИТОГО ПО ОПИСИ:</td>
        <td style="text-align: right;">${totals.totalActualQuantity}</td>
        <td style="text-align: right;">${totals.totalActualCostRubles.toFixed(2)}</td>
        <td style="text-align: right;">${totals.totalBookQuantity}</td>
        <td style="text-align: right;">${totals.totalBookCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого фактическая сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalActualCostKopecks)}<br>
    <b>Итого учетная сумма прописью:</b> ${numberToRussianWordsKopecks(totals.totalBookCostKopecks)}
  </div>

  <div class="footer-box">
    <h4>Члены инвентаризационной комиссии:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      Все ценности, поименованные в настоящей описи с № 1 по № ${doc.items.length}, комиссией проверены в натуре в моем присутствии и внесены в опись.<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}

export function generateInv19Html(doc: WarehouseInventoryAuditDocument): string {
	const totals = calculateInventoryAuditTotals(doc.items);
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusQty : "-"}</td>
      <td style="text-align: right; background: #ecfdf5; font-weight: bold;">${surplusQty > 0 ? surplusSum : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageQty : "-"}</td>
      <td style="text-align: right; background: #fef2f2; font-weight: bold;">${shortageQty > 0 ? shortageSum : "-"}</td>
    </tr>`;
	}).join("");

	const commissionSigns = doc.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ИНВ-19: ${doc.documentNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ИНВ-19<br>
    Утверждена постановлением Госкомстата РФ от 18.08.1998 № 88<br>
    Код по ОКУД <b>0317019</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${doc.organizationNameRu} (ОКПО: ${doc.organizationOkpo}, ИНН: ${doc.organizationInn})<br>
      <b>Склад:</b> ${doc.warehouseNameRu} (${doc.branchNameRu})<br>
      <b>МОЛ:</b> ${doc.molPosition} ${doc.molFullName}
    </div>
    <div>
      <b>Ведомость к описи №:</b> ${doc.documentNumber}<br>
      <b>Дата сверки:</b> ${doc.auditDate}<br>
      <b>Приказ:</b> № ${doc.orderNumber} от ${doc.orderDate}
    </div>
  </div>

  <h2>СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ</h2>
  <h3>результатов инвентаризации ТМЦ № ${doc.documentNumber}</h3>

  <table>
    <thead>
      <tr>
        <th rowspan="2">№</th>
        <th rowspan="2">Наименование ТМЦ</th>
        <th rowspan="2">Артикул</th>
        <th rowspan="2">Партия (LOT)</th>
        <th rowspan="2">Срок годности</th>
        <th rowspan="2">Ед. изм.</th>
        <th rowspan="2">Цена (руб.)</th>
        <th colspan="2" style="background: #d1fae5;">Излишки</th>
        <th colspan="2" style="background: #fee2e2;">Недостачи</th>
      </tr>
      <tr>
        <th style="background: #d1fae5;">Кол-во</th>
        <th style="background: #d1fae5;">Сумма (руб.)</th>
        <th style="background: #fee2e2;">Кол-во</th>
        <th style="background: #fee2e2;">Сумма (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="11" style="text-align: center; padding: 12px;">Расхождений не выявлено (книжные остатки совпадают с фактическими на 100%).</td></tr>'}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="7" style="text-align: right;">ИТОГО РАСХОЖДЕНИЙ:</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusQuantity}</td>
        <td style="text-align: right; color: #059669;">${totals.totalSurplusCostRubles.toFixed(2)}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageQuantity}</td>
        <td style="text-align: right; color: #dc2626;">${totals.totalShortageCostRubles.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого излишек прописью:</b> ${numberToRussianWordsKopecks(totals.totalSurplusCostKopecks)}<br>
    <b>Итого недостача прописью:</b> ${numberToRussianWordsKopecks(totals.totalShortageCostKopecks)}<br>
    <b>Итоговое сальдо сверки:</b> ${totals.netDiscrepancyCostRubles >= 0 ? "+" : ""}${totals.netDiscrepancyCostRubles.toFixed(2)} руб.
  </div>

  <div style="margin-top: 16px;">
    <h4>Подписи членов комиссии и МОЛ:</h4>
    ${commissionSigns}
    <div style="margin-top: 12px;">
      С результатами сличения согласен:<br>
      Материально ответственное лицо: ____________________ / <b>${doc.molFullName}</b> /
    </div>
  </div>
</body>
</html>`;
}

export function generateTorg16Html(act: WarehouseTorg16WriteoffAct): string {
	const rows = act.items.map((it, idx) => `
    <tr>
      <td style="text-align: center;">${idx + 1}</td>
      <td>${it.nameRu}</td>
      <td style="text-align: center;">${it.sku}</td>
      <td style="text-align: center;">${it.batchNumber}</td>
      <td style="text-align: center;">${it.expiryDate}</td>
      <td style="text-align: center;">${it.unitRu}</td>
      <td style="text-align: right;">${it.quantity}</td>
      <td style="text-align: right;">${kopecksToRubles(it.unitCostKopecks).toFixed(2)}</td>
      <td style="text-align: right; font-weight: bold;">${it.totalCostRubles.toFixed(2)}</td>
      <td>${it.defectDescriptionRu}</td>
    </tr>`).join("");

	const commissionSigns = act.commission.map((c) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <span>${c.position}:</span>
      <span style="border-bottom: 1px solid #000; width: 200px; display: inline-block;">&nbsp;</span>
      <span style="font-weight: bold;">/ ${c.fullName} /</span>
    </div>`).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>ТОРГ-16: ${act.actNumber}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.2; color: #000; padding: 20px; }
    h2, h3 { text-align: center; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; margin-bottom: 12px; font-size: 10pt; }
    th, td { border: 1px solid #000; padding: 4px; }
    th { background: #f0f0f0; text-align: center; }
    .header-box { display: flex; justify-content: space-between; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div style="text-align: right; font-size: 9pt;">
    Унифицированная форма № ТОРГ-16<br>
    Утверждена постановлением Госкомстата РФ от 25.12.1998 № 132<br>
    Код по ОКУД <b>0330216</b>
  </div>
  <div class="header-box">
    <div>
      <b>Организация:</b> ${act.organizationNameRu} (ОКПО: ${act.organizationOkpo}, ИНН: ${act.organizationInn})<br>
      <b>Склад:</b> ${act.warehouseNameRu}<br>
      <b>МОЛ:</b> ${act.molPosition} ${act.molFullName}
    </div>
    <div>
      <b>Акт №:</b> ${act.actNumber}<br>
      <b>Дата:</b> ${act.actDate}<br>
      <b>Основание:</b> Опись ${act.inventoryDocNumber}
    </div>
  </div>

  <h2>АКТ О СПИСАНИИ ТОВАРОВ</h2>
  <h3>№ ${act.actNumber} от ${act.actDate}</h3>

  <p><b>Причина списания:</b> ${act.reasonRu}</p>

  <table>
    <thead>
      <tr>
        <th>№</th>
        <th>Наименование ТМЦ</th>
        <th>Артикул</th>
        <th>Партия (LOT)</th>
        <th>Срок годности</th>
        <th>Ед.</th>
        <th>Кол-во</th>
        <th>Цена (руб.)</th>
        <th>Сумма (руб.)</th>
        <th>Причина списания</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="font-weight: bold; background: #fafafa;">
        <td colspan="6" style="text-align: right;">ВСЕГО ПО АКТУ:</td>
        <td style="text-align: right;">${act.totalQuantity}</td>
        <td>&nbsp;</td>
        <td style="text-align: right;">${act.totalCostRubles.toFixed(2)}</td>
        <td>&nbsp;</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 10px; font-size: 10.5pt;">
    <b>Итого сумма списания прописью:</b> ${numberToRussianWordsKopecks(act.totalCostKopecks)}
  </div>

  <div style="margin-top: 16px;">
    <h4>Члены комиссии:</h4>
    ${commissionSigns}
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Эталонный демонстрационный датасет для стоматологического склада
// ---------------------------------------------------------------------------

export const DEFAULT_COMMISSION_MEMBERS: readonly WarehouseInventoryCommissionMember[] = [
	{
		fullName: "Захаров Игорь Валентинович",
		position: "Главный врач клиники",
		role: "chairman",
		roleRu: "Председатель комиссии",
	},
	{
		fullName: "Васильев Олег Петрович",
		position: "Заведующий складом",
		role: "mol",
		roleRu: "МОЛ (Материально ответственное лицо)",
	},
	{
		fullName: "Смирнова Анна Викторовна",
		position: "Главная медицинская сестра",
		role: "member",
		roleRu: "Член комиссии",
	},
	{
		fullName: "Лебедева Елена Николаевна",
		position: "Ведущий бухгалтер",
		role: "accountant",
		roleRu: "Бухгалтер-ревизор",
	},
];

export const DEFAULT_INVENTORY_ITEMS_PRESET: readonly WarehouseAuditItemLine[] = [
	computeAuditLineItem({
		itemId: "mat_ultracain_forte",
		sku: "AN-ULTRA-01",
		nameRu: "Ультракаин Д-С Форте (100 карпул/уп)",
		category: "Анестетики",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-2026A44",
		manufactureDate: "2024-01-10",
		expiryDate: "2027-12-31",
		storageLocationRu: "Стеллаж А-1, Полка 2",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 15,
		actualQuantity: 15,
		unitCostKopecks: 650000, // 6 500.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_septanest_adren",
		sku: "AN-SEPT-02",
		nameRu: "Септанест с адреналином 1:100 000 (50 карпул)",
		category: "Анестетики",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-2024S19",
		manufactureDate: "2023-05-15",
		expiryDate: "2026-08-15", // Просрочен
		storageLocationRu: "Стеллаж А-1, Полка 3",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 8,
		actualQuantity: 8,
		unitCostKopecks: 420000, // 4 200.00 ₽
		isWriteoffRequired: true,
	}),
	computeAuditLineItem({
		itemId: "mat_filtek_z250_a2",
		sku: "COMP-Z250-A2",
		nameRu: "Композит Filtek Z250 шприц 4г, оттенок A2",
		category: "Композиты и адгезивы",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-FLTK-992",
		manufactureDate: "2024-03-01",
		expiryDate: "2026-09-15", // < 30 дней
		storageLocationRu: "Стеллаж Б-2, Сейф 1",
		temperatureRegimeRu: "+18°C..+23°C",
		bookQuantity: 20,
		actualQuantity: 22, // Излишек +2
		unitCostKopecks: 285000, // 2 850.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_filtek_supreme_a3b",
		sku: "COMP-SUPR-A3B",
		nameRu: "Filtek Supreme XTE Universal Body A3B 4г",
		category: "Композиты и адгезивы",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-XTE-4410",
		manufactureDate: "2024-06-10",
		expiryDate: "2026-10-20", // < 60 дней
		storageLocationRu: "Стеллаж Б-2, Сейф 1",
		temperatureRegimeRu: "+18°C..+23°C",
		bookQuantity: 12,
		actualQuantity: 10, // Недостача -2
		unitCostKopecks: 360000, // 3 600.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_single_bond_universal",
		sku: "ADH-SBU-05",
		nameRu: "Адгезив Single Bond Universal 5 мл",
		category: "Композиты и адгезивы",
		unitRu: "фл",
		okeiCode: "796",
		batchNumber: "LOT-SBU-811",
		manufactureDate: "2024-08-01",
		expiryDate: "2027-08-01", // Свежий
		storageLocationRu: "Холодильник ХОЛ-1 (+4°C)",
		temperatureRegimeRu: "+2°C..+8°C",
		bookQuantity: 6,
		actualQuantity: 6,
		unitCostKopecks: 540000, // 5 400.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_impl_osstem_40_10",
		sku: "IMP-OSST-4010",
		nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
		category: "Имплантология",
		unitRu: "шт",
		okeiCode: "796",
		batchNumber: "LOT-OS-5541",
		manufactureDate: "2024-02-15",
		expiryDate: "2029-06-30",
		storageLocationRu: "Сейф имплантатов С-1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 10,
		actualQuantity: 9, // Недостача -1
		unitCostKopecks: 1250000, // 12 500.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_bio_oss_05g",
		sku: "BONE-BIOOSS-05",
		nameRu: "Костный заменитель Geistlich Bio-Oss гранулы 0.5г",
		category: "Имплантология и хирургия",
		unitRu: "фл",
		okeiCode: "796",
		batchNumber: "LOT-OSS-3129",
		manufactureDate: "2024-04-12",
		expiryDate: "2028-04-12",
		storageLocationRu: "Сейф имплантатов С-1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 8,
		actualQuantity: 8,
		unitCostKopecks: 1120000, // 11 200.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_suture_vicryl_40",
		sku: "SUT-VIC-40",
		nameRu: "Шовный материал Vicryl 4-0 колющая игла 17 мм",
		category: "Хирургия и шовный материал",
		unitRu: "упак",
		okeiCode: "778",
		batchNumber: "LOT-ETH-2041",
		manufactureDate: "2024-01-20",
		expiryDate: "2028-01-20",
		storageLocationRu: "Стеллаж В-1, Бокс 4",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 14,
		actualQuantity: 14,
		unitCostKopecks: 480000, // 4 800.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_alginate_hydrogum",
		sku: "IMP-HYDR-453",
		nameRu: "Альгинатная слепочная масса Hydrogum 5 453г",
		category: "Ортопедия и слепочные массы",
		unitRu: "пак",
		okeiCode: "166",
		batchNumber: "LOT-ZHM-110",
		manufactureDate: "2024-05-10",
		expiryDate: "2027-05-10",
		storageLocationRu: "Стеллаж Г-3, Полка 1",
		temperatureRegimeRu: "+15°C..+25°C",
		bookQuantity: 18,
		actualQuantity: 19, // Излишек +1
		unitCostKopecks: 145000, // 1 450.00 ₽
	}),
	computeAuditLineItem({
		itemId: "mat_disinf_surfanios_5l",
		sku: "DS-SURF-5L",
		nameRu: "Дезинфицирующее средство Сурфаниос Лемон Фреш 5л",
		category: "Дезинфекция и стерилизация",
		unitRu: "кан",
		okeiCode: "112",
		batchNumber: "LOT-AN-8802",
		manufactureDate: "2023-01-10",
		expiryDate: "2026-08-01", // Просрочен
		storageLocationRu: "Зона дезсредств Д-1",
		temperatureRegimeRu: "+5°C..+25°C",
		bookQuantity: 4,
		actualQuantity: 4,
		unitCostKopecks: 620000, // 6 200.00 ₽
		isWriteoffRequired: true,
	}),
];
