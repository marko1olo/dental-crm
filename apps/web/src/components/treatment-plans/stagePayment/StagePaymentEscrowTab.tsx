/**
 * StagePaymentEscrowTab.tsx — Вкладка депозита и эскроу-счетов (DENTE CRM).
 *
 * Содержит:
 * 1. Карточки балансов (Свободный остаток депозита, Заблокировано в эскроу, Общий баланс).
 * 2. Форму пополнения депозита пациента.
 * 3. Кнопку каскадного авто-распределения свободного депозита по этапам лечения (Мандат 8e).
 * 4. Блок правовых гарантий сохранности эскроу (ст. 711 ГК РФ).
 */

import React from "react";
import {
	Coins,
	Lock,
	Plus,
	ShieldCheck,
	Sparkles,
	Wallet,
} from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import type { PatientDepositWallet } from "./stagePaymentEngine.js";

export interface StagePaymentEscrowTabProps {
	readonly depositWallet: PatientDepositWallet;
	readonly topUpAmountRub: string;
	readonly onTopUpAmountChange: (value: string) => void;
	readonly onTopUpDeposit: () => void;
	readonly onAutoAllocateDeposit: () => void;
}

export const StagePaymentEscrowTab: React.FC<StagePaymentEscrowTabProps> = ({
	depositWallet,
	topUpAmountRub,
	onTopUpAmountChange,
	onTopUpDeposit,
	onAutoAllocateDeposit,
}) => {
	return (
		<div className="flex flex-col gap-6">
			{/* Deposit Balances Banner */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 shadow-sm">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span>Свободный остаток депозита</span>
						<Wallet className="h-4 w-4 text-emerald-500" />
					</div>
					<div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
						{formatKopecksRu(depositWallet.availableDepositKopecks)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-2">
						Доступно для покрытия авансов и окончательных расчетов.
					</p>
				</div>

				<div className="rounded-2xl border border-[var(--teal,var(--brand-primary))]/30 bg-[var(--teal-soft,var(--paper-soft))] p-5 shadow-sm">
					<div className="flex items-center justify-between text-xs text-[var(--teal-dark,var(--teal))] mb-1">
						<span>Зарезервировано в эскроу</span>
						<Lock className="h-4 w-4 text-[var(--teal,var(--brand-primary))]" />
					</div>
					<div className="text-2xl font-black text-[var(--teal,var(--brand-primary))]">
						{formatKopecksRu(depositWallet.lockedEscrowKopecks)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-2">
						Средства зарезервированы под активные этапы до подписания акта.
					</p>
				</div>

				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 shadow-sm">
					<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)] mb-1">
						<span>Общий баланс пациента</span>
						<Coins className="h-4 w-4 text-amber-500" />
					</div>
					<div className="text-2xl font-black text-[var(--ink,#0f172a)]">
						{formatKopecksRu(depositWallet.totalBalanceKopecks)}
					</div>
					<p className="text-xs text-[var(--muted,#64748b)] mt-2">
						Суммарные денежные средства пациента в клинике.
					</p>
				</div>
			</div>

			{/* Top-up & Waterfall Allocation Actions */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Deposit Top-Up Form */}
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col gap-4">
					<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
						<Plus className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
						Внесение средств на депозит пациента
					</h3>
					<p className="text-xs text-[var(--muted,#64748b)]">
						Пациент может внести предоплату на свой личный депозитный счет наличными, картой или через СБП.
					</p>
					<div className="flex items-center gap-3">
						<div className="relative flex-1">
							<input
								type="number"
								value={topUpAmountRub}
								onChange={(e) => onTopUpAmountChange(e.target.value)}
								placeholder="Сумма в рублях..."
								className="w-full rounded-xl border border-[var(--border,#cbd5e1)] bg-transparent px-4 py-2.5 text-sm font-semibold text-[var(--ink,#0f172a)] focus:border-[var(--teal,var(--brand-primary))] focus:outline-none"
							/>
							<span className="absolute right-3.5 top-2.5 text-xs text-[var(--muted,#64748b)] font-bold">
								₽
							</span>
						</div>
						<button
							type="button"
							onClick={onTopUpDeposit}
							className="stage-action-btn primary"
						>
							Пополнить
						</button>
					</div>
				</div>

				{/* Waterfall Allocation */}
				<div className="rounded-2xl border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,#ffffff)] p-5 flex flex-col justify-between gap-4">
					<div>
						<h3 className="font-bold text-base text-[var(--ink,#0f172a)] flex items-center gap-2">
							<Sparkles className="h-5 w-5 text-[var(--teal,var(--brand-primary))]" />
							Авто-распределение депозита по этапам
						</h3>
						<p className="text-xs text-[var(--muted,#64748b)] mt-1">
							Автоматически направляет свободный остаток на покрытие обязательных авансов в порядке очередности (Терапия → Хирургия → Ортопедия).
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

			{/* Legal Escrow Protection Guarantee */}
			<div className="rounded-2xl border border-[var(--teal,var(--brand-primary))]/20 bg-[var(--teal-soft,var(--paper-soft))] p-4 text-xs text-[var(--ink,#0f172a)] flex items-start gap-3">
				<ShieldCheck className="h-5 w-5 text-[var(--teal,var(--brand-primary))] shrink-0 mt-0.5" />
				<div>
					<h4 className="font-bold text-[var(--teal-dark,var(--teal))]">
						Гарантия сохранности эскроу-депозита (ГК РФ ст. 711)
					</h4>
					<p className="text-[var(--muted,#64748b)] mt-1">
						Все внесенные пациентом авансовые средства блокируются на целевом эскроу-счете этапа и признаются выручкой клиники исключительно после фактического оказания медицинской услуги и двустороннего подписания Акта сдачи-приемки.
					</p>
				</div>
			</div>
		</div>
	);
};

export default StagePaymentEscrowTab;
