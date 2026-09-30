import React from "react";
import {
	CheckCircle2,
	Clock,
	CreditCard,
	FileCheck,
	FileText,
	MoreVertical,
	Printer,
	ShieldCheck,
} from "lucide-react";
import type { BillingInvoice } from "./invoiceTypes.js";

export interface InvoiceCardItemProps {
	invoice: BillingInvoice;
	isMenuOpen: boolean;
	onToggleMenu: () => void;
	onPay: () => void;
	onPrintInvoice: () => void;
	onPrintAct: () => void;
	onApplyWarranty: () => void;
	onPrepareFnsTaxDeduction: () => void;
}

export const InvoiceCardItem: React.FC<InvoiceCardItemProps> = ({
	invoice: inv,
	isMenuOpen,
	onToggleMenu,
	onPay,
	onPrintInvoice,
	onPrintAct,
	onApplyWarranty,
	onPrepareFnsTaxDeduction,
}) => {
	const isPaid = inv.status === "paid";
	const isWarranty = inv.status === "warranty_100";
	const isPending = !isPaid && !isWarranty;

	return (
		<div
			className="invoice-card rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] p-3 sm:p-3.5 shadow-2xs hover:border-teal-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative"
			data-testid={`invoice-card-${inv.id}`}
			style={{
				contentVisibility: "auto",
				containIntrinsicSize: "1px 48px",
			}}
		>
			{/* Left: Invoice Identity & Details */}
			<div className="flex items-start gap-3 min-w-0 flex-1">
				<div
					className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
						isPaid
							? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
							: isWarranty
								? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
								: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
					}`}
				>
					{isPaid ? (
						<CheckCircle2 size={20} />
					) : isWarranty ? (
						<ShieldCheck size={20} />
					) : (
						<Clock size={20} />
					)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-mono text-xs font-extrabold text-[var(--ink,#0f172a)]">
							{inv.number}
						</span>
						<span className="text-xs text-[var(--muted,#64748b)]">
							• {inv.date}
						</span>
						<span
							className={`px-2 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
								isPaid
									? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
									: isWarranty
										? "bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800"
										: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800"
							}`}
						>
							{isPaid
								? "Оплачено"
								: isWarranty
									? "Гарантия 100% (0 ₽)"
									: "К оплате"}
						</span>
					</div>

					<h4
						className="text-sm font-bold text-[var(--ink,#0f172a)] mt-0.5 truncate"
						title={inv.patientName}
					>
						{inv.patientName}
					</h4>

					<div className="flex items-center gap-2 text-xs text-[var(--muted,#64748b)] mt-0.5 flex-wrap">
						<span>
							Врач:{" "}
							<strong className="text-[var(--ink,#0f172a)] font-medium">
								{inv.doctorName}
							</strong>
						</span>
						<span>•</span>
						<span>Услуг: {(inv.items || []).length}</span>
						{inv.paymentMethod && (
							<>
								<span>•</span>
								<span className="text-teal-700 dark:text-teal-400 font-medium">
									{inv.paymentMethod === "card_terminal"
										? "Карта"
										: inv.paymentMethod === "cash"
											? "Наличные"
											: inv.paymentMethod === "sbp"
												? "СБП QR"
												: "Сплит"}
								</span>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Middle: Amount in Roubles */}
			<div className="text-left sm:text-right shrink-0 px-2 sm:px-4">
				<div className="font-mono text-base sm:text-lg font-black text-[var(--ink,#0f172a)]">
					{isWarranty
						? "0 ₽"
						: `${(inv.totalAmountRub ?? 0).toLocaleString("ru-RU")} ₽`}
				</div>
				<div className="text-[11px] text-[var(--muted,#64748b)]">
					{isPaid
						? "Оплачено полностью"
						: isWarranty
							? "Гарантийная скидка 100%"
							: "Остаток к оплате"}
				</div>
			</div>

			{/* Right: Actions (Mandate 8d: <=2 primary buttons, secondary in ..., Mandate 8c: 32px desktop / 44px touch) */}
			<div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
				{isPending && (
					<button
						type="button"
						onClick={onPay}
						className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3.5 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-95"
						data-testid={`btn-pay-invoice-${inv.id}`}
						title="Принять оплату (касса / карта / сплит)"
					>
						<CreditCard size={14} />
						<span>Оплатить</span>
					</button>
				)}

				<button
					type="button"
					onClick={onPrintInvoice}
					className="h-8 min-h-[32px] [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
					data-testid={`btn-print-invoice-${inv.id}`}
					title="Печать счета на оплату"
				>
					<Printer size={14} className="text-slate-500 shrink-0" />
					<span className="hidden md:inline whitespace-nowrap shrink-0">Счет</span>
				</button>

				{/* Context Menu Trigger for secondary options (Mandate 8c: 32px desktop / 44px touch) */}
				<div className="relative">
					<button
						type="button"
						onClick={onToggleMenu}
						className="w-8 h-8 min-h-[32px] min-w-[32px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px] rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer transition-colors"
						aria-label="Дополнительные действия"
						data-testid={`btn-invoice-menu-${inv.id}`}
					>
						<MoreVertical size={16} />
					</button>

					{isMenuOpen && (
						<div
							className="absolute right-0 top-full mt-1 w-52 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xl z-20 py-1 text-xs text-[var(--ink,#0f172a)] animate-in fade-in zoom-in-95 duration-100"
							role="menu"
						>
							<button
								type="button"
								onClick={onPrintAct}
								className="w-full min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 [@media(pointer:coarse)]:py-2 text-left hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
							>
								<FileText size={14} className="text-teal-600" />
								<span>Печать акта выполненных услуг</span>
							</button>

							{isPending && (
								<button
									type="button"
									onClick={onApplyWarranty}
									className="w-full min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 [@media(pointer:coarse)]:py-2 text-left hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-300 flex items-center gap-2 cursor-pointer transition-colors font-medium"
									role="menuitem"
								>
									<ShieldCheck
										size={14}
										className="text-purple-600"
									/>
									<span>Гарантия 100% (0 ₽)</span>
								</button>
							)}

							<button
								type="button"
								onClick={onPrepareFnsTaxDeduction}
								className="w-full min-h-[32px] [@media(pointer:coarse)]:min-h-[44px] px-3 py-1.5 [@media(pointer:coarse)]:py-2 text-left hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer transition-colors"
								role="menuitem"
							>
								<FileCheck size={14} className="text-blue-600" />
								<span>Справка на налоговый вычет</span>
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
