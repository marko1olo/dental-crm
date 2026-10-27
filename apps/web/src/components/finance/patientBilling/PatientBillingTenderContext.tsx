import React from "react";
import { AlertTriangle, Calendar, CheckCircle2, Coins, Users, Wallet } from "lucide-react";
import type { PatientBillingPaymentMethod } from "../PatientBillingTypes";

export interface PatientBillingTenderContextProps {
	readonly selectedTender: PatientBillingPaymentMethod;
	readonly totalNetRub: number;
	readonly receivedCashRub: number;
	readonly onSetReceivedCashRub: (rub: number) => void;
	readonly cashChangeResult: {
		readonly changeRub: number;
		readonly isShortage: boolean;
		readonly shortageRub: number;
	};
	readonly primaryInputRef?: React.RefObject<HTMLInputElement | null> | undefined;
	readonly onInputEnterKeyDown?: ((e: React.KeyboardEvent<HTMLInputElement>) => void) | undefined;
	readonly installmentSchedule: {
		readonly stage1Rub: number;
		readonly stage2Rub: number;
		readonly stage3Rub: number;
		readonly stage4Rub: number;
	};
	readonly effectiveDeposit: number;
	readonly effectiveFamilyBalance: number;
}

export const PatientBillingTenderContext: React.FC<PatientBillingTenderContextProps> = ({
	selectedTender,
	totalNetRub,
	receivedCashRub,
	onSetReceivedCashRub,
	cashChangeResult,
	primaryInputRef,
	onInputEnterKeyDown,
	installmentSchedule,
	effectiveDeposit,
	effectiveFamilyBalance,
}) => {
	if (selectedTender === "cash") {
		return (
			<div className="pt-2 border-t border-[var(--line)]/60 space-y-2.5">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)]">
						<Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span>Расчет сдачи наличных (до копейки):</span>
					</div>
					{cashChangeResult.changeRub > 0 && (
						<div className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-extrabold text-xs flex items-center gap-1.5">
							<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
							<span>СДАЧА КЛИЕНТУ: {cashChangeResult.changeRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
						</div>
					)}
					{cashChangeResult.isShortage && (
						<div className="px-3 py-1 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-800 dark:text-rose-200 font-extrabold text-xs flex items-center gap-1.5">
							<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
							<span>Недобор: {cashChangeResult.shortageRub.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽</span>
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
					<div className="space-y-1">
						<label className="text-[11px] font-semibold text-[var(--muted)]">Получено от пациента наличными (₽):</label>
						<input
							ref={primaryInputRef}
							type="number"
							min={0}
							step="1"
							value={receivedCashRub || ""}
							onChange={(e) => onSetReceivedCashRub(parseFloat(e.target.value) || 0)}
							onKeyDown={onInputEnterKeyDown}
							placeholder={`${totalNetRub} ₽`}
							className="min-h-[44px] w-full px-3 py-1 text-sm font-bold font-mono bg-[var(--paper)] border border-[var(--border,#cbd5e1)] rounded-xl text-[var(--ink)] focus:border-emerald-500 outline-none"
						/>
					</div>

					<div className="space-y-1">
						<label className="text-[11px] font-semibold text-[var(--muted)]">Быстрый ввод внесенной суммы:</label>
						<div className="grid grid-cols-4 gap-1.5">
							<button type="button" onClick={() => onSetReceivedCashRub(totalNetRub)} className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 flex items-center justify-center">Без сдачи</button>
							<button type="button" onClick={() => onSetReceivedCashRub(1000)} className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center">1 000 ₽</button>
							<button type="button" onClick={() => onSetReceivedCashRub(2000)} className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center">2 000 ₽</button>
							<button type="button" onClick={() => onSetReceivedCashRub(5000)} className="min-h-[44px] rounded-xl text-xs font-bold bg-[var(--paper)] border border-[var(--border,#cbd5e1)] hover:border-emerald-500 text-[var(--ink)] cursor-pointer transition-all active:scale-95 font-mono flex items-center justify-center">5 000 ₽</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (selectedTender === "installment") {
		return (
			<div className="pt-2 border-t border-[var(--line)]/60 space-y-2">
				<div className="flex items-center justify-between text-xs font-bold text-amber-900 dark:text-amber-200">
					<span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-amber-600" /> График платежей (0% переплат):</span>
					<span className="font-mono text-emerald-700 dark:text-emerald-300">Первый взнос: {installmentSchedule.stage1Rub.toLocaleString("ru-RU")} ₽ (30%)</span>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
					<div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 space-y-0.5">
						<div className="font-bold text-[var(--ink)]">1-й взнос (Сегодня)</div>
						<div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{installmentSchedule.stage1Rub.toLocaleString("ru-RU")} ₽</div>
					</div>
					<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
						<div className="font-bold text-[var(--muted)]">2-й этап (30 дн.)</div>
						<div className="font-mono text-[var(--ink)] font-bold">{installmentSchedule.stage2Rub.toLocaleString("ru-RU")} ₽</div>
					</div>
					<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
						<div className="font-bold text-[var(--muted)]">3-й этап (60 дн.)</div>
						<div className="font-mono text-[var(--ink)] font-bold">{installmentSchedule.stage3Rub.toLocaleString("ru-RU")} ₽</div>
					</div>
					<div className="p-2 rounded-xl bg-[var(--paper)] border border-[var(--line)] space-y-0.5">
						<div className="font-bold text-[var(--muted)]">4-й этап (90 дн.)</div>
						<div className="font-mono text-[var(--ink)] font-bold">{installmentSchedule.stage4Rub.toLocaleString("ru-RU")} ₽</div>
					</div>
				</div>
			</div>
		);
	}

	if (selectedTender === "family") {
		return (
			<div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Users className="w-4 h-4 text-pink-600" />
					<span>Списание с общего семейного счета</span>
					{effectiveFamilyBalance > 0 && <span className="font-mono font-bold text-emerald-600">(Доступно: {effectiveFamilyBalance.toLocaleString("ru-RU")} ₽)</span>}
				</div>
				<span className="font-mono font-bold text-pink-700 dark:text-pink-300">Зачет семейного аванса</span>
			</div>
		);
	}

	if (selectedTender === "deposit") {
		return (
			<div className="pt-2 border-t border-[var(--line)]/60 flex items-center justify-between text-xs flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Wallet className="w-4 h-4 text-indigo-600" />
					<span>Списание с персонального депозита пациента</span>
					{effectiveDeposit > 0 && <span className="font-mono font-bold text-emerald-600">(Доступно: {effectiveDeposit.toLocaleString("ru-RU")} ₽)</span>}
				</div>
				<span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">Зачет аванса</span>
			</div>
		);
	}

	return null;
};
