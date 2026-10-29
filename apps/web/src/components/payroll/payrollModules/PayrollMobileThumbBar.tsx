import React from "react";
import { Share2, Printer, Check } from "lucide-react";

export interface PayrollMobileThumbBarProps {
	readonly copyFeedback: string | null;
	readonly onSendToMessenger: (platform: "clipboard" | "whatsapp" | "telegram") => void;
	readonly onPrintPayslip: () => void;
	readonly onAccrueSalary: () => void;
	readonly isPeriodClosed?: boolean;
}

export const PayrollMobileThumbBar: React.FC<PayrollMobileThumbBarProps> = ({
	copyFeedback,
	onSendToMessenger,
	onPrintPayslip,
	onAccrueSalary,
	isPeriodClosed = false,
}) => {
	return (
		<div className="payroll-mobile-thumb-bar md:hidden" data-testid="doctor-payroll-mobile-thumb-bar">
			<div className="flex items-center justify-between gap-2.5 w-full">
				<button
					type="button"
					onClick={() => onSendToMessenger("clipboard")}
					className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer shrink-0"
					data-testid="doctor-payroll-mobile-messenger-btn"
					title={copyFeedback ?? "Скопировать сводку в мессенджер"}
					aria-label={copyFeedback ?? "В чат"}
				>
					<Share2 className="w-5 h-5 text-[var(--muted,#64748b)] shrink-0" />
				</button>

				{isPeriodClosed ? (
					<>
						<button
							type="button"
							onClick={onAccrueSalary}
							className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer shrink-0"
							data-testid="doctor-payroll-mobile-accrue-btn"
							title="Выплата проведена"
							aria-label="Выплата проведена"
						>
							<Check className="w-5 h-5 shrink-0" />
						</button>
						<button
							type="button"
							onClick={onPrintPayslip}
							className="inline-flex items-center justify-center gap-1.5 flex-1 min-h-[44px] px-3 text-xs font-bold rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm whitespace-nowrap"
							data-testid="doctor-payroll-mobile-print-btn"
							title="Сформировать печатный расчетный листок"
						>
							<Printer className="w-4 h-4 shrink-0" />
							<span>Печать ведомости</span>
						</button>
					</>
				) : (
					<>
						<button
							type="button"
							onClick={onPrintPayslip}
							className="inline-flex items-center justify-center w-11 h-11 min-h-[44px] min-w-[44px] rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer shrink-0"
							data-testid="doctor-payroll-mobile-print-btn"
							title="Сформировать печатный расчетный листок"
							aria-label="Печать ведомости"
						>
							<Printer className="w-5 h-5 text-[var(--muted,#64748b)] shrink-0" />
						</button>
						<button
							type="button"
							onClick={onAccrueSalary}
							className="inline-flex items-center justify-center gap-1.5 flex-1 min-h-[44px] px-3 text-xs font-bold rounded-xl border border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)] text-white hover:opacity-90 active:scale-98 transition-all cursor-pointer shadow-sm whitespace-nowrap"
							data-testid="doctor-payroll-mobile-accrue-btn"
						>
							<Check className="w-4 h-4 shrink-0" />
							<span>Выплатить зарплату</span>
						</button>
					</>
				)}
			</div>
		</div>
	);
};

export default PayrollMobileThumbBar;
