import React, { useState } from "react";
import { Share2, Download, Printer, Check, FileCode } from "lucide-react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";
import { PayrollMobileThumbBar } from "./PayrollMobileThumbBar";

export interface PayrollActionButtonsBarProps {
	readonly payrollResult: DoctorPayrollResult;
	readonly copyFeedback: string | null;
	readonly onSendToMessenger: (platform: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onDownloadCsv: () => void;
	readonly onExport1C?: (() => void) | undefined;
	readonly onPrintPayslip: () => void;
	readonly onClose: () => void;
}

export const PayrollActionButtonsBar: React.FC<PayrollActionButtonsBarProps> = ({
	payrollResult,
	copyFeedback,
	onSendToMessenger,
	onDownloadCsv,
	onExport1C,
	onPrintPayslip,
}) => {
	const [accrualSuccess, setAccrualSuccess] = useState<boolean>(false);

	const handleAccrueSalary = () => {
		setAccrualSuccess(true);
		setTimeout(() => setAccrualSuccess(false), 3500);
	};

	return (
		<>
			{/* Desktop / Tablet Bar */}
			<div className="hidden md:flex p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] items-center justify-between flex-wrap gap-3 rounded-b-xl">
				<div className="text-xs text-[var(--muted,#64748b)]">
					Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{payrollResult.specialtyTitleRu}</span>
					{accrualSuccess && (
						<span className="ml-2 text-[var(--teal,#0d9488)] font-semibold inline-flex items-center gap-1">
							<Check className="w-3.5 h-3.5" /> Зарплата начислена
						</span>
					)}
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => onSendToMessenger("clipboard")}
						className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
						data-testid="doctor-payroll-send-messenger"
						title="Скопировать структурированный расчетный листок для WhatsApp или Telegram"
					>
						<Share2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>{copyFeedback ?? "В мессенджер"}</span>
					</button>
					<button
						type="button"
						onClick={onDownloadCsv}
						className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
						title="Выгрузить расчетную ведомость в формате CSV"
						data-testid="doctor-payroll-download-csv"
					>
						<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Экспорт ведомости (CSV)</span>
					</button>
					{onExport1C && (
						<button
							type="button"
							onClick={onExport1C}
							className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
							title="Выгрузить данные в формате 1С:Зарплата (EnterpriseData XML)"
							data-testid="doctor-payroll-export-1c"
						>
							<FileCode className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
							<span>1С:Зарплата</span>
						</button>
					)}
					<button
						type="button"
						onClick={onPrintPayslip}
						className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer whitespace-nowrap shadow-xs"
						data-testid="doctor-payroll-print-payslip"
						title="Сформировать печатный расчетный листок с подписями"
					>
						<Printer className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Печать ведомости</span>
					</button>
					<button
						type="button"
						onClick={handleAccrueSalary}
						className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-bold rounded-xl border border-[#0d9488] bg-[#0d9488] text-white hover:bg-[#0f766e] active:bg-[#0f766e] shadow-xs transition-all cursor-pointer active:scale-98 whitespace-nowrap"
						data-testid="doctor-payroll-accrue-btn"
						title="Начислить заработную плату врачу по закрытым счетам"
					>
						<Check className="w-3.5 h-3.5" />
						<span>Начислить зарплату</span>
					</button>
				</div>
			</div>

			{/* Mobile Floating Thumb Zone Action Bar (Apple HIG) */}
			<PayrollMobileThumbBar
				copyFeedback={copyFeedback}
				onSendToMessenger={onSendToMessenger}
				onPrintPayslip={onPrintPayslip}
				onAccrueSalary={handleAccrueSalary}
			/>
		</>
	);
};

export default PayrollActionButtonsBar;
