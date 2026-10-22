import React from "react";
import { AlertTriangle, Banknote, CheckCircle2, CreditCard, QrCode, Wallet } from "lucide-react";
import type { CashDaySummary } from "../cashDaySummary";

interface CashDayTallyChannelsGridProps {
	readonly summary: CashDaySummary;
	readonly money: (val: number | null) => string;
	readonly differenceRub: number | null;
}

export function CashDayTallyChannelsGrid({
	summary,
	money,
	differenceRub,
}: CashDayTallyChannelsGridProps) {
	const cardSummary = summary.byMethod.find((m) => m.method === "card");
	const sbpSummary = summary.byMethod.find((m) => m.method === "online");
	const cardRub = cardSummary?.amountRub || 0;
	const cardCount = cardSummary?.count || 0;
	const sbpRub = sbpSummary?.amountRub || 0;
	const sbpCount = sbpSummary?.count || 0;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
			{/* Наличные в ящике */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
					<span className="font-bold flex items-center gap-1">
						<Banknote className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span>Наличные (Касса)</span>
					</span>
					<span className="font-mono">{summary.byMethod.find((m) => m.method === "cash")?.count || 0} оплат</span>
				</div>
				<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
					{money(summary.cashRub)}
				</div>
				<div className="text-xs">
					{differenceRub === null ? (
						<span className="text-[var(--muted,#64748b)]">Ожидает пересчета ящика</span>
					) : differenceRub === 0 ? (
						<span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
							<CheckCircle2 size={13} />
							<span>Сходится копейка в копейку</span>
						</span>
					) : differenceRub > 0 ? (
						<span className="text-teal-600 dark:text-teal-400 font-bold flex items-center gap-1">
							<AlertTriangle size={13} />
							<span>Излишек: +{money(differenceRub)}</span>
						</span>
					) : (
						<span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
							<AlertTriangle size={13} />
							<span>Недостача: −{money(-differenceRub)}</span>
						</span>
					)}
				</div>
			</div>

			{/* POS Эквайринг (Карты Сбербанк/МИР) */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
					<span className="font-bold flex items-center gap-1">
						<CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
						<span>POS Эквайринг</span>
					</span>
					<span className="font-mono">{cardCount} оплат</span>
				</div>
				<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
					{money(cardRub)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)]">
					Сверка терминала (Pilot-NT/Arcus2)
				</div>
			</div>

			{/* СБП QR (Плати QR / НСПК) */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
					<span className="font-bold flex items-center gap-1">
						<QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>СБП QR / Онлайн</span>
					</span>
					<span className="font-mono">{sbpCount} оплат</span>
				</div>
				<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
					{money(sbpRub)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)]">
					Реестр НСПК / СберPay QR
				</div>
			</div>

			{/* Зачет аванса / Семейный счет */}
			<div className="p-3.5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] flex flex-col justify-between space-y-2">
				<div className="flex items-center justify-between text-xs text-[var(--muted,#64748b)]">
					<span className="font-bold flex items-center gap-1">
						<Wallet className="w-4 h-4 text-amber-600 dark:text-amber-400" />
						<span>Семейный баланс</span>
					</span>
					<span className="font-mono">Аванс</span>
				</div>
				<div className="text-base sm:text-lg font-bold text-[var(--ink,#0f172a)] font-mono">
					{money(summary.familyWalletRub)}
				</div>
				<div className="text-xs text-[var(--muted,#64748b)]">
					Зачет аванса без повторного НДС
				</div>
			</div>
		</div>
	);
}
