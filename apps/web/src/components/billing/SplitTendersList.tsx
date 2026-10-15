/**
 * apps/web/src/components/billing/SplitTendersList.tsx
 *
 * Interactive Multi-Tender Input List for SplitPaymentModal.
 */

import React from "react";
import {
	CreditCard,
	Banknote,
	QrCode,
	Wallet,
} from "lucide-react";
import {
	formatDisplayCurrency,
	type SplitBalancesResult,
	type CanonicalTenderType,
	CANONICAL_TENDER_FFD12_TAGS,
} from "@dental/shared";
import { SbpDynamicQrCard } from "./SbpDynamicQrCard.js";
import { showToast } from "../GlobalToast.js";

export type SplitAllocatedTenderTarget =
	| Extract<CanonicalTenderType, "card" | "cash" | "sbp" | "deposit" | "family_wallet">
	| "family";

export interface SplitTendersListProps {
	readonly splitResult: SplitBalancesResult;
	readonly cardRub: number;
	readonly setCardRub: (val: number) => void;
	readonly cashRub: number;
	readonly setCashRub: (val: number) => void;
	readonly sbpRub: number;
	readonly setSbpRub: (val: number) => void;
	readonly depositRub: number;
	readonly setDepositRub: (val: number) => void;
	readonly familyDepositRub: number;
	readonly setFamilyDepositRub: (val: number) => void;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly invoiceId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly patientName: string;
	readonly clinicLegalName: string;
	readonly handleAllocateRemainingTo: (tender: "card" | "cash" | "sbp" | "deposit" | "family") => void;
}

export const SplitTendersList: React.FC<SplitTendersListProps> = ({
	splitResult,
	cardRub,
	setCardRub,
	cashRub,
	setCashRub,
	sbpRub,
	setSbpRub,
	depositRub,
	setDepositRub,
	familyDepositRub,
	setFamilyDepositRub,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	invoiceId,
	visitId,
	patientName,
	clinicLegalName,
	handleAllocateRemainingTo,
}) => {
	return (
		<div className="space-y-3 pt-1" data-testid="split-tenders-list">
			{/* 1. Банковская карта POS (Тег 1081) */}
			<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-[140px]">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
						<CreditCard size={16} />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
							Карта POS
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">Безналичный расчет</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-1 justify-end">
					{splitResult.remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleAllocateRemainingTo("card")}
							className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
							data-testid="btn-fill-card-remaining"
						>
							+ остаток ({formatDisplayCurrency(splitResult.remainingRub)})
						</button>
					)}
					<input
						type="number"
						value={cardRub || ""}
						onChange={(e) => setCardRub(Number(e.target.value) || 0)}
						className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
						placeholder="0"
						data-testid="input-split-card"
					/>
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
				</div>
			</div>

			{/* 2. Наличные */}
			<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-[140px]">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
						<Banknote size={16} />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
							Наличные
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">Наличный расчет</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-1 justify-end">
					{splitResult.remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleAllocateRemainingTo("cash")}
							className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
							data-testid="btn-fill-cash-remaining"
						>
							+ остаток ({formatDisplayCurrency(splitResult.remainingRub)})
						</button>
					)}
					<input
						type="number"
						value={cashRub || ""}
						onChange={(e) => setCashRub(Number(e.target.value) || 0)}
						className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
						placeholder="0"
						data-testid="input-split-cash"
					/>
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
				</div>
			</div>

			{/* 3. QR СБП */}
			<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-[140px]">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
						<QrCode size={16} />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
							QR СБП
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">Система быстрых платежей</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-1 justify-end">
					{splitResult.remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleAllocateRemainingTo("sbp")}
							className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
							data-testid="btn-fill-sbp-remaining"
						>
							+ остаток ({formatDisplayCurrency(splitResult.remainingRub)})
						</button>
					)}
					<input
						type="number"
						value={sbpRub || ""}
						onChange={(e) => setSbpRub(Number(e.target.value) || 0)}
						className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
						placeholder="0"
						data-testid="input-split-sbp"
					/>
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
				</div>
			</div>

			{/* SBP Dynamic QR Preview if SBP > 0 */}
			{sbpRub > 0 && (
				<div className="pt-1" data-testid="split-sbp-qr-preview">
					<SbpDynamicQrCard
						sumRub={sbpRub}
						orderId={invoiceId || visitId}
						patientName={patientName}
						clinicLegalName={clinicLegalName}
						ttlSeconds={30}
						compactMode={true}
						onPaymentSuccess={() => {
							showToast(`СБП часть (${formatDisplayCurrency(sbpRub)}) успешно оплачена!`, "success");
						}}
					/>
				</div>
			)}

			{/* 4. Личный депозит */}
			<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-[140px]">
					<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
						<Wallet size={16} />
					</div>
					<div>
						<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
							Личный депозит
						</div>
						<div className="text-[10px] text-[var(--muted,#64748b)]">
							Доступно: {formatDisplayCurrency(patientDepositRub || 0)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2 flex-1 justify-end">
					{(patientDepositRub || 0) > 0 && (
						<button
							type="button"
							onClick={() =>
								setDepositRub(Math.min(patientDepositRub || 0, splitResult.remainingRub + depositRub))
							}
							className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline shrink-0"
							data-testid="btn-fill-deposit-max"
						>
							Макс
						</button>
					)}
					<input
						type="number"
						value={depositRub || ""}
						onChange={(e) => setDepositRub(Number(e.target.value) || 0)}
						className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
						placeholder="0"
						data-testid="input-split-deposit"
					/>
					<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
				</div>
			</div>

			{/* 5. Семейный баланс */}
			{(patientFamilyBalanceRub || 0) > 0 && (
				<div className="p-3 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between gap-3">
					<div className="flex items-center gap-2.5 min-w-[140px]">
						<div className="w-8 h-8 rounded-lg bg-teal-500/15 text-teal-600 flex items-center justify-center shrink-0">
							<Wallet size={16} />
						</div>
						<div>
							<div className="text-xs font-bold text-[var(--ink,#0f172a)] leading-tight">
								Семейный баланс
							</div>
							<div className="text-[10px] text-[var(--muted,#64748b)]">
								Доступно: {formatDisplayCurrency(patientFamilyBalanceRub || 0)}
							</div>
						</div>
					</div>

					<div className="flex items-center gap-2 flex-1 justify-end">
						<button
							type="button"
							onClick={() =>
								setFamilyDepositRub(
									Math.min(patientFamilyBalanceRub || 0, splitResult.remainingRub + familyDepositRub),
								)
							}
							className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
							data-testid="btn-fill-family-max"
						>
							Макс
						</button>
						<input
							type="number"
							value={familyDepositRub || ""}
							onChange={(e) => setFamilyDepositRub(Number(e.target.value) || 0)}
							className="w-28 sm:w-36 h-9 px-3 rounded-lg border border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] font-mono font-bold text-sm text-right text-[var(--ink,#0f172a)] focus:outline-none focus:border-teal-500"
							placeholder="0"
							data-testid="input-split-family"
						/>
						<span className="font-bold text-xs text-[var(--ink,#0f172a)]">₽</span>
					</div>
				</div>
			)}
		</div>
	);
};
