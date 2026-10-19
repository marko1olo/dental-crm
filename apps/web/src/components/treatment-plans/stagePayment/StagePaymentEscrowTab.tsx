/**
 * StagePaymentEscrowTab.tsx — Вкладка авансового депозита и расчетов по этапам (DENTE CRM).
 * Mandates 8e, 8n (honest clinical deposit without fake escrow locks), Mandate 8b (<= 120 lines).
 */

import { formatKopecksRu } from "@dental/shared";
import { Coins, Plus, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import type React from "react";
import type { PatientDepositWallet } from "./stagePaymentEngine.js";

export interface StagePaymentEscrowTabProps {
	readonly depositWallet: PatientDepositWallet;
	readonly topUpAmountRub: string;
	readonly onTopUpAmountChange: (value: string) => void;
	readonly onTopUpDeposit: () => void;
	readonly onAutoAllocateDeposit: () => void;
}

export const StagePaymentEscrowTab: React.FC<StagePaymentEscrowTabProps> = ({
	depositWallet, topUpAmountRub, onTopUpAmountChange, onTopUpDeposit, onAutoAllocateDeposit,
}) => {
	return (
		<div className="flex flex-col gap-5">
			{/* Deposit Balances Banner */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 shadow-xs">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span>Авансовый депозит пациента</span>
						<Wallet className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
						{formatKopecksRu(depositWallet.availableDepositKopecks)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1.5">
						Доступно для покрытия авансов и списания за выполненные процедуры.
					</p>
				</div>

				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 shadow-xs">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span>Общий баланс пациента</span>
						<Coins className="h-4 w-4 text-amber-500" />
					</div>
					<div className="text-2xl font-black text-[var(--ink,#0f172a)]">
						{formatKopecksRu(depositWallet.totalBalanceKopecks)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-1.5">
						Суммарный остаток авансовых денежных средств в клинике.
					</p>
				</div>
			</div>

			{/* Top-up & Stage Allocation Actions */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Deposit Top-Up Form */}
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 flex flex-col gap-3">
					<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center gap-2">
						<Plus className="h-4 w-4 text-[var(--teal,var(--brand-primary))]" />
						Внесение средств на депозит пациента
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Пополнение авансового депозита: наличные, банковская карта или СБП по QR-коду.
					</p>
					<div className="flex items-center gap-2 mt-auto">
						<div className="relative flex-1">
							<input
								type="number"
								value={topUpAmountRub}
								onChange={(e) => onTopUpAmountChange(e.target.value)}
								placeholder="Сумма в рублях..."
								className="w-full h-9 rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-3 text-xs font-semibold text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
							/>
							<span className="absolute right-3 top-2 text-xs text-[var(--muted,#64748b)] font-bold">₽</span>
						</div>
						<button type="button" onClick={onTopUpDeposit} className="stage-action-btn primary h-9 text-xs">
							Пополнить
						</button>
					</div>
				</div>

				{/* Deposit Stage Allocation */}
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-4 flex flex-col justify-between gap-3">
					<div>
						<h3 className="font-bold text-sm text-[var(--ink,#0f172a)] flex items-center gap-2">
							<Sparkles className="h-4 w-4 text-[var(--teal,var(--brand-primary))]" />
							Списание депозита в счет этапов
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] mt-1">
							Направляет свободный аванс на покрытие этапов лечения в порядке клинической очередности.
						</p>
					</div>
					<button
						type="button"
						onClick={onAutoAllocateDeposit}
						className="stage-action-btn primary w-full cursor-pointer"
						style={{ minHeight: "44px" }}
					>
						Распределить свободный депозит ({formatKopecksRu(depositWallet.availableDepositKopecks)})
					</button>
				</div>
			</div>

			{/* Clinical Advance Settlement Guarantee */}
			<div className="rounded-2xl border border-[var(--teal,var(--brand-primary))]/20 bg-[var(--teal-soft,var(--paper-soft))] p-3.5 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
				<ShieldCheck className="h-5 w-5 text-[var(--teal,var(--brand-primary))] shrink-0 mt-0.5" />
				<div>
					<h4 className="font-bold text-[var(--teal-dark,var(--teal))]">
						Авансовые расчеты за лечение (ГК РФ ст. 709, 711)
					</h4>
					<p className="text-[var(--muted,#64748b)] mt-0.5">
						Внесенный аванс списывается за фактически выполненные процедуры с печатью фискального кассового чека прихода.
					</p>
				</div>
			</div>
		</div>
	);
};

export default StagePaymentEscrowTab;
