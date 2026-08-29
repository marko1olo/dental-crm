/**
 * transferM11Engine.ts — Inter-Warehouse & Cross-Branch Material Transfer Engine (Form M-11).
 *
 * Wave 21 — Domain 1 (Multi-Branch & Inter-Warehouse Transfer).
 *
 * STATUTORY REFERENCE:
 * - Форма № М-11 «Требование-накладная» (код по ОКУД 0315006).
 * - Утверждена Постановлением Госкомстата РФ от 30.10.1997 № 71а.
 *
 * INVARIANTS:
 * 1. Strict Lifecycle State Machine:
 *    - DRAFT -> IN_TRANSIT -> ACCEPTED (no discrepancies) | DISCREPANCY (with Discrepancy Act) | CANCELLED.
 * 2. Exact Kopeck Arithmetic:
 *    - All unit costs and total amounts calculated strictly in integer kopecks (Kopecks = number).
 * 3. Clinical & MDLP Compliance:
 *    - Full lot number, batch ID, expiration date, and MDLP DataMatrix tracking for pharmaceuticals/implants.
 */

import { z } from "zod";
import { type Kopecks, formatKopecksRu } from "../utils/money.js";
import { kopecksToRub } from "../fiscal/kopecksArithmetic.js";

// ─── 1. STATUS & DATA SCHEMAS ──────────────────────────────────────────────────

export const transferM11StatusSchema = z.enum([
	"DRAFT",        // Черновик требования-накладной
	"IN_TRANSIT",   // ТМЦ отпущены со склада-отправителя и находятся в пути
	"ACCEPTED",     // ТМЦ приняты складом-получателем без расхождений
	"DISCREPANCY",  // ТМЦ приняты с расхождениями (составлен акт расхождений)
	"CANCELLED",    // Перемещение отменено
]);
export type TransferM11Status = z.infer<typeof transferM11StatusSchema>;

export const TRANSFER_M11_STATUS_LABELS_RU: Record<TransferM11Status, string> = {
	DRAFT: "Черновик",
	IN_TRANSIT: "В пути",
	ACCEPTED: "Принято",
	DISCREPANCY: "Принято с расхождениями",
	CANCELLED: "Отменено",
};

export const responsibleOfficerSchema = z.object({
	name: z.string().min(1, "ФИО ответственного лица обязательно"),
	position: z.string().min(1, "Должность обязательна"),
	employeeId: z.string().optional().nullable(),
	signatureDate: z.string().optional().nullable(),
});
export type ResponsibleOfficer = z.infer<typeof responsibleOfficerSchema>;

export const transferM11ItemSchema = z.object({
	itemIndex: z.number().int().positive(),
	inventoryItemId: z.string().min(1, "ID номенклатуры обязателен"),
	itemName: z.string().min(1, "Наименование ТМЦ обязательно"),
	nomenclatureCode: z.string().optional().nullable(),
	unitName: z.string().default("шт"),
	unitOkeiCode: z.string().default("796"), // 796 = шт по ОКЕИ
	lotNumber: z.string().optional().nullable(),
	batchId: z.string().optional().nullable(),
	expirationDate: z.string().optional().nullable(), // YYYY-MM-DD
	mdlpDataMatrix: z.string().optional().nullable(),
	quantityRequested: z.number().positive("Затребованное количество должно быть > 0"),
	quantityDispatched: z.number().nonnegative("Отпущенное количество не может быть отрицательным").default(0),
	quantityAccepted: z.number().nonnegative("Принятое количество не может быть отрицательным").default(0),
	unitCostKopecks: z.number().int().nonnegative("Цена за единицу в копейках должна быть неотрицательной"),
	totalCostDispatchedKopecks: z.number().int().nonnegative().default(0),
	totalCostAcceptedKopecks: z.number().int().nonnegative().default(0),
	discrepancyQuantity: z.number().default(0),
	discrepancyCostKopecks: z.number().int().default(0),
	discrepancyReason: z.string().optional().nullable(),
});
export type TransferM11Item = z.infer<typeof transferM11ItemSchema>;

