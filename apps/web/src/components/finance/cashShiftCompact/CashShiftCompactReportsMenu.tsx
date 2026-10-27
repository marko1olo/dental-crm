/**
 * CashShiftCompactReportsMenu.tsx — Выпадающее меню отчетов и кассы (Мандат 8b <= 120 строк).
 */

import React from "react";
import { FileSpreadsheet, FileText, MoreHorizontal, Printer, Zap } from "lucide-react";

export interface CashShiftCompactReportsMenuProps {
	readonly isReportsMenuOpen: boolean;
	readonly setIsReportsMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isProcessing: boolean;
	readonly onPrintXReport: () => void;
	readonly onPrintAccountingStatement: () => void;
	readonly onExport1cCsv: () => void;
	readonly onOpenCashRegisterModal: () => void;
}

export const CashShiftCompactReportsMenu: React.FC<CashShiftCompactReportsMenuProps> = ({
	isReportsMenuOpen,
	setIsReportsMenuOpen,
	isProcessing,
	onPrintXReport,
	onPrintAccountingStatement,
	onExport1cCsv,
	onOpenCashRegisterModal,
}) => {
	return (
		<div className="relative inline-block">
			<button
				type="button"
				onClick={() => setIsReportsMenuOpen((prev) => !prev)}
				data-testid="btn-shift-reports-menu"
				className="secondary-button h-8 min-h-[32px] px-2.5 text-[13px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 rounded-lg"
				title="Отчёты и экспорт (X-отчет, Ведомость А4, 1С)"
			>
				<MoreHorizontal size={14} className="shrink-0" />
				<span className="hidden md:inline">Отчёты</span>
			</button>

			<div
				className={`absolute right-0 top-full mt-1 z-30 min-w-[210px] bg-[var(--paper)] border border-[var(--line)] rounded-lg shadow-lg p-1 gap-0.5 ${
					isReportsMenuOpen ? "flex flex-col" : "hidden"
				}`}
				style={{ display: isReportsMenuOpen ? "flex" : "none" }}
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
					<span>Печать X-отчета (без гашения)</span>
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
	);
};
