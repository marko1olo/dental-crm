/**
 * m11Lifecycle.ts — Lifecycle State Machine & Discrepancy Operations for Form M-11.
 *
 * Statutory reference: Form M-11 (OKUD 0315003 / 0315006).
 * Manages DRAFT -> IN_TRANSIT -> ACCEPTED | DISCREPANCY | CANCELLED mutations,
 * exact kopeck arithmetic recalculations, and statutory Discrepancy Acts.
 */

import { generateTransferM11Id } from "../../utils/idGenerators.js";
import { kopecksToRub } from "../../fiscal/kopecksArithmetic.js";
import type {
	TransferM11Document,
	TransferM11Item,
	TransferM11Status,
	CreateTransferM11DraftInput,
	DispatchTransferM11Input,
	ReceiveTransferM11Input,
	CancelTransferM11Input,
	TransferM11DiscrepancyAct,
} from "./types.js";
import { validateM11WarehousePair, validateM11ItemsNonEmpty } from "./m11Validator.js";

// ─── 1. LIFECYCLE MUTATIONS ────────────────────────────────────────────────────

/**
 * Creates a new Draft for Requirement-Waybill M-11.
 */
export function createTransferM11Draft(input: CreateTransferM11DraftInput): TransferM11Document {
	validateM11WarehousePair(input.fromWarehouseId, input.toWarehouseId);
	validateM11ItemsNonEmpty(input.items);

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

	const docId = input.id ?? generateTransferM11Id();

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

	const dispatchMap = new Map<
		string,
		{
			quantityDispatched: number;
			lotNumber?: string | undefined;
			batchId?: string | undefined;
			expirationDate?: string | undefined;
			mdlpDataMatrix?: string | undefined;
		}
	>();

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

// ─── 2. DISCREPANCY ACT GENERATOR ──────────────────────────────────────────────

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