export const transferM11DocumentSchema = z.object({
	id: z.string().min(1, "ID документа обязателен"),
	organizationId: z.string().min(1, "ID организации обязателен"),
	documentNumber: z.string().min(1, "Номер накладной обязателен"),
	documentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Формат даты YYYY-MM-DD"),
	status: transferM11StatusSchema.default("DRAFT"),

	// Sender details
	fromBranchId: z.string().min(1, "ID филиала-отправителя обязателен"),
	fromBranchName: z.string().min(1, "Наименование филиала-отправителя обязательно"),
	fromWarehouseId: z.string().min(1, "ID склада-отправителя обязателен"),
	fromWarehouseName: z.string().min(1, "Наименование склада-отправителя обязательно"),
	fromDepartment: z.string().default("Склад ТМЦ"),

	// Receiver details
	toBranchId: z.string().min(1, "ID филиала-получателя обязателен"),
	toBranchName: z.string().min(1, "Наименование филиала-получателя обязательно"),
	toWarehouseId: z.string().min(1, "ID склада-получателя обязателен"),
	toWarehouseName: z.string().min(1, "Наименование склада-получателя обязательно"),
	toDepartment: z.string().default("Склад ТМЦ"),

	// Accounting correspondent accounts
	debitAccount: z.string().default("10.01"),   // Сырье и материалы (получатель)
	creditAccount: z.string().default("10.01"),  // Сырье и материалы (отправитель)
	operationType: z.string().default("Внутреннее перемещение"),

	// Responsible officers
	requestedBy: responsibleOfficerSchema.optional().nullable(),
	dispatchedBy: responsibleOfficerSchema.optional().nullable(),
	acceptedBy: responsibleOfficerSchema.optional().nullable(),

	items: z.array(transferM11ItemSchema).min(1, "Накладная должна содержать минимум 1 позицию"),

	// Aggregated metrics
	totalItemsCount: z.number().int().nonnegative(),
	totalQuantityRequested: z.number().nonnegative(),
	totalQuantityDispatched: z.number().nonnegative(),
	totalQuantityAccepted: z.number().nonnegative(),
	totalCostDispatchedKopecks: z.number().int().nonnegative(),
	totalCostAcceptedKopecks: z.number().int().nonnegative(),
	totalDiscrepancyCostKopecks: z.number().int(),
	hasDiscrepancies: z.boolean().default(false),

	notes: z.string().max(2000).optional().nullable(),
	dispatchedAt: z.string().optional().nullable(),
	acceptedAt: z.string().optional().nullable(),
	cancelledAt: z.string().optional().nullable(),
	cancellationReason: z.string().optional().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});
export type TransferM11Document = z.infer<typeof transferM11DocumentSchema>;

// ─── 2. NUMBER TO WORDS CONVERTER IN RUSSIAN (СУММА ПРОПИСЬЮ) ─────────────────

