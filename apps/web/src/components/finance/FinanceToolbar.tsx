import type { Dashboard, Patient } from "@dental/shared";
import {
	CreditCard,
	ReceiptText,
	MoreHorizontal,
	TrendingUp,
	FileText,
	FileCheck,
	Banknote,
	ShieldCheck,
} from "lucide-react";

export interface FinanceToolbarProps {
	documentPatient: Patient | null;
	billingSummary: Dashboard["billingSummary"] | null;
	isCashShiftOpen: boolean;
	onToggleCashShift: () => void;
	isShiftOpen: boolean;
	onPayDebtQuick: () => void;
	money: (val: number | null) => string;
	onOpenInvoices: () => void;
	isFinanceOptionsOpen: boolean;
	onToggleFinanceOptions: () => void;
	onCloseFinanceOptions: () => void;
	onOpenPnl: () => void;
	onGoToDocuments: () => void;
	onOpenCashbox: () => void;
	onOpenBillingAct?: () => void;
}

export function FinanceToolbar({
	documentPatient,
	billingSummary,
	isCashShiftOpen,
	onToggleCashShift,
	isShiftOpen,
	onPayDebtQuick,
	money,
	onOpenInvoices,
	isFinanceOptionsOpen,
	onToggleFinanceOptions,
	onCloseFinanceOptions,
	onOpenPnl,
	onGoToDocuments,
	onOpenCashbox,
	onOpenBillingAct,
}: FinanceToolbarProps) {
	return (
		<div className="finance-monolithic-toolbar min-h-[44px] sm:min-h-[36px] sm:h-9 sm:max-h-9 flex items-center justify-between gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 border border-[var(--line)] bg-[var(--paper)] rounded-xl shadow-xs mb-1.5 sm:mb-2 flex-nowrap overflow-hidden shrink-0 select-none">
			<div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 overflow-hidden">
				<span className="truncate text-xs sm:text-sm font-bold text-[var(--ink)] shrink-0">
					<span className="sm:hidden">Оплаты</span>
					<span className="hidden sm:inline">Оплаты и план</span>
				</span>
				<span
					className="text-[11px] sm:text-xs text-[var(--ink)] sm:text-[var(--muted)] min-w-0 flex-1 truncate font-semibold sm:font-normal"
					title={documentPatient?.fullName ?? "пациент не выбран"}
				>
					·{" "}
					<span className="sm:hidden tracking-tight">
						{(() => {
							const name = documentPatient?.fullName ?? "пациент не выбран";
							if (!documentPatient?.fullName) return name;
							const parts = name.trim().split(/\s+/);
							if (parts.length >= 2) {
								const initials = parts
									.slice(1)
									.map((p: string) => (p[0] ? `${p[0]}.` : ""))
									.filter(Boolean)
									.join(" ");
								return `${parts[0]} ${initials}`.trim();
							}
							return name;
						})()}
					</span>
					<span className="hidden sm:inline">
						{documentPatient?.fullName ?? "пациент не выбран"}
					</span>
				</span>
				<button
					type="button"
					onClick={onToggleCashShift}
					className={`inline-flex items-center gap-1.5 px-1.5 sm:px-2 py-0.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 select-none ${
						isCashShiftOpen
							? "bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300"
							: "bg-[var(--paper-soft)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong,rgba(0,0,0,0.15))]"
					}`}
					title={
						isCashShiftOpen
							? "Скрыть панель кассовой смены"
							: "Открыть управление сменой ККТ 54-ФЗ"
					}
					aria-expanded={isCashShiftOpen}
					data-testid="btn-toggle-cash-shift"
				>
					<span
						className={`w-1.5 h-1.5 rounded-full shrink-0 ${
							isShiftOpen ? "bg-emerald-500" : "bg-rose-500"
						}`}
					/>
					<span className="sm:hidden">ККТ</span>
					<span className="hidden sm:inline">ККТ 54-ФЗ</span>
				</button>
			</div>
			<div className="finance-header-actions flex items-center gap-1.5 shrink-0 flex-nowrap">
				{billingSummary && billingSummary.totalDueRub > 0 && (
					<button
						className="secondary-button min-h-[44px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-bold text-xs px-2 sm:px-2.5 py-0 cursor-pointer bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/40 hover:bg-rose-500/20 active:scale-95 transition-all rounded-lg shrink-0"
						type="button"
						onClick={onPayDebtQuick}
						title={`1-клик оплата остатка долга: ${money(billingSummary.totalDueRub)}`}
						aria-label="Оплатить долг"
						data-testid="btn-finance-pay-debt-quick"
						data-tour="cashier-pay"
					>
						<CreditCard
							size={13}
							className="shrink-0 text-rose-600 dark:text-rose-400"
						/>
						<span className="truncate hidden sm:inline">
							Оплатить долг ({money(billingSummary.totalDueRub)})
						</span>
						<span className="truncate sm:hidden">
							{money(billingSummary.totalDueRub)}
						</span>
					</button>
				)}
				<button
					className="secondary-button min-h-[44px] sm:min-h-0 sm:h-7 inline-flex items-center gap-1 font-semibold text-xs px-2 sm:px-2.5 py-0 cursor-pointer rounded-lg shrink-0"
					type="button"
					onClick={onOpenInvoices}
					aria-label="Счета и акты (804н)"
					data-testid="btn-finance-open-invoices"
				>
					<ReceiptText size={13} className="shrink-0" />
					<span className="truncate hidden sm:inline">Счета и акты (804н)</span>
				</button>

				{/* Поповер вторичных действий: P&L, Документы и Смена ККТ */}
				<div className="relative shrink-0">
					<button
						type="button"
						onClick={onToggleFinanceOptions}
						data-testid="finance-toolbar-options-btn"
						className="min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0 sm:h-7 w-11 sm:w-7 p-0 flex items-center justify-center shrink-0 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] cursor-pointer transition-colors"
						title="Дополнительные финансовые отчеты и документы"
						aria-label="Дополнительные действия"
						aria-expanded={isFinanceOptionsOpen}
					>
						<MoreHorizontal
							size={15}
							className="shrink-0"
							aria-hidden="true"
						/>
					</button>
					{isFinanceOptionsOpen && (
						<div
							className="absolute right-0 top-full mt-1 w-52 py-1.5 px-1 bg-[var(--paper)] border border-[var(--line)] rounded-xl shadow-lg z-50 flex flex-col gap-1 text-left"
							role="menu"
						>
							<button
								type="button"
								onClick={() => {
									onCloseFinanceOptions();
									onOpenPnl();
								}}
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
								role="menuitem"
							>
								<TrendingUp
									size={14}
									className="shrink-0 text-emerald-600 dark:text-emerald-400"
								/>
								<span>Управленческий P&L</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onCloseFinanceOptions();
									onGoToDocuments();
								}}
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
								role="menuitem"
							>
								<FileText
									size={14}
									className="shrink-0 text-sky-600 dark:text-sky-400"
								/>
								<span>Документы</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onCloseFinanceOptions();
									onOpenBillingAct?.();
								}}
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
								role="menuitem"
								data-testid="btn-finance-open-billing-act"
							>
								<FileCheck
									size={14}
									className="shrink-0 text-indigo-600 dark:text-indigo-400"
								/>
								<span>Акт А4 и гарантии</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onCloseFinanceOptions();
									onOpenCashbox();
								}}
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
								role="menuitem"
								data-testid="btn-finance-open-cashbox"
								data-tour="fast-cashier"
							>
								<Banknote
									size={14}
									className="shrink-0 text-teal-600 dark:text-teal-400"
								/>
								<span>Касса 54-ФЗ (АРМ)</span>
							</button>
							<button
								type="button"
								onClick={() => {
									onCloseFinanceOptions();
									onToggleCashShift();
								}}
								className="w-full text-left px-2.5 py-1.5 text-xs font-medium rounded-lg hover:bg-[var(--line)] text-[var(--ink)] flex items-center gap-2 cursor-pointer transition-colors min-h-[44px] sm:min-h-[32px]"
								role="menuitem"
								data-testid="menuitem-toggle-cash-shift"
							>
								<ShieldCheck
									size={14}
									className="shrink-0 text-amber-600 dark:text-amber-400"
								/>
								<span>
									{isCashShiftOpen
										? "Скрыть смену ККТ"
										: "Кассовая смена ККТ"}
								</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
