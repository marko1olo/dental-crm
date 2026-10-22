import React from "react";
import { FileSpreadsheet, Layers, Printer, Sparkles, X } from "lucide-react";
import { DEFAULT_CLINIC_FISCAL_REQUISITES } from "@dental/shared";
import { OfflineFiscalBatchSummaryBar } from "./offlineFiscalBatch/OfflineFiscalBatchSummaryBar";
import { OfflineFiscalBatchQueueTab } from "./offlineFiscalBatch/OfflineFiscalBatchQueueTab";
import { OfflineFiscalBatchShiftsTab } from "./offlineFiscalBatch/OfflineFiscalBatchShiftsTab";
import { OfflineFiscalBatchReconciliationTab } from "./offlineFiscalBatch/OfflineFiscalBatchReconciliationTab";
import { useOfflineFiscalBatchState } from "./offlineFiscalBatch/useOfflineFiscalBatchState";
import type { OfflineFiscalBatchModalProps } from "./offlineFiscalBatch/offlineFiscalBatchTypes";

export type { OfflineFiscalBatchModalProps, DisplayReceiptItem } from "./offlineFiscalBatch/offlineFiscalBatchTypes";

export function OfflineFiscalBatchModal({
	isOpen,
	onClose,
	queuedReceipts: initialQueuedReceipts,
	cashierFullName = "Кассир",
	clinicRequisites = DEFAULT_CLINIC_FISCAL_REQUISITES,
	onBatchProcessed,
}: OfflineFiscalBatchModalProps) {
	const s = useOfflineFiscalBatchState({ initialQueuedReceipts, cashierFullName, clinicRequisites, onBatchProcessed });

	if (!isOpen) {
		return [];
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" data-testid="offline-fiscal-batch-modal">
			<div className="relative flex flex-col w-full max-w-5xl max-h-[90vh] bg-[var(--paper)] text-[var(--ink)] rounded-xl shadow-2xl border border-[var(--glass-border)] overflow-hidden">
				<div className="flex items-center justify-between px-6 py-4 border-b border-[var(--glass-border)] bg-[var(--paper-strong)]">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
							<Layers className="w-6 h-6" />
						</div>
						<div>
							<h2 className="text-lg font-bold text-[var(--ink)]">Пакетная печать и сверка офлайн-чеков кассы</h2>
							<p className="text-xs text-[var(--muted)]">Автоматическое пробитие накопившихся оплат, закрытие смен Z-отчетами и исключение дублей</p>
						</div>
					</div>
					<button onClick={onClose} className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-[var(--glass-hover)] flex items-center justify-center cursor-pointer" title="Закрыть" data-testid="offline-fiscal-batch-close-btn">
						<X className="w-5 h-5 text-[var(--muted)]" />
					</button>
				</div>

				<OfflineFiscalBatchSummaryBar queueSummary={s.queueSummary} />

				<div className="flex items-center justify-between px-6 pt-3 border-b border-[var(--glass-border)] bg-[var(--paper-strong)]">
					<div className="flex gap-2">
						<button onClick={() => s.setActiveTab("queue")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${s.activeTab === "queue" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`} data-testid="tab-fiscal-queue-btn">
							1. Очередь чеков ({s.receiptsToDisplay.length})
						</button>
						<button onClick={() => s.setActiveTab("shifts")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${s.activeTab === "shifts" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`} data-testid="tab-fiscal-shifts-btn">
							2. Сформированные смены (Z-отчеты) {s.batchResult ? `(${s.batchResult.shifts.length})` : ""}
						</button>
						<button onClick={() => s.setActiveTab("reconciliation")} className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${s.activeTab === "reconciliation" ? "border-emerald-500 text-emerald-600 dark:text-emerald-400" : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`} data-testid="tab-fiscal-reconciliation-btn">
							3. Сверка с эквайрингом
						</button>
					</div>

					{!s.batchResult ? (
						<button onClick={s.handleExecuteBatchFiscalization} disabled={s.isProcessing} className="flex items-center gap-2 px-5 py-2.5 mb-2 font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-lg shadow-md min-h-[48px] cursor-pointer" data-testid="btn-execute-batch-fiscalization">
							<Sparkles className="w-5 h-5 animate-pulse" />
							{s.isProcessing ? "Фискализация..." : "Фискализировать все чеки"}
						</button>
					) : (
						<div className="flex gap-2 mb-2">
							<button onClick={s.handlePrintAccountingStatement} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--glass-hover)] cursor-pointer" data-testid="btn-print-batch-statement">
								<Printer className="w-4 h-4 text-emerald-600" />
								Сводная ведомость (А4)
							</button>
							<button onClick={s.handleExportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-[var(--glass-border)] bg-[var(--paper)] hover:bg-[var(--glass-hover)] cursor-pointer" data-testid="btn-export-batch-csv">
								<FileSpreadsheet className="w-4 h-4 text-blue-600" />
								Экспорт в 1С (CSV)
							</button>
						</div>
					)}
				</div>

				<div className="flex-1 p-6 overflow-y-auto">
					{s.activeTab === "queue" && <OfflineFiscalBatchQueueTab receiptsToDisplay={s.receiptsToDisplay} filteredReceipts={s.filteredReceipts} statusFilter={s.statusFilter} setStatusFilter={s.setStatusFilter} />}
					{s.activeTab === "shifts" && <OfflineFiscalBatchShiftsTab batchResult={s.batchResult} />}
					{s.activeTab === "reconciliation" && <OfflineFiscalBatchReconciliationTab batchResult={s.batchResult} queueSummary={s.queueSummary} />}
				</div>

				<div className="flex items-center justify-between px-6 py-4 border-t border-[var(--glass-border)] bg-[var(--paper-strong)]">
					<div className="text-xs text-[var(--muted)]">
						Кассир: <strong>{cashierFullName}</strong> • Касса: <strong>{clinicRequisites.kktModelName || "АТОЛ 27Ф"}</strong>
					</div>
					<button onClick={onClose} className="secondary-button min-h-[44px] px-5 py-2 text-sm font-semibold rounded-xl cursor-pointer" data-testid="offline-fiscal-batch-done-btn">
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
}