const UNITS_MASC = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const UNITS_FEM = ["", "одна", "две", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
const TEENS = [
	"десять",
	"одиннадцать",
	"двенадцать",
	"тринадцать",
	"четырнадцать",
	"пятнадцать",
	"шестнадцать",
	"семнадцать",
	"восемнадцать",
	"девятнадцать",
];
const TENS = ["", "", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
const HUNDREDS = [
	"",
	"сто",
	"двести",
	"триста",
	"четыреста",
	"пятьсот",
	"шестьсот",
	"семьсот",
	"восемьсот",
	"девятьсот",
];

function plural(n: number, one: string, two: string, five: string): string {
	const num = Math.abs(n) % 100;
	const n1 = num % 10;
	if (num > 10 && num < 20) return five;
	if (n1 > 1 && n1 < 5) return two;
	if (n1 === 1) return one;
	return five;
}

function tripletToWords(num: number, isFem = false): string {
	const h = Math.floor(num / 100);
	const t = Math.floor((num % 100) / 10);
	const u = num % 10;
	const words: string[] = [];

	if (h > 0) words.push(HUNDREDS[h]!);
	if (t === 1) {
		words.push(TEENS[u]!);
	} else {
		if (t > 1) words.push(TENS[t]!);
		if (u > 0) words.push(isFem ? UNITS_FEM[u]! : UNITS_MASC[u]!);
	}
	return words.join(" ");
}

/**
 * Formats monetary amount in kopecks to Russian statutory verbal string ("Сумма прописью").
 * Example: 1542050 kop -> "Пятнадцать тысяч четыреста двадцать рублей 50 копеек"
 */
export function numberToWordsRuKopecks(kopecks: Kopecks): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return "Ноль рублей 00 копеек";
	}

	const isNegative = kopecks < 0;
	const absKopecks = Math.abs(kopecks);
	const rubles = Math.floor(absKopecks / 100);
	const kopRemainder = absKopecks % 100;
	const kopStr = String(kopRemainder).padStart(2, "0");

	if (rubles === 0) {
		return `${isNegative ? "Минус " : ""}ноль рублей ${kopStr} ${plural(kopRemainder, "копейка", "копейки", "копеек")}`;
	}

	const billions = Math.floor(rubles / 1_000_000_000);
	const millions = Math.floor((rubles % 1_000_000_000) / 1_000_000);
	const thousands = Math.floor((rubles % 1_000_000) / 1_000);
	const ones = rubles % 1_000;

	const parts: string[] = [];

	if (billions > 0) {
		parts.push(tripletToWords(billions, false));
		parts.push(plural(billions, "миллиард", "миллиарда", "миллиардов"));
	}
	if (millions > 0) {
		parts.push(tripletToWords(millions, false));
		parts.push(plural(millions, "миллион", "миллиона", "миллионов"));
	}
	if (thousands > 0) {
		parts.push(tripletToWords(thousands, true));
		parts.push(plural(thousands, "тысяча", "тысячи", "тысяч"));
	}
	if (ones > 0) {
		parts.push(tripletToWords(ones, false));
	}

	const rubleNoun = plural(rubles, "рубль", "рубля", "рублей");
	const wordsText = parts.filter(Boolean).join(" ");
	const capitalized = wordsText.charAt(0).toUpperCase() + wordsText.slice(1);

	return `${isNegative ? "Минус " : ""}${capitalized} ${rubleNoun} ${kopStr} ${plural(kopRemainder, "копейка", "копейки", "копеек")}`;
}

// ─── 3. LIFECYCLE STATE MACHINE OPERATIONS ─────────────────────────────────────

export interface CreateTransferM11DraftInput {
	id?: string | undefined;
	organizationId: string;
	documentNumber: string;
	documentDate: string; // YYYY-MM-DD
	fromBranchId: string;
	fromBranchName: string;
	fromWarehouseId: string;
	fromWarehouseName: string;
	fromDepartment?: string | undefined;
	toBranchId: string;
	toBranchName: string;
	toWarehouseId: string;
	toWarehouseName: string;
	toDepartment?: string | undefined;
	debitAccount?: string | undefined;
	creditAccount?: string | undefined;
	requestedBy?: ResponsibleOfficer | undefined;
	items: Array<{
		inventoryItemId: string;
		itemName: string;
		nomenclatureCode?: string | undefined;
		unitName?: string | undefined;
		unitOkeiCode?: string | undefined;
		lotNumber?: string | undefined;
		batchId?: string | undefined;
		expirationDate?: string | undefined;
		mdlpDataMatrix?: string | undefined;
		quantityRequested: number;
		unitCostKopecks: Kopecks;
	}>;
	notes?: string | undefined;
}

/**
 * Creates a new Draft for Requirement-Waybill M-11.
 */
