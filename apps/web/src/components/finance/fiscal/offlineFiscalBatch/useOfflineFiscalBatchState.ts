import { useMemo, useState } from "react";
import {
	DEFAULT_CLINIC_FISCAL_REQUISITES,
	processOfflineFiscalBatch,
	type ClinicFiscalRequisites,
	type FiscalShiftSummaryRecord,
	type OfflineFiscalBatchResult,
	type OfflineQueueFiscalItem,
} from "@dental/shared";
import { FiscalReceiptQueueManager } from "../../../../services/hardware/fiscalReceiptQueueManager";
import { showToast } from "../../../GlobalToast";
import { mapHardwareQueueItemToOfflineItem, type DisplayReceiptItem } from "./offlineFiscalBatchTypes";
import { exportBatch1cCsv, printBatchAccountingStatement } from "./offlineFiscalBatchStatements";

interface UseOfflineFiscalBatchStateProps {
	readonly initialQueuedReceipts?: readonly OfflineQueueFiscalItem[] | undefined;
	readonly cashierFullName: string;
	readonly clinicRequisites?: Partial<ClinicFiscalRequisites> | undefined;
	readonly onBatchProcessed?: ((result: OfflineFiscalBatchResult) => void) | undefined;
}

export function useOfflineFiscalBatchState({
	initialQueuedReceipts,
	cashierFullName,
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	onBatchProcessed,
}: UseOfflineFiscalBatchStateProps) {
	const [activeTab, setActiveTab] = useState<"queue" | "shifts" | "reconciliation">("queue");
	const [isProcessing, setIsProcessing] = useState(false);
	const [batchResult, setBatchResult] = useState<OfflineFiscalBatchResult | null>(null);
	const [statusFilter, setStatusFilter] = useState("all");

	const queuedReceipts = useMemo(() => {
		if (initialQueuedReceipts && initialQueuedReceipts.length > 0) return initialQueuedReceipts;
		const livePending = FiscalReceiptQueueManager.getPendingItems();
		if (livePending.length > 0) return livePending.map(mapHardwareQueueItemToOfflineItem);
		return [];
	}, [initialQueuedReceipts]);

	const receiptsToDisplay: readonly DisplayReceiptItem[] = useMemo(() => {
		if (batchResult) {
			return batchResult.processedReceipts.map((r) => ({
				id: r.queueItemId, timestampIso: r.issuedAtIso, patientFullName: r.patientFullName || "Пациент клиники",
				itemsNames: "Стоматологические услуги", cashRub: r.cashRub, cardRub: r.cardRub, sbpRub: r.sbpRub,
				advanceOffsetRub: r.advanceOffsetRub, totalRub: r.totalRub, status: "fiscalized" as const, fiscalDocNumber: r.fiscalDocNumber,
			}));
		}
		return queuedReceipts.map((r) => {
			const { cashRub: cash = 0, cardRub: card = 0, sbpRub: sbp = 0, advanceOffsetRub: advance = 0 } = r.tenders;
			const totalFromTenders = cash + card + sbp + advance;
			const totalFromItems = r.items.reduce((sum, item) => sum + (item.priceRub * (item.quantity ?? 1) - (item.discountRub ?? 0)), 0);
			return {
				id: r.id, timestampIso: r.timestampIso, patientFullName: r.patientFullName || "Пациент клиники",
				itemsNames: r.items?.map((i) => i.name).join(", ") || "Стоматологические услуги",
				cashRub: cash, cardRub: card, sbpRub: sbp, advanceOffsetRub: advance,
				totalRub: totalFromTenders > 0 ? totalFromTenders : totalFromItems, status: "pending" as const,
			};
		});
	}, [batchResult, queuedReceipts]);

	const filteredReceipts = useMemo(() => {
		if (statusFilter === "all") return receiptsToDisplay;
		return receiptsToDisplay.filter((r) => r.status === statusFilter);
	}, [receiptsToDisplay, statusFilter]);

	const queueSummary = useMemo(() => {
		let totalRub = 0; let cashRub = 0; let cardRub = 0; let sbpRub = 0; let advanceRub = 0;
		for (const r of receiptsToDisplay) {
			totalRub += r.totalRub; cashRub += r.cashRub; cardRub += r.cardRub; sbpRub += r.sbpRub; advanceRub += r.advanceOffsetRub;
		}
		return { count: receiptsToDisplay.length, totalRub, cashRub, cardRub, sbpRub, advanceRub };
	}, [receiptsToDisplay]);

	const handleExecuteBatchFiscalization = () => {
		if (queuedReceipts.length === 0) { showToast("Очередь офлайн-чеков пуста. Все чеки уже фискализированы.", "info"); return; }
		setIsProcessing(true);
		try {
			const result = processOfflineFiscalBatch(queuedReceipts, {
				cashierFullName, clinicAddress: clinicRequisites?.address, clinicInn: clinicRequisites?.inn,
				clinicKpp: clinicRequisites?.kpp, clinicLegalName: clinicRequisites?.name, kktRegNumber: clinicRequisites?.kktRegNumber,
				kktSerialNumber: clinicRequisites?.kktSerialNumber, fnSerial: clinicRequisites?.fnSerialNumber, ofdName: clinicRequisites?.ofdName,
			});
			setBatchResult(result);
			setActiveTab("shifts");
			FiscalReceiptQueueManager.flushAllPending();
			onBatchProcessed?.(result);
			showToast(`Успешно фискализировано ${result.processedCount} чеков! Сформировано ${result.shifts.length} смен.`, "success");
		} catch (e: any) {
			showToast(`Ошибка пакетной фискализации: ${e?.message || e}`, "error");
		} finally {
			setIsProcessing(false);
		}
	};

	const shiftsSummaryRecords: readonly FiscalShiftSummaryRecord[] = useMemo(() => {
		if (!batchResult) return [];
		return batchResult.shifts.map((s) => ({
			shiftNumber: s.shiftNumber, date: s.openedAtIso.slice(0, 10), openedAtIso: s.openedAtIso, closedAtIso: s.closedAtIso,
			cashierFullName: cashierFullName || "Кассир", receiptsCount: s.zReport.totalReceiptsCount, cashIncomeRub: s.zReport.incomeCashRub,
			cashIncomeKopecks: s.zReport.incomeCashKopecks, cardIncomeRub: s.zReport.incomeCardRub, cardIncomeKopecks: s.zReport.incomeCardKopecks,
			sbpIncomeRub: s.zReport.incomeSbpRub, sbpIncomeKopecks: s.zReport.incomeSbpKopecks, advanceOffsetIncomeRub: s.zReport.incomeAdvanceOffsetRub,
			advanceOffsetIncomeKopecks: s.zReport.incomeAdvanceOffsetKopecks, returnsTotalRub: s.zReport.incomeReturnTotalRub,
			returnsTotalKopecks: s.zReport.incomeReturnTotalKopecks, shiftRevenueTotalRub: s.zReport.netRevenueRub, shiftRevenueTotalKopecks: s.zReport.netRevenueKopecks,
		}));
	}, [batchResult, cashierFullName]);

	return {
		activeTab, setActiveTab, isProcessing, batchResult, statusFilter, setStatusFilter,
		receiptsToDisplay, filteredReceipts, queueSummary, handleExecuteBatchFiscalization,
		handlePrintAccountingStatement: () => printBatchAccountingStatement(shiftsSummaryRecords, cashierFullName, clinicRequisites),
		handleExportCsv: () => exportBatch1cCsv(shiftsSummaryRecords, cashierFullName, clinicRequisites),
	};
}
