import type { ClinicFiscalRequisites, OfflineFiscalBatchResult, OfflineQueueFiscalItem } from "@dental/shared";
import type { QueuedFiscalReceiptItem } from "../../../../services/hardware/hardwareTypes";

export interface OfflineFiscalBatchModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly queuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly cashierFullName?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly shiftNumber?: number | undefined;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
	readonly onBatchProcessed?: (result: OfflineFiscalBatchResult) => void;
}

export interface DisplayReceiptItem {
	readonly id: string;
	readonly timestampIso: string;
	readonly patientFullName: string;
	readonly itemsNames: string;
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly advanceOffsetRub: number;
	readonly totalRub: number;
	readonly status: "pending" | "fiscalized" | "duplicate_skipped";
	readonly fiscalDocNumber?: number | undefined;
}

export function mapHardwareQueueItemToOfflineItem(q: QueuedFiscalReceiptItem): OfflineQueueFiscalItem {
	return {
		id: q.id,
		paymentId: q.paymentId || undefined,
		invoiceId: undefined,
		patientId: q.payload.patientId || "pat-offline",
		patientFullName: q.payload.customerContact || "Пациент клиники",
		timestampIso: q.createdAt,
		operationType: q.payload.operationType === "income_return" ? "income_return" : "income",
		items: q.payload.items.map((it) => ({
			name: it.name,
			priceRub: it.priceRub,
			quantity: it.quantity,
			discountRub: 0,
			markingCode: it.markingCode,
			medicalServiceCode804n: it.medicalServiceCode804n,
		})),
		tenders: {
			cashRub: q.payload.cashRub || 0,
			cardRub: q.payload.electronicRub || 0,
			sbpRub: q.payload.sbpRub || 0,
			advanceOffsetRub: q.payload.prepaidRub || 0,
		},
		cashierFullName: q.payload.cashierFullName,
		cashierInn: q.payload.cashierInn,
	};
}