export function createTransferM11Draft(input: CreateTransferM11DraftInput): TransferM11Document {
	if (input.fromWarehouseId === input.toWarehouseId) {
		throw new Error("Склад-отправитель и склад-получатель не могут совпадать");
	}

	if (!input.items || input.items.length === 0) {
		throw new Error("Накладная М-11 должна содержать хотя бы одну товарную позицию");
	}

	const now = new Date().toISOString();
	let totalQtyReq = 0;

	const items: TransferM11Item[] = input.items.map((item, idx) => {
		if (item.quantityRequested <= 0) {
			throw new Error(`Позиция #${idx + 1} («${item.itemName}»): количество должно быть > 0`);
		}
		if (item.unitCostKopecks < 0) {
			throw new Error(`Позиция #${idx + 1} («${item.itemName}»): учетная цена не может быть отрицательной`);
		}
		totalQtyReq += item.quantityRequested;

		return {
			itemIndex: idx + 1,
			inventoryItemId: item.inventoryItemId,
			itemName: item.itemName,
			nomenclatureCode: item.nomenclatureCode ?? null,
			unitName: item.unitName ?? "шт",
			unitOkeiCode: item.unitOkeiCode ?? "796",
			lotNumber: item.lotNumber ?? null,
			batchId: item.batchId ?? null,
			expirationDate: item.expirationDate ?? null,
			mdlpDataMatrix: item.mdlpDataMatrix ?? null,
			quantityRequested: item.quantityRequested,
			quantityDispatched: 0,
			quantityAccepted: 0,
			unitCostKopecks: item.unitCostKopecks,
			totalCostDispatchedKopecks: 0,
			totalCostAcceptedKopecks: 0,
			discrepancyQuantity: 0,
			discrepancyCostKopecks: 0,
			discrepancyReason: null,
		};
	});

	const docId = input.id ?? `m11_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

	return {
		id: docId,
		organizationId: input.organizationId,
		documentNumber: input.documentNumber,
		documentDate: input.documentDate,
		status: "DRAFT",
		fromBranchId: input.fromBranchId,
		fromBranchName: input.fromBranchName,
		fromWarehouseId: input.fromWarehouseId,
		fromWarehouseName: input.fromWarehouseName,
		fromDepartment: input.fromDepartment ?? "Центральный склад",
		toBranchId: input.toBranchId,
		toBranchName: input.toBranchName,
		toWarehouseId: input.toWarehouseId,
		toWarehouseName: input.toWarehouseName,
		toDepartment: input.toDepartment ?? "Склад филиала",
		debitAccount: input.debitAccount ?? "10.01",
		creditAccount: input.creditAccount ?? "10.01",
		operationType: "Внутреннее перемещение",
		requestedBy: input.requestedBy ?? null,
		dispatchedBy: null,
		acceptedBy: null,
		items,
		totalItemsCount: items.length,
		totalQuantityRequested: totalQtyReq,
		totalQuantityDispatched: 0,
		totalQuantityAccepted: 0,
		totalCostDispatchedKopecks: 0,
		totalCostAcceptedKopecks: 0,
		totalDiscrepancyCostKopecks: 0,
		hasDiscrepancies: false,
		notes: input.notes ?? null,
		dispatchedAt: null,
		acceptedAt: null,
		cancelledAt: null,
		cancellationReason: null,
		createdAt: now,
		updatedAt: now,
	};
}

export interface DispatchTransferM11Input {
	dispatchedBy: ResponsibleOfficer;
	dispatchedAt?: string | undefined;
	dispatchedItems?: Array<{
		inventoryItemId: string;
		quantityDispatched: number;
		lotNumber?: string | undefined;
		batchId?: string | undefined;
		expirationDate?: string | undefined;
		mdlpDataMatrix?: string | undefined;
	}> | undefined;
}

/**
 * Dispatches items from the sender warehouse into transit.
 * Transitions status from DRAFT -> IN_TRANSIT.
 */
export function dispatchTransferM11(
	doc: TransferM11Document,
	input: DispatchTransferM11Input,
): TransferM11Document {
	if (doc.status !== "DRAFT") {
		throw new Error(`Невозможно отпустить перемещение со статусом «${doc.status}». Ожидается «DRAFT»`);
	}

	const dispatchMap = new Map<string, {
		quantityDispatched: number;
		lotNumber?: string | undefined;
		batchId?: string | undefined;
		expirationDate?: string | undefined;
		mdlpDataMatrix?: string | undefined;
	}>();

	if (input.dispatchedItems) {
		for (const d of input.dispatchedItems) {
			dispatchMap.set(d.inventoryItemId, d);
		}
	}

	let totalDispatchedQty = 0;
	let totalDispatchedCost = 0;

	const updatedItems: TransferM11Item[] = doc.items.map((item) => {
		const customDispatch = dispatchMap.get(item.inventoryItemId);
		const qtyDispatched = customDispatch ? customDispatch.quantityDispatched : item.quantityRequested;

		if (qtyDispatched < 0) {
			throw new Error(`Отпущенное количество для «${item.itemName}» не может быть отрицательным`);
		}

		const totalCostDispatchedKopecks = Math.round(qtyDispatched * item.unitCostKopecks);
		totalDispatchedQty += qtyDispatched;
		totalDispatchedCost += totalCostDispatchedKopecks;

		return {
			...item,
			quantityDispatched: qtyDispatched,
			lotNumber: customDispatch?.lotNumber ?? item.lotNumber,
			batchId: customDispatch?.batchId ?? item.batchId,
			expirationDate: customDispatch?.expirationDate ?? item.expirationDate,
			mdlpDataMatrix: customDispatch?.mdlpDataMatrix ?? item.mdlpDataMatrix,
			totalCostDispatchedKopecks,
		};
	});

	const now = input.dispatchedAt ?? new Date().toISOString();

	return {
		...doc,
		status: "IN_TRANSIT",
		dispatchedBy: input.dispatchedBy,
		dispatchedAt: now,
		items: updatedItems,
		totalQuantityDispatched: totalDispatchedQty,
		totalCostDispatchedKopecks: totalDispatchedCost,
		updatedAt: now,
	};
}

export interface ReceiveTransferM11Input {
	acceptedBy: ResponsibleOfficer;
	acceptedAt?: string | undefined;
	acceptedItems?: Array<{
		inventoryItemId: string;
		quantityAccepted: number;
		discrepancyReason?: string | undefined;
	}> | undefined;
}

/**
 * Accepts items at receiver warehouse.
 * Transitions status from IN_TRANSIT -> ACCEPTED (if exact match) or DISCREPANCY (if shortage/surplus).
 */
export function receiveTransferM11(
	doc: TransferM11Document,
	input: ReceiveTransferM11Input,
): TransferM11Document {
	if (doc.status !== "IN_TRANSIT") {
		throw new Error(`Невозможно принять перемещение со статусом «${doc.status}». Ожидается «IN_TRANSIT»`);
	}

	const acceptMap = new Map<string, { quantityAccepted: number; discrepancyReason?: string | undefined }>();
	if (input.acceptedItems) {
		for (const a of input.acceptedItems) {
			acceptMap.set(a.inventoryItemId, a);
		}
	}

	let totalAcceptedQty = 0;
	let totalAcceptedCost = 0;
	let totalDiscrepancyCost = 0;
	let hasAnyDiscrepancy = false;

	const updatedItems: TransferM11Item[] = doc.items.map((item) => {
		const customAccept = acceptMap.get(item.inventoryItemId);
		const qtyAccepted = customAccept ? customAccept.quantityAccepted : item.quantityDispatched;

		if (qtyAccepted < 0) {
			throw new Error(`Принятое количество для «${item.itemName}» не может быть отрицательным`);
		}

		const totalCostAcceptedKopecks = Math.round(qtyAccepted * item.unitCostKopecks);
		const discrepancyQty = qtyAccepted - item.quantityDispatched;
		const discrepancyCostKopecks = Math.round(discrepancyQty * item.unitCostKopecks);

		if (discrepancyQty !== 0) {
			hasAnyDiscrepancy = true;
		}

		totalAcceptedQty += qtyAccepted;
		totalAcceptedCost += totalCostAcceptedKopecks;
		totalDiscrepancyCost += discrepancyCostKopecks;

		return {
			...item,
			quantityAccepted: qtyAccepted,
			totalCostAcceptedKopecks,
			discrepancyQuantity: discrepancyQty,
			discrepancyCostKopecks,
			discrepancyReason: customAccept?.discrepancyReason ?? (discrepancyQty !== 0 ? "Расхождение при приемке" : null),
		};
	});

	const now = input.acceptedAt ?? new Date().toISOString();
	const finalStatus: TransferM11Status = hasAnyDiscrepancy ? "DISCREPANCY" : "ACCEPTED";

	return {
		...doc,
		status: finalStatus,
		acceptedBy: input.acceptedBy,
		acceptedAt: now,
		items: updatedItems,
		totalQuantityAccepted: totalAcceptedQty,
		totalCostAcceptedKopecks: totalAcceptedCost,
		totalDiscrepancyCostKopecks: totalDiscrepancyCost,
		hasDiscrepancies: hasAnyDiscrepancy,
		updatedAt: now,
	};
}

export interface CancelTransferM11Input {
	cancelledBy?: ResponsibleOfficer | undefined;
	cancellationReason: string;
	cancelledAt?: string | undefined;
}

/**
 * Cancels a transfer document in DRAFT or IN_TRANSIT status.
 */
export function cancelTransferM11(
	doc: TransferM11Document,
	input: CancelTransferM11Input,
): TransferM11Document {
	if (doc.status === "ACCEPTED" || doc.status === "DISCREPANCY") {
		throw new Error(`Невозможно отменить уже принятую накладную со статусом «${doc.status}»`);
	}

	const now = input.cancelledAt ?? new Date().toISOString();

	return {
		...doc,
		status: "CANCELLED",
		cancelledAt: now,
		cancellationReason: input.cancellationReason,
		updatedAt: now,
	};
}

// ─── 4. DISCREPANCY ACT GENERATOR ──────────────────────────────────────────────

export interface TransferM11DiscrepancyAct {
	documentId: string;
	documentNumber: string;
	actDate: string;
	fromBranchName: string;
	toBranchName: string;
	discrepancies: Array<{
		itemIndex: number;
		itemName: string;
		unitName: string;
		quantityDispatched: number;
		quantityAccepted: number;
		shortageQuantity: number;
		surplusQuantity: number;
		unitCostKopecks: Kopecks;
		discrepancyCostKopecks: Kopecks;
		reason: string;
	}>;
	totalShortageCostKopecks: Kopecks;
	totalSurplusCostKopecks: Kopecks;
	netDiscrepancyCostKopecks: Kopecks;
	commissionMembers: string[];
	resolutionSummaryRu: string;
}

/**
 * Generates an official Discrepancy Act (Акт об установленном расхождении) for Form M-11.
 */
export function generateTransferM11DiscrepancyAct(doc: TransferM11Document): TransferM11DiscrepancyAct {
	if (doc.status !== "DISCREPANCY" && !doc.hasDiscrepancies) {
		throw new Error("Акт расхождений может быть сформирован только для накладных с расхождениями");
	}

	const discrepancies: TransferM11DiscrepancyAct["discrepancies"] = [];
	let totalShortageCost = 0;
	let totalSurplusCost = 0;

	for (const item of doc.items) {
		if (item.discrepancyQuantity !== 0) {
			const isShortage = item.discrepancyQuantity < 0;
			const absDiff = Math.abs(item.discrepancyQuantity);
			const diffCost = Math.abs(item.discrepancyCostKopecks);

			if (isShortage) {
				totalShortageCost += diffCost;
			} else {
				totalSurplusCost += diffCost;
			}

			discrepancies.push({
				itemIndex: item.itemIndex,
				itemName: item.itemName,
				unitName: item.unitName,
				quantityDispatched: item.quantityDispatched,
				quantityAccepted: item.quantityAccepted,
				shortageQuantity: isShortage ? absDiff : 0,
				surplusQuantity: !isShortage ? absDiff : 0,
				unitCostKopecks: item.unitCostKopecks,
				discrepancyCostKopecks: item.discrepancyCostKopecks,
				reason: item.discrepancyReason ?? "Причина не указана",
			});
		}
	}

	const commission: string[] = [];
	if (doc.acceptedBy) commission.push(`${doc.acceptedBy.position}: ${doc.acceptedBy.name}`);
	if (doc.dispatchedBy) commission.push(`Отпустил: ${doc.dispatchedBy.name}`);

	const netCost = totalSurplusCost - totalShortageCost;
	const shortageRub = kopecksToRub(totalShortageCost);
	const surplusRub = kopecksToRub(totalSurplusCost);

	const resolutionSummaryRu =
		totalShortageCost > 0 && totalSurplusCost > 0
			? `Выявлена недостача на сумму ${shortageRub.toFixed(2)} ₽ и излишек на сумму ${surplusRub.toFixed(2)} ₽.`
			: totalShortageCost > 0
				? `Выявлена недостача ТМЦ на сумму ${shortageRub.toFixed(2)} ₽.`
				: `Выявлен излишек ТМЦ на сумму ${surplusRub.toFixed(2)} ₽.`;

	return {
		documentId: doc.id,
		documentNumber: `АКТ-РАСХ-${doc.documentNumber}`,
		actDate: doc.acceptedAt ? doc.acceptedAt.slice(0, 10) : doc.documentDate,
		fromBranchName: doc.fromBranchName,
		toBranchName: doc.toBranchName,
		discrepancies,
		totalShortageCostKopecks: totalShortageCost,
		totalSurplusCostKopecks: totalSurplusCost,
		netDiscrepancyCostKopecks: netCost,
		commissionMembers: commission,
		resolutionSummaryRu,
	};
}

// ─── 5. STATUTORY HTML PRINT RENDERER (ФОРМА № М-11 ОКУД 0315006) ─────────────

function escapeHtml(str: string | null | undefined): string {
	if (!str) return "";
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

/**
 * Renders Form M-11 printable HTML document strictly compliant with Russian standard (ОКУД 0315006).
 */
export function renderTransferM11Html(doc: TransferM11Document): string {
	const totalDispatchedRub = kopecksToRub(doc.totalCostDispatchedKopecks).toFixed(2);
	const totalWords = numberToWordsRuKopecks(doc.totalCostDispatchedKopecks);

	const itemRows = doc.items
		.map((item) => {
			const unitCostRub = kopecksToRub(item.unitCostKopecks).toFixed(2);
			const totalCostDispatchedRub = kopecksToRub(item.totalCostDispatchedKopecks).toFixed(2);
			const lotInfo = [
				item.lotNumber ? `Сер: ${escapeHtml(item.lotNumber)}` : "",
				item.expirationDate ? `Срок: ${escapeHtml(item.expirationDate)}` : "",
				item.mdlpDataMatrix ? "Честный ЗНАК" : "",
			]
				.filter(Boolean)
				.join(" / ");

			return `
			<tr>
				<td class="center">${item.itemIndex}</td>
				<td>
					<strong>${escapeHtml(item.itemName)}</strong>
					${lotInfo ? `<br><small class="text-muted">${lotInfo}</small>` : ""}
				</td>
				<td class="center">${escapeHtml(item.nomenclatureCode ?? "—")}</td>
				<td class="center">${escapeHtml(item.unitName)} (${escapeHtml(item.unitOkeiCode)})</td>
				<td class="right">${item.quantityRequested}</td>
				<td class="right"><strong>${item.quantityDispatched}</strong></td>
				<td class="right">${unitCostRub} ₽</td>
				<td class="right"><strong>${totalCostDispatchedRub} ₽</strong></td>
			</tr>
		`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Требование-накладная № ${escapeHtml(doc.documentNumber)} (Форма М-11)</title>
	<style>
		body {
			font-family: "Liberation Sans", "Helvetica Neue", Arial, sans-serif;
			font-size: 12px;
			color: #1a1a1a;
			line-height: 1.4;
			margin: 20px;
		}
		.okud-header {
			display: flex;
			justify-content: flex-end;
			text-align: right;
			font-size: 11px;
			margin-bottom: 8px;
		}
		.okud-table {
			border-collapse: collapse;
			margin-left: auto;
			font-size: 11px;
		}
		.okud-table td, .okud-table th {
			border: 1px solid #333;
			padding: 2px 8px;
		}
		.doc-title {
			text-align: center;
			font-size: 16px;
			font-weight: bold;
			margin: 15px 0 10px 0;
			text-transform: uppercase;
		}
		.doc-meta-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 12px;
		}
		.doc-meta-table td, .doc-meta-table th {
			border: 1px solid #444;
			padding: 4px 6px;
			font-size: 11px;
		}
		.items-table {
			width: 100%;
			border-collapse: collapse;
			margin-bottom: 16px;
		}
		.items-table th, .items-table td {
			border: 1px solid #333;
			padding: 5px 6px;
		}
		.items-table th {
			background-color: #f0f0f0;
			font-weight: bold;
			text-align: center;
			font-size: 11px;
		}
		.center { text-align: center; }
		.right { text-align: right; }
		.text-muted { color: #666; }
		.totals-block {
			margin-top: 10px;
			margin-bottom: 20px;
			font-size: 12px;
		}
		.signatures-grid {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: 30px;
			margin-top: 30px;
			font-size: 11px;
		}
		.signature-line {
			border-bottom: 1px solid #333;
			margin-top: 25px;
			display: flex;
			justify-content: space-between;
			padding-bottom: 2px;
		}
		.stamp-place {
			font-size: 10px;
			color: #777;
			text-align: center;
			margin-top: 4px;
		}
	</style>
</head>
<body>
	<div class="okud-header">
		<div>
			Типовая межотраслевая форма № М-11<br>
			Утверждена Постановлением Госкомстата России от 30.10.97 № 71а
			<table class="okud-table" style="margin-top: 4px;">
				<tr>
					<th>Форма по ОКУД</th>
					<td><strong>0315006</strong></td>
				</tr>
			</table>
		</div>
	</div>

	<div class="doc-title">
		ТРЕБОВАНИЕ-НАКЛАДНАЯ № ${escapeHtml(doc.documentNumber)} от ${escapeHtml(doc.documentDate)}
	</div>

	<table class="doc-meta-table">
		<tr>
			<th rowspan="2">Организация</th>
			<th colspan="2">Структурное подразделение</th>
			<th rowspan="2">Вид деятельности / Операция</th>
			<th colspan="2">Корреспондирующий счет</th>
		</tr>
		<tr>
			<th>Сдатчик (Отправитель)</th>
			<th>Приемщик (Получатель)</th>
			<th>Дебет</th>
			<th>Кредит</th>
		</tr>
		<tr>
			<td>DENTE Стоматологическая сеть</td>
			<td><strong>${escapeHtml(doc.fromBranchName)}</strong> (${escapeHtml(doc.fromWarehouseName)})</td>
			<td><strong>${escapeHtml(doc.toBranchName)}</strong> (${escapeHtml(doc.toWarehouseName)})</td>
			<td class="center">${escapeHtml(doc.operationType)}</td>
			<td class="center"><strong>${escapeHtml(doc.debitAccount)}</strong></td>
			<td class="center"><strong>${escapeHtml(doc.creditAccount)}</strong></td>
		</tr>
	</table>

	<table class="items-table">
		<thead>
			<tr>
				<th rowspan="2" style="width: 30px;">№</th>
				<th rowspan="2">Материал (наименование, сорт, размер, марка)</th>
				<th rowspan="2" style="width: 90px;">Номенклатурный номер</th>
				<th rowspan="2" style="width: 70px;">Ед. изм. (ОКЕИ)</th>
				<th colspan="2">Количество</th>
				<th rowspan="2" style="width: 80px;">Учетная цена</th>
				<th rowspan="2" style="width: 90px;">Сумма</th>
			</tr>
			<tr>
				<th style="width: 70px;">Затребовано</th>
				<th style="width: 70px;">Отпущено</th>
			</tr>
		</thead>
		<tbody>
			${itemRows}
			<tr style="background-color: #fcfcfc; font-weight: bold;">
				<td colspan="4" class="right">ИТОГО:</td>
				<td class="right">${doc.totalQuantityRequested}</td>
				<td class="right">${doc.totalQuantityDispatched}</td>
				<td class="right">—</td>
				<td class="right">${totalDispatchedRub} ₽</td>
			</tr>
		</tbody>
	</table>

	<div class="totals-block">
		<p><strong>Всего отпущено наименований:</strong> ${doc.totalItemsCount}, на сумму <strong>${totalDispatchedRub} ₽</strong></p>
		<p><strong>Сумма прописью:</strong> <em>${escapeHtml(totalWords)}</em></p>
		${doc.notes ? `<p><strong>Примечание:</strong> ${escapeHtml(doc.notes)}</p>` : ""}
	</div>

	<div class="signatures-grid">
		<div>
			<div><strong>Отпустил (Сдатчик):</strong></div>
			<div>Должность: ${escapeHtml(doc.dispatchedBy?.position ?? "Заведующий складом")}</div>
			<div class="signature-line">
				<span>Подпись: _________________</span>
				<span>/ ${escapeHtml(doc.dispatchedBy?.name ?? "_________________")} /</span>
			</div>
			<div class="stamp-place">М.П.</div>
		</div>
		<div>
			<div><strong>Принял (Получатель):</strong></div>
			<div>Должность: ${escapeHtml(doc.acceptedBy?.position ?? "Материально ответственное лицо")}</div>
			<div class="signature-line">
				<span>Подпись: _________________</span>
				<span>/ ${escapeHtml(doc.acceptedBy?.name ?? "_________________")} /</span>
			</div>
			<div class="stamp-place">М.П.</div>
		</div>
	</div>
</body>
</html>`;
}
