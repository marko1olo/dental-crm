import { z } from "zod";

export const TRANSFER_STATUSES = [
	"draft",
	"in_transit",
	"partially_received",
	"completed",
	"cancelled",
] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export interface TransferItem {
	itemId: string;
	itemName: string;
	batchNumber: string;
	requestedQuantity: number;
	sentQuantity: number;
	receivedQuantity: number;
	damagedQuantity: number;
	unitPriceRub: number;
}

export interface WaybillInput {
	organizationId: string;
	sourceBranchId: string;
	destinationBranchId: string;
	items: {
		itemId: string;
		itemName: string;
		batchNumber: string;
		quantity: number;
		unitPriceRub: number;
	}[];
	operatorId: string;
	notes?: string | null;
}

export interface WaybillRecord {
	waybillNumber: string; // e.g. TORG13-2026-00124
	organizationId: string;
	sourceBranchId: string;
	destinationBranchId: string;
	status: TransferStatus;
	items: TransferItem[];
	totalValueRub: number;
	operatorId: string;
	createdAt: Date;
	sentAt: Date | null;
	receivedAt: Date | null;
	hasDiscrepancies: boolean;
	notes: string | null;
}

export class InterBranchInventoryTransferService {
	/**
	 * Генерация номера накладной ТОРГ-13
	 */
	public static generateWaybillNumber(sequence: number, date: Date = new Date()): string {
		const year = date.getFullYear();
		const seq = String(sequence).padStart(5, "0");
		return `TORG13-${year}-${seq}`;
	}

	/**
	 * Создание черновика накладной ТОРГ-13
	 */
	public static createDraftWaybill(input: WaybillInput, sequence: number): WaybillRecord {
		if (input.sourceBranchId === input.destinationBranchId) {
			throw new Error("Филиал-отправитель и филиал-получатель не могут совпадать.");
		}

		if (!input.items || input.items.length === 0) {
			throw new Error("Накладная ТОРГ-13 не может быть пустой.");
		}

		const waybillNumber = this.generateWaybillNumber(sequence);
		let totalValue = 0;

		const items: TransferItem[] = input.items.map((it) => {
			if (it.quantity <= 0) {
				throw new Error(`Некорректное количество для позиции ${it.itemName}: ${it.quantity}`);
			}
			const lineValue = it.quantity * it.unitPriceRub;
			totalValue += lineValue;

			return {
				itemId: it.itemId,
				itemName: it.itemName,
				batchNumber: it.batchNumber,
				requestedQuantity: it.quantity,
				sentQuantity: 0,
				receivedQuantity: 0,
				damagedQuantity: 0,
				unitPriceRub: it.unitPriceRub,
			};
		});

		return {
			waybillNumber,
			organizationId: input.organizationId,
			sourceBranchId: input.sourceBranchId,
			destinationBranchId: input.destinationBranchId,
			status: "draft",
			items,
			totalValueRub: Number(totalValue.toFixed(2)),
			operatorId: input.operatorId,
			createdAt: new Date(),
			sentAt: null,
			receivedAt: null,
			hasDiscrepancies: false,
			notes: input.notes ?? null,
		};
	}

	/**
	 * Отправка со склада (блокировка партии в пути `in_transit`)
	 */
	public static dispatchWaybill(waybill: WaybillRecord): WaybillRecord {
		if (waybill.status !== "draft") {
			throw new Error(`Невозможно отправить накладную в статусе ${waybill.status}.`);
		}

		const updatedItems = waybill.items.map((it) => ({
			...it,
			sentQuantity: it.requestedQuantity,
		}));

		return {
			...waybill,
			status: "in_transit",
			items: updatedItems,
			sentAt: new Date(),
		};
	}

	/**
	 * Приемка на складе-получателе с фиксацией расхождений и брака
	 */
	public static receiveWaybill(
		waybill: WaybillRecord,
		receipt: {
			itemId: string;
			receivedQuantity: number;
			damagedQuantity?: number;
		}[],
	): WaybillRecord {
		if (waybill.status !== "in_transit") {
			throw new Error(`Приемка невозможна: накладная находится в статусе ${waybill.status}.`);
		}

		let hasDiscrepancies = false;

		const updatedItems = waybill.items.map((item) => {
			const found = receipt.find((r) => r.itemId === item.itemId);
			const received = found ? found.receivedQuantity : 0;
			const damaged = found ? found.damagedQuantity ?? 0 : 0;

			if (received + damaged !== item.sentQuantity) {
				hasDiscrepancies = true;
			}

			return {
				...item,
				receivedQuantity: received,
				damagedQuantity: damaged,
			};
		});

		const allReceived = updatedItems.every(
			(it) => it.receivedQuantity === it.sentQuantity && it.damagedQuantity === 0,
		);

		return {
			...waybill,
			status: allReceived ? "completed" : "partially_received",
			items: updatedItems,
			receivedAt: new Date(),
			hasDiscrepancies,
		};
	}
}
