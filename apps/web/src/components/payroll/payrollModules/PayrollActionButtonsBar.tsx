import React from "react";
import { Share2, Download, FileText, X } from "lucide-react";
import type { DoctorPayrollResult } from "../staffPayrollEngine";

export interface PayrollActionButtonsBarProps {
	readonly payrollResult: DoctorPayrollResult;
	readonly copyFeedback: string | null;
	readonly onSendToMessenger: (platform: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onDownloadCsv: () => void;
	readonly onPrintPayslip: () => void;
	readonly onClose: () => void;
}

export const PayrollActionButtonsBar: React.FC<PayrollActionButtonsBarProps> = ({
	payrollResult,
	copyFeedback,
	onSendToMessenger,
	onDownloadCsv,
	onPrintPayslip,
	onClose,
}) => {
	return (
		<>
			<div className="hidden sm:flex p-4 sm:p-5 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] items-center justify-between flex-wrap gap-3 rounded-b-xl">
				<div className="text-xs text-[var(--muted,#64748b)]">
					Специальность: <span className="font-bold text-[var(--ink,#0f172a)]">{payrollResult.specialtyTitleRu}</span>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => onSendToMessenger("clipboard")}
						className="secondary-button dente-btn-secondary h-9 px-3.5 text-xs font-semibold gap-1.5"
						data-testid="doctor-payroll-send-messenger"
						title="Скопировать структурированный расчетный листок для WhatsApp или Telegram"
					>
						<Share2 className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>{copyFeedback ?? "В мессенджер"}</span>
					</button>
					<button
						type="button"
						onClick={onDownloadCsv}
						className="secondary-button dente-btn-secondary h-9 px-3.5 text-xs font-semibold gap-1.5"
						title="Выгрузить расчетную ведомость в формате CSV"
					>
						<Download className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
						<span>Экспорт зарплаты (CSV)</span>
					</button>
					<button
						type="button"
						onClick={onPrintPayslip}
						className="primary-button dente-btn-primary h-9 px-4 text-xs font-bold gap-1.5"
						data-testid="doctor-payroll-print-payslip"
						title="Сформировать печатный расчетный листок с подписями врача и бухгалтера"
					>
						<FileText className="w-3.5 h-3.5" />
						<span>Печать расчетного листка</span>
					</button>
				</div>
			</div>

			<div className="payroll-mobile-thumb-bar sm:hidden" data-testid="doctor-payroll-mobile-thumb-bar">
				<div className="flex items-center justify-between gap-2 w-full">
					<button
						type="button"
						onClick={() => onSendToMessenger("clipboard")}
						className="payroll-mobile-touch-btn secondary-button dente-btn-secondary flex-1 justify-center min-h-[44px]"
						data-testid="doctor-payroll-mobile-messenger-btn"
					>
						<Share2 className="w-4 h-4 text-[var(--teal,#0d9488)]" />
						<span>{copyFeedback ?? "Мессенджер"}</span>
					</button>
					<button
						type="button"
						onClick={onPrintPayslip}
						className="payroll-mobile-touch-btn primary-button dente-btn-primary flex-1 justify-center min-h-[44px]"
						data-testid="doctor-payroll-mobile-print-btn"
					>
						<FileText className="w-4 h-4" />
						<span>Печать расчетного листка</span>
					</button>
					<button
						type="button"
						onClick={onClose}
						className="payroll-mobile-touch-btn secondary-button dente-btn-secondary px-3 min-h-[44px] min-w-[44px]"
						aria-label="Закрыть окно"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			</div>
		</>
	);
};
