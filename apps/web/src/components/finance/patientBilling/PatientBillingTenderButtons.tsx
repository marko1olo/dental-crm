import React from "react";
import { Banknote, Calendar, CreditCard, QrCode, Users, Wallet } from "lucide-react";
import type { PatientBillingPaymentMethod } from "../PatientBillingTypes";

export interface PatientBillingTenderButtonsProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly onSelectTender: (t: PatientBillingPaymentMethod) => void;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
}

export const PatientBillingTenderButtons: React.FC<PatientBillingTenderButtonsProps> = ({
	selectedTender,
	onSelectTender,
	totalNetRub,
	receivedCashRub,
	onSetReceivedCashRub,
}) => {
	return (
		<>
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<CreditCard className="w-4 h-4 text-[var(--teal,#0d9488)]" />
					<h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 uppercase tracking-wider">
						Способ оплаты:
					</h4>
				</div>
				<span className="text-[11px] text-[var(--muted)]">
					Итого к расчету: <strong className="text-[var(--ink)] font-mono font-bold">{totalNetRub.toLocaleString("ru-RU")} ₽</strong>
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 sm:gap-2">
				<button
					type="button"
					onClick={() => onSelectTender("card")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "card"
							? "bg-blue-600 text-white shadow-xs ring-2 ring-blue-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-card"
				>
					<CreditCard className="w-3.5 h-3.5 shrink-0" />
					<span>Терминал / Карта</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("sbp")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "sbp"
							? "bg-purple-600 text-white shadow-xs ring-2 ring-purple-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-sbp"
				>
					<QrCode className="w-3.5 h-3.5 shrink-0" />
					<span>СБП QR (0.7%)</span>
				</button>

				<button
					type="button"
					onClick={() => {
						onSelectTender("cash");
						if (!receivedCashRub) onSetReceivedCashRub(totalNetRub);
					}}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "cash"
							? "bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-cash"
				>
					<Banknote className="w-3.5 h-3.5 shrink-0" />
					<span>Наличные</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("family")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "family"
							? "bg-pink-600 text-white shadow-xs ring-2 ring-pink-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-family"
				>
					<Users className="w-3.5 h-3.5 shrink-0" />
					<span>Семейный счет</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("deposit")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "deposit"
							? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-deposit"
				>
					<Wallet className="w-3.5 h-3.5 shrink-0" />
					<span>Депозит</span>
				</button>

				<button
					type="button"
					onClick={() => onSelectTender("installment")}
					className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
						selectedTender === "installment"
							? "bg-amber-600 text-white shadow-xs ring-2 ring-amber-400"
							: "bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--border,#cbd5e1)] text-[var(--ink)]"
					}`}
					data-testid="tender-btn-installment"
				>
					<Calendar className="w-3.5 h-3.5 shrink-0" />
					<span>Рассрочка 0%</span>
				</button>
			</div>
		</>
	);
};
