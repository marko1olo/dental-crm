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

export { kopecksToRubles, rublesToKopecks } from "@dental/shared";

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
		warnings.push(
			"Опись оформляется ответственным сотрудником (единоличное списание/опись без обязательного требования комиссии из 3 человек).",
		);
	} else if (!doc.commission.some((c) => c.role === "chairman")) {
		warnings.push("В составе инвентаризационной комиссии не указан председатель.");
	}

	if (!doc.items || doc.items.length === 0) {
		errors.push("Инвентаризационная опись должна содержать хотя бы одну позицию ТМЦ.");
	} else {
		for (const it of doc.items) {
			if (it.actualQuantity < 0) {
				errors.push(`Товар «${it.nameRu}» содержит отрицательное фактическое количество.`);
			} else if (it.bookQuantity < 0) {
				warnings.push(
					`Товар «${it.nameRu}» имеет отрицательный учетный остаток (${it.bookQuantity}) — зафиксирован мягкий овердрафт («Списано под операцию, требуется оприходование»).`,
				);
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


export * from "./warehouseInventoryPrintForms.js";
export * from "./warehouseInventoryPresets.js";
