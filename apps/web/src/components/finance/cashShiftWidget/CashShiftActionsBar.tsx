import React from "react";
import { FileSpreadsheet, FileText, Layers, MinusCircle, MoreHorizontal, PlusCircle, Printer, Zap } from "lucide-react";

interface CashShiftActionsBarProps {
	readonly pendingOfflineCount: number;
	readonly isProcessing: boolean;
	readonly isBottomActionsMenuOpen: boolean;
	readonly setIsBottomActionsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onOpenCashInModal: () => void;
	readonly onOpenCashOutModal: () => void;
	readonly onPrintXReport: () => void;
	readonly onPrintAccountingStatement: () => void;
	readonly onExport1cCsv: () => void;
	readonly onOpenOfflineBatchModal: () => void;
	readonly onOpenCashRegisterModal: () => void;
}

export function CashShiftActionsBar({
	pendingOfflineCount,
	isProcessing,
	isBottomActionsMenuOpen,
	setIsBottomActionsMenuOpen,
	onOpenCashInModal,
	onOpenCashOutModal,
	onPrintXReport,
	onPrintAccountingStatement,
	onExport1cCsv,
	onOpenOfflineBatchModal,
	onOpenCashRegisterModal,
}: CashShiftActionsBarProps) {
	return (
		<div className="cash-shift-actions flex-wrap items-center">
			<button type="button" onClick={onOpenCashInModal} data-testid="btn-open-cash-in-modal" className="min-h-[44px] px-4 rounded-xl border border-[var(--ok-fg,rgba(16,185,129,0.3))] bg-[var(--ok-bg,rgba(16,185,129,0.1))] hover:opacity-90 text-[var(--ok-fg,#059669)] dark:text-[var(--ok-fg,#34d399)] text-xs font-bold flex items-center gap-2 cursor-pointer" title="Внесение наличных">
				<PlusCircle size={16} className="text-[var(--ok-fg,#10b981)]" />
				<span>Внесение ДС</span>
			</button>
			<button type="button" onClick={onOpenCashOutModal} data-testid="btn-open-cash-out-modal" className="min-h-[44px] px-4 rounded-xl border border-[var(--danger,rgba(239,68,68,0.3))] bg-[var(--danger-soft,rgba(239,68,68,0.1))] hover:opacity-90 text-[var(--danger,#dc2626)] dark:text-[var(--danger,#f87171)] text-xs font-bold flex items-center gap-2 cursor-pointer" title="Изъятие наличных">
				<MinusCircle size={16} className="text-[var(--danger,#ef4444)]" />
				<span>Изъятие / Инкассация</span>
			</button>
			<div className="relative inline-block">
				<button type="button" onClick={() => setIsBottomActionsMenuOpen((prev) => !prev)} data-testid="btn-shift-bottom-actions-menu" className="min-h-[44px] px-3.5 rounded-xl border border-[var(--line,rgba(255,255,255,0.1))] bg-[var(--paper-soft,#f8fafc)] text-xs font-bold flex items-center gap-1.5 hover:bg-[var(--glass-hover)] cursor-pointer text-[var(--ink)]">
					<MoreHorizontal size={16} />
					<span>Отчеты и действия</span>
				</button>
				<div className={`absolute left-0 sm:left-auto sm:right-0 bottom-full mb-2 z-30 min-w-[230px] bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xl p-1.5 gap-1 ${isBottomActionsMenuOpen ? "flex flex-col" : "hidden"}`} style={{ display: isBottomActionsMenuOpen ? "flex" : "none" }}>
					<button type="button" onClick={() => { setIsBottomActionsMenuOpen(false); onPrintXReport(); }} aria-busy={isProcessing} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)]" data-testid="btn-print-x-report">
						<Printer size={15} className="shrink-0 text-[var(--muted)]" />
						<span>Печать X-отчета (без гашения)</span>
					</button>
					<button type="button" onClick={() => { setIsBottomActionsMenuOpen(false); onPrintAccountingStatement(); }} data-testid="btn-print-accounting-statement" className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)]">
						<FileText size={15} className="shrink-0 text-[var(--teal)]" />
						<span>Ведомость А4</span>
					</button>
					<button type="button" onClick={() => { setIsBottomActionsMenuOpen(false); onExport1cCsv(); }} data-testid="btn-export-1c-csv" className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)]">
						<FileSpreadsheet size={15} className="shrink-0 text-[var(--brand)]" />
						<span>Экспорт в 1С</span>
					</button>
					<button type="button" onClick={() => { setIsBottomActionsMenuOpen(false); onOpenOfflineBatchModal(); }} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)]" data-testid="btn-open-offline-fiscal-queue">
						<Layers size={15} className="shrink-0 text-[var(--warning-fg)]" />
						<span>Очередь чеков и сверка {pendingOfflineCount > 0 ? `(${pendingOfflineCount})` : ""}</span>
					</button>
					<button type="button" onClick={() => { setIsBottomActionsMenuOpen(false); onOpenCashRegisterModal(); }} className="w-full text-left px-3 py-2 text-xs font-medium rounded-lg hover:bg-[var(--paper-soft)] flex items-center gap-2.5 cursor-pointer text-[var(--ink)]" data-testid="btn-open-cash-register-arm">
						<Zap size={15} className="shrink-0 text-[var(--warning-fg)]" />
						<span>АРМ кассы (Сверка / Лента)</span>
					</button>
				</div>
			</div>
			{pendingOfflineCount > 0 && (
				<button
					type="button"
					onClick={onOpenOfflineBatchModal}
					className="dente-btn dente-btn-secondary min-h-[44px] px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
					title={`Очередь чеков: ${pendingOfflineCount}`}
				>
					<Layers size={14} className="text-[var(--teal)] shrink-0" />
					<span>Очередь: {pendingOfflineCount}</span>
				</button>
			)}
		</div>
	);
}
