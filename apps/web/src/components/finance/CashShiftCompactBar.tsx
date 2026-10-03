/**
 * CashShiftCompactBar.tsx — Компактная полоса кассовой смены для верхних панелей (Compact Mode).
 */

import React from "react";
import {
	FileSpreadsheet,
	FileText,
	Layers,
	Lock,
	MinusCircle,
	MoreHorizontal,
	PlusCircle,
	Printer,
	Unlock,
	Zap,
} from "lucide-react";

export interface CashShiftCompactBarProps {
	readonly isShiftOpen: boolean;
	readonly shiftNumber: number;
	readonly cashierName: string;
	readonly totalTurnoverRub: number;
	readonly pendingOfflineCount: number;
	readonly isProcessing: boolean;
	readonly isReportsMenuOpen: boolean;
	readonly setIsReportsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onOpenCashInModal: () => void;
	readonly onOpenCashOutModal: () => void;
	readonly onToggleShift: () => void;
	readonly onOpenOfflineBatchModal: () => void;
	readonly onPrintXReport: () => void;
	readonly onPrintAccountingStatement: () => void;
	readonly onExport1cCsv: () => void;
	readonly onOpenCashRegisterModal: () => void;
	readonly formatMoneyRu: (value: number) => string;
}

export const CashShiftCompactBar: React.FC<CashShiftCompactBarProps> = ({
	isShiftOpen,
	shiftNumber,
	cashierName,
	totalTurnoverRub,
	pendingOfflineCount,
	isProcessing,
	isReportsMenuOpen,
	setIsReportsMenuOpen,
	onOpenCashInModal,
	onOpenCashOutModal,
	onToggleShift,
	onOpenOfflineBatchModal,
	onPrintXReport,
	onPrintAccountingStatement,
	onExport1cCsv,
	onOpenCashRegisterModal,
	formatMoneyRu,
}) => {
	return (
		<div
			className="cash-shift-container cash-shift-compact flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 sm:px-3 sm:py-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-xs text-xs min-h-[44px] h-auto mb-3"
			data-testid="cash-shift-widget"
		>
			{/* Левая часть: статус смены, номер, кассир, выручка, очередь */}
			<div className="flex items-center gap-2 min-w-0 flex-wrap sm:flex-nowrap flex-1">
				<div
					className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
						isShiftOpen
							? "bg-[var(--ok-bg,rgba(16,185,129,0.15))] text-[var(--ok-fg,#10b981)]"
							: "bg-[var(--danger-soft,rgba(239,68,68,0.15))] text-[var(--danger,#ef4444)]"
					}`}
					title={isShiftOpen ? "Смена открыта" : "Смена закрыта"}
				>
					{isShiftOpen ? <Unlock size={14} /> : <Lock size={14} />}
				</div>

				<span className="font-bold text-[var(--ink)] whitespace-nowrap">
					{`Смена №${shiftNumber}:`}
				</span>

				<span
					className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
						isShiftOpen
							? "bg-[var(--ok-bg,rgba(16,185,129,0.1))] text-[var(--ok-fg,#10b981)] border border-[var(--ok-fg,rgba(16,185,129,0.2))]"
							: "bg-[var(--danger-soft,rgba(239,68,68,0.1))] text-[var(--danger,#ef4444)] border border-[var(--danger,rgba(239,68,68,0.2))]"
					}`}
				>
					{isShiftOpen ? "Открыта" : "Закрыта"}
				</span>

				<span className="text-[var(--muted)] hidden 2xl:inline whitespace-nowrap shrink-0">
					Кассир: <strong className="text-[var(--ink)] font-semibold">{cashierName}</strong>
				</span>

				<span className="text-[var(--muted)] hidden sm:inline">•</span>

				<span className="font-mono font-bold text-[var(--ink)] whitespace-nowrap shrink-0 min-w-max">
					Выручка: {formatMoneyRu(totalTurnoverRub)}
				</span>

				{pendingOfflineCount > 0 && (
					<button
						type="button"
						onClick={onOpenOfflineBatchModal}
						className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[var(--warning-soft,rgba(245,158,11,0.15))] text-[var(--warning-fg,#b45309)] dark:text-[var(--warning,#fbbf24)] border border-[var(--warning,rgba(245,158,11,0.3))] flex items-center gap-1 shrink-0 cursor-pointer animate-pulse hover:opacity-90 transition-colors"
						title="В офлайн-очереди есть чеки"
					>
						<Layers size={12} />
						<span>Очередь: {pendingOfflineCount}</span>
					</button>
				)}
			</div>

			{/* Правая часть: кнопки внесения/изъятия, кнопка смены, меню отчетов (...) */}
			<div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap justify-start sm:justify-end shrink-0 relative">
				<button
					type="button"
					onClick={onOpenCashInModal}
					data-testid="btn-compact-cash-in"
					className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-[var(--ok-fg,#10b981)]"
					title="Внесение наличных в кассу (размен / приход)"
				>
					<PlusCircle size={13} className="shrink-0 text-[var(--ok-fg,#10b981)]" />
					<span className="hidden sm:inline">Внесение</span>
				</button>

				<button
					type="button"
					onClick={onOpenCashOutModal}
					data-testid="btn-compact-cash-out"
					className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-[var(--danger,#ef4444)]"
					title="Изъятие / инкассация наличных из кассы"
				>
					<MinusCircle size={13} className="shrink-0 text-[var(--danger,#ef4444)]" />
					<span className="hidden sm:inline">Изъятие</span>
				</button>

				<button
					type="button"
					onClick={onToggleShift}
					aria-busy={isProcessing}
					data-testid="cash-shift-toggle-btn"
					className={`min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer transition-all ${
						isShiftOpen
							? "bg-[var(--danger,#ef4444)] hover:opacity-90 text-white"
							: "bg-[var(--ok,#10b981)] hover:opacity-90 text-white"
					}`}
					title={isShiftOpen ? "Сформировать Z-отчет и закрыть смену" : "Открыть кассовую смену"}
				>
					{isShiftOpen ? (
						<>
							<Lock size={13} />
							<span>Закрыть смену (Z-отчет)</span>
						</>
					) : (
						<>
							<Unlock size={13} />
							<span>Открыть смену</span>
						</>
					)}
				</button>

				{/* Выпадающее меню отчетов и выгрузки (...) по Мандату 8p */}
				<div className="relative inline-block">
					<button
						type="button"
						onClick={() => setIsReportsMenuOpen((prev) => !prev)}
						data-testid="btn-shift-reports-menu"
						className="secondary-button min-h-[44px] px-2.5 py-1 text-xs font-semibold flex items-center gap-1 cursor-pointer shrink-0"
						title="Отчёты и экспорт (X-отчет, Ведомость А4, 1С)"
					>
						<MoreHorizontal size={14} className="shrink-0" />
						<span className="hidden md:inline">Отчёты</span>
					</button>

					<div
						className={`absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-lg p-1 flex flex-col gap-0.5 ${
							isReportsMenuOpen ? "block" : "hidden"
						}`}
					>
						<button
							type="button"
							onClick={() => {
								setIsReportsMenuOpen(false);
								onPrintXReport();
							}}
							aria-busy={isProcessing}
							data-testid="btn-print-x-report"
							className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
							title="Печать X-отчета (без гашения)"
						>
							<Printer size={13} className="shrink-0 text-[var(--muted)]" />
							<span>X-отчет (промежуточный)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsReportsMenuOpen(false);
								onPrintAccountingStatement();
							}}
							data-testid="btn-print-accounting-statement"
							className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
							title="Печать сводной бухгалтерской ведомости А4"
						>
							<FileText size={13} className="shrink-0 text-[var(--teal)]" />
							<span>Ведомость А4</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsReportsMenuOpen(false);
								onExport1cCsv();
							}}
							data-testid="btn-export-1c-csv"
							className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
							title="Выгрузить данные смены для 1С:Бухгалтерии"
						>
							<FileSpreadsheet size={13} className="shrink-0 text-[var(--brand)]" />
							<span>Экспорт в 1С (CSV)</span>
						</button>

						<button
							type="button"
							onClick={() => {
								setIsReportsMenuOpen(false);
								onOpenCashRegisterModal();
							}}
							data-testid="btn-open-cash-register-modal"
							className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer text-[var(--ink)]"
							title="Открыть кассу клиники (сверка наличности, X/Z-лента)"
						>
							<Zap size={13} className="shrink-0 text-[var(--warning-fg,#b45309)]" />
							<span>Касса клиники</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
