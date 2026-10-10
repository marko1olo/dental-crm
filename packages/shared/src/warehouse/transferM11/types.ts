/**
 * types.ts — Types, Schemas, and Status Matrix for Form M-11 Inter-Warehouse Transfers.
 *
 * Statutory reference: Form M-11 (OKUD 0315003 / 0315006, Goskomstat Decree No. 71a).
 * Strict kopeck arithmetic, Russian localization, and full MDLP/serial lot compliance.
 */

import { z } from "zod";
import type { Kopecks } from "../../utils/money.js";

// ─── 1. STATUS & DATA SCHEMAS ──────────────────────────────────────────────────

export const transferM11StatusSchema = z.enum([
	"DRAFT", // Черновик требования-накладной
	"IN_TRANSIT", // ТМЦ отпущены со склада-отправителя и находятся в пути
	"ACCEPTED", // ТМЦ приняты складом-получателем без расхождений
	"DISCREPANCY", // ТМЦ приняты с расхождениями (составлен акт расхождений)
	"CANCELLED", // Перемещение отменено
]);
export type TransferM11Status = z.infer<typeof transferM11StatusSchema>;

export const TRANSFER_M11_STATUS_LABELS_RU: Record<TransferM11Status, string> = {
	DRAFT: "Черновик",
	IN_TRANSIT: "В пути",
	ACCEPTED: "Принято",
	DISCREPANCY: "Принято с расхождениями",
	CANCELLED: "Отменено",
};

// ─── 2. ACCOUNTING CORRESPONDENCE (ПЛАН СЧЕТОВ РСБУ: 10.01, 10.06, 10.09) ──────

export const M11_ACCOUNT_SUBACCOUNTS = {
	RAW_MATERIALS: "10.01", // Сырье и материалы (стоматологические композиты, анестетики, боры)
	PURCHASED_SEMI_FINISHED: "10.02", // Покупные полуфабрикаты (зуботехнические заготовки)
	FUEL: "10.03", // Топливо
	CONTAINERS: "10.04", // Тара и тарные материалы
	SPARE_PARTS: "10.05", // Запасные части (наконечники, шланги, лампы)
	OTHER_MATERIALS: "10.06", // Прочие материалы (ветошь, одноразовая спецодежда)
	ACCESSORIES_INVENTORY: "10.09", // Инвентарь и хозяйственные принадлежности (срок службы < 12 мес)
} as const;

export const m11AccountCodeSchema = z.string().regex(/^10\.(0[1-9]|1[0-2])$/, "Счет должен соответствовать субсчету счета 10 (например, 10.01, 10.06, 10.09)");

// ─── 3. RESPONSIBLE OFFICERS (МОЛ — МАТЕРИАЛЬНО ОТВЕТСТВЕННЫЕ ЛИЦА) ───────────

export const responsibleOfficerSchema = z.object({
	name: z.string().min(1, "ФИО ответственного лица обязательно"),
	position: z.string().min(1, "Должность обязательна"),
	employeeId: z.string().optional().nullable(),
	signatureDate: z.string().optional().nullable(),
});
export type ResponsibleOfficer = z.infer<typeof responsibleOfficerSchema>;

// ─── 4. ITEM SPECIFICATIONS ────────────────────────────────────────────────────

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

// ─── 5. DOCUMENT ROOT SPECIFICATION ───────────────────────────────────────────

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
	debitAccount: z.string().default("10.01"), // Сырье и материалы (получатель)
	creditAccount: z.string().default("10.01"), // Сырье и материалы (отправитель)
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

// ─── 6. INPUT INTERFACES FOR LIFECYCLE MUTATIONS ───────────────────────────────

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

export interface ReceiveTransferM11Input {
	acceptedBy: ResponsibleOfficer;
	acceptedAt?: string | undefined;
	acceptedItems?: Array<{
		inventoryItemId: string;
		quantityAccepted: number;
		discrepancyReason?: string | undefined;
	}> | undefined;
}

export interface CancelTransferM11Input {
	cancelledBy?: ResponsibleOfficer | undefined;
	cancellationReason: string;
	cancelledAt?: string | undefined;
}

// ─── 7. DISCREPANCY ACT INTERFACE ──────────────────────────────────────────────

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
