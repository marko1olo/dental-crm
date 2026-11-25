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
		if (disabled || isSubmitting) return;
		const parsed = Number.parseInt(customAmountStr.replace(/\s+/g, ""), 10);
		if (!parsed || parsed <= 0) {
			showToast("Введите корректную сумму в рублях", "warning");
			return;
		}
		onExecute(parsed, activeMode, targetWallet, paymentMethod);
		setCustomAmountStr("");
	};

	const handlePresetExecute = (amt: number) => {
		if (disabled || isSubmitting) return;
		if (amt <= 0) {
			showToast("На балансе нет доступного аванса", "warning");
			return;
		}
		onExecute(amt, activeMode, targetWallet, paymentMethod);
	};

	return (
		<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs flex flex-col gap-4" data-testid="quick-deposit-operations-panel">
			<div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-[var(--line)]">
				<div className="flex items-center gap-2">
					<Receipt className="w-4 h-4 text-[var(--primary)] shrink-0" />
					<h3 className="text-base font-semibold m-0 text-[var(--ink)]">Быстрое управление авансом у стойки и в кабинете</h3>
				</div>
				<div className="inline-flex p-1 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-1">
					<button type="button" data-testid="btn-mode-topup" onClick={() => setActiveMode("topup")} className={`h-11 sm:h-9 px-3.5 text-sm font-medium rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${activeMode === "topup" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
						<ArrowUpRight className="w-4 h-4 shrink-0" /><span>Пополнение (+)</span>
					</button>
					<button type="button" data-testid="btn-mode-charge" onClick={() => setActiveMode("charge")} className={`h-11 sm:h-9 px-3.5 text-sm font-medium rounded-lg transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${activeMode === "charge" ? "bg-[var(--paper)] text-[var(--ink)] shadow-xs" : "text-[var(--ink-muted)] hover:text-[var(--ink)]"}`}>
						<ArrowDownRight className="w-4 h-4 shrink-0" /><span>Списание / Зачёт (-)</span>
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-medium text-[var(--ink-muted)]">Счёт для операции:</span>
					<div className="grid grid-cols-2 gap-2">
						<button type="button" data-testid="btn-target-personal" onClick={() => setTargetWallet("personal")} className={`h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${targetWallet === "personal" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
							<Wallet className="w-4 h-4 shrink-0" /><span>Личный депозит</span>
						</button>
						<button type="button" data-testid="btn-target-family" onClick={() => setTargetWallet("family")} className={`h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border text-sm font-medium inline-flex items-center justify-center gap-2 cursor-pointer transition-all ${targetWallet === "family" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
							<Users className="w-4 h-4 shrink-0" /><span>Семейный счёт</span>
						</button>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<span className="text-xs font-medium text-[var(--ink-muted)]">Способ оплаты / канал:</span>
					<div className="grid grid-cols-3 gap-2">
						<button type="button" data-testid="btn-method-card" onClick={() => setPaymentMethod("card")} className={`h-11 sm:h-9 px-2.5 rounded-xl sm:rounded-lg border text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "card" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
							<CreditCard className="w-4 h-4 shrink-0" /><span>Карта</span>
						</button>
						<button type="button" data-testid="btn-method-cash" onClick={() => setPaymentMethod("cash")} className={`h-11 sm:h-9 px-2.5 rounded-xl sm:rounded-lg border text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "cash" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
							<Coins className="w-4 h-4 shrink-0" /><span>Наличные</span>
						</button>
						<button type="button" data-testid="btn-method-sbp" onClick={() => setPaymentMethod("sbp")} className={`h-11 sm:h-9 px-2.5 rounded-xl sm:rounded-lg border text-xs sm:text-sm font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer transition-all ${paymentMethod === "sbp" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] shadow-2xs" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"}`}>
							<QrCode className="w-4 h-4 shrink-0" /><span>СБП QR</span>
						</button>
					</div>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-xs font-medium text-[var(--ink-muted)]">{activeMode === "topup" ? "Быстрый выбор суммы пополнения:" : "Быстрый выбор суммы списания:"}</span>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{activeMode === "topup" ? PRESET_TOPUP_AMOUNTS.map((amt) => (
						<button key={amt} type="button" data-testid={`btn-quick-deposit-${amt}`} aria-busy={isSubmitting} onClick={() => handlePresetExecute(amt)} className="h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-sm font-mono tracking-tight font-medium tabular-nums inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
							<Plus className="w-4 h-4 text-[var(--primary)] shrink-0" /><span>{amt.toLocaleString("ru-RU")} ₽</span>
						</button>
					)) : (
						<>
							{PRESET_CHARGE_AMOUNTS.map((amt) => (
								<button key={amt} type="button" data-testid={`btn-quick-charge-${amt}`} aria-busy={isSubmitting} onClick={() => handlePresetExecute(amt)} className="h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)]/50 hover:bg-[var(--danger-soft)] text-[var(--danger)] text-sm font-mono tracking-tight font-medium tabular-nums inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs">
									<ArrowDownRight className="w-4 h-4 shrink-0" /><span>-{amt.toLocaleString("ru-RU")} ₽</span>
								</button>
							))}
							<button type="button" data-testid="btn-quick-charge-all" aria-busy={isSubmitting} onClick={() => handlePresetExecute(personalBalance)} className="h-11 sm:h-9 px-3 rounded-xl sm:rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)]/50 hover:bg-[var(--danger-soft)] text-[var(--danger)] text-xs font-medium inline-flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs">
								<span>Весь аванс ({personalBalance.toLocaleString("ru-RU")} ₽)</span>
							</button>
						</>
					)}
				</div>
			</div>

			<form onSubmit={handleSubmit} className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap pt-1">
				<div className="relative flex-1 min-w-[200px]">
					<input id={customInputId} type="text" inputMode="numeric" data-testid="input-custom-deposit-amount" value={customAmountStr} onChange={(e) => setCustomAmountStr(e.target.value)} placeholder="Произвольная сумма (например, 7 500)" className="w-full h-11 sm:h-9 px-3.5 sm:px-3 rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-sm font-mono font-medium placeholder:text-[var(--ink-muted)] focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)] transition-all" />
				</div>
				<button type="submit" data-testid="btn-submit-custom-deposit" aria-busy={isSubmitting} className="h-11 sm:h-9 px-4 rounded-xl sm:rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all cursor-pointer shadow-sm whitespace-nowrap shrink-0">
					<CheckCircle2 className="w-4 h-4 shrink-0" /><span>{activeMode === "topup" ? "Внести на счёт" : "Списать со счёта"}</span>
				</button>
			</form>
		</div>
	);
};
