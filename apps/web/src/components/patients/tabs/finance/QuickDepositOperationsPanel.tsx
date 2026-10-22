import React, { useId, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Coins, CreditCard, Plus, QrCode, Receipt, Users, Wallet } from "lucide-react";
import { showToast } from "../../../GlobalToast";
import { PRESET_CHARGE_AMOUNTS, PRESET_TOPUP_AMOUNTS } from "./constants";
import type { OperationMode, PaymentMethod, TargetWallet } from "./types";

export interface QuickDepositOperationsPanelProps {
	readonly personalBalance: number;
	readonly disabled?: boolean;
	readonly isSubmitting: boolean;
	readonly onExecute: (amount: number, mode: OperationMode, target: TargetWallet, method: PaymentMethod) => void;
}

export const QuickDepositOperationsPanel: React.FC<QuickDepositOperationsPanelProps> = ({
	personalBalance,
	disabled = false,
	isSubmitting,
	onExecute,
}) => {
	const customInputId = useId();
	const [activeMode, setActiveMode] = useState<OperationMode>("topup");
	const [targetWallet, setTargetWallet] = useState<TargetWallet>("personal");
	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
	const [customAmountStr, setCustomAmountStr] = useState<string>("");

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const parsed = Number.parseInt(customAmountStr.replace(/\s+/g, ""), 10);
		if (!parsed || parsed <= 0) {
			showToast("Введите корректную сумму в рублях", "warning");
			return;
		}
		onExecute(parsed, activeMode, targetWallet, paymentMethod);
		setCustomAmountStr("");
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--glass-border)] shadow-xs flex flex-col gap-4" data-testid="quick-deposit-operations-panel">
			<div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--glass-border)]">
				<div className="flex items-center gap-2">
					<Receipt className="w-4 h-4 text-[var(--teal)] shrink-0" />
					<h3 className="text-sm font-black m-0 text-[var(--ink)]">Быстрое управление авансом у стойки и в кабинете</h3>
				</div>
				<div className="inline-flex p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--glass-border)] gap-1">
					<button type="button" data-testid="btn-mode-topup" onClick={() => setActiveMode("topup")} className={`min-h-[36px] sm:min-h-[32px] px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${activeMode === "topup" ? "bg-emerald-600 text-white shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
						<ArrowUpRight className="w-3.5 h-3.5 shrink-0" /><span>Пополнение (+)</span>
					</button>
					<button type="button" data-testid="btn-mode-charge" onClick={() => setActiveMode("charge")} className={`min-h-[36px] sm:min-h-[32px] px-3.5 text-xs font-bold rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 ${activeMode === "charge" ? "bg-rose-600 text-white shadow-2xs" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}>
						<ArrowDownRight className="w-3.5 h-3.5 shrink-0" /><span>Списание / Зачёт (-)</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Счёт для операции:</span>
					<div className="grid grid-cols-2 gap-2">
						<button type="button" data-testid="btn-target-personal" onClick={() => setTargetWallet("personal")} className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${targetWallet === "personal" ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] shadow-2xs" : "border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"}`}>
							<Wallet className="w-4 h-4 shrink-0" /><span>Личный депозит</span>
						</button>
						<button type="button" data-testid="btn-target-family" onClick={() => setTargetWallet("family")} className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${targetWallet === "family" ? "border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"}`}>
							<Users className="w-4 h-4 shrink-0" /><span>Семейный счёт</span>
						</button>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">Способ оплаты / канал:</span>
					<div className="grid grid-cols-3 gap-2">
						<button type="button" data-testid="btn-method-card" onClick={() => setPaymentMethod("card")} className={`min-h-[44px] px-2 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "card" ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] shadow-2xs" : "border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"}`}>
							<CreditCard className="w-4 h-4 shrink-0" /><span className="truncate">Карта</span>
						</button>
						<button type="button" data-testid="btn-method-cash" onClick={() => setPaymentMethod("cash")} className={`min-h-[44px] px-2 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "cash" ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] shadow-2xs" : "border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"}`}>
							<Coins className="w-4 h-4 shrink-0" /><span className="truncate">Наличные</span>
						</button>
						<button type="button" data-testid="btn-method-sbp" onClick={() => setPaymentMethod("sbp")} className={`min-h-[44px] px-2 rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "sbp" ? "border-[var(--teal)] bg-[var(--teal)]/10 text-[var(--teal)] shadow-2xs" : "border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)]"}`}>
							<QrCode className="w-4 h-4 shrink-0" /><span className="truncate">СБП QR</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">{activeMode === "topup" ? "Быстрый выбор суммы пополнения:" : "Быстрый выбор суммы списания:"}</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{activeMode === "topup" ? PRESET_TOPUP_AMOUNTS.map((amt) => (
						<button key={amt} type="button" data-testid={`btn-quick-deposit-${amt}`} disabled={disabled || isSubmitting} onClick={() => onExecute(amt, activeMode, targetWallet, paymentMethod)} className="min-h-[48px] h-12 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-98 text-emerald-800 dark:text-emerald-200 text-sm font-black inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
							<Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" /><span>{amt.toLocaleString("ru-RU")} ₽</span>
						</button>
					)) : (
						<>
							{PRESET_CHARGE_AMOUNTS.map((amt) => (
								<button key={amt} type="button" data-testid={`btn-quick-charge-${amt}`} disabled={disabled || isSubmitting} onClick={() => onExecute(amt, activeMode, targetWallet, paymentMethod)} className="min-h-[48px] h-12 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 active:scale-98 text-rose-800 dark:text-rose-200 text-sm font-black inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
									<ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" /><span>-{amt.toLocaleString("ru-RU")} ₽</span>
								</button>
							))}
							<button type="button" data-testid="btn-quick-charge-all" disabled={disabled || isSubmitting || personalBalance <= 0} onClick={() => onExecute(personalBalance, activeMode, targetWallet, paymentMethod)} className="min-h-[48px] h-12 px-3 rounded-xl border border-rose-500/40 bg-rose-500/15 hover:bg-rose-500/25 active:scale-98 text-rose-900 dark:text-rose-100 text-xs font-black inline-flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs">
								<span>Весь аванс ({personalBalance.toLocaleString("ru-RU")} ₽)</span>
							</button>
						</>
					)}
				</div>
			</div>

			<form onSubmit={handleSubmit} className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap pt-1">
				<div className="relative flex-1 min-w-[200px]">
					<input id={customInputId} type="text" inputMode="numeric" data-testid="input-custom-deposit-amount" value={customAmountStr} onChange={(e) => setCustomAmountStr(e.target.value)} placeholder="Произвольная сумма (например, 7 500)" className="w-full min-h-[44px] h-11 px-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-bold placeholder:text-[var(--muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal)] transition-all font-mono" />
				</div>
				<button type="submit" data-testid="btn-submit-custom-deposit" disabled={disabled || isSubmitting || !customAmountStr.trim()} className={`min-h-[44px] h-11 px-5 rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 text-white transition-all cursor-pointer shadow-xs whitespace-nowrap ${activeMode === "topup" ? "bg-emerald-600 hover:bg-emerald-700 active:scale-98" : "bg-rose-600 hover:bg-rose-700 active:scale-98"}`}>
					<CheckCircle2 className="w-4 h-4 shrink-0" /><span>{activeMode === "topup" ? "Внести на счёт" : "Списать со счёта"}</span>
				</button>
			</form>
		</div>
	);
};
