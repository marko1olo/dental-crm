import React from "react";
import { Banknote, CreditCard, Layers, QrCode, Wallet } from "lucide-react";

export interface QueueSummaryMetrics {
	readonly count: number;
	readonly totalRub: number;
	readonly cashRub: number;
	readonly cardRub: number;
	readonly sbpRub: number;
	readonly advanceRub: number;
}

interface OfflineFiscalBatchSummaryBarProps {
	readonly queueSummary: QueueSummaryMetrics;
}

export function OfflineFiscalBatchSummaryBar({ queueSummary }: OfflineFiscalBatchSummaryBarProps) {
	return (
		<div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[var(--paper)] border-b border-[var(--glass-border)]">
			<div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)]">
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
					<Layers className="w-3.5 h-3.5 text-blue-500" />
					Всего в очереди
				</div>
				<div className="mt-1 text-lg font-bold">{queueSummary.count} чеков</div>
				<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
					{queueSummary.totalRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)]">
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
					<Banknote className="w-3.5 h-3.5 text-amber-500" />
					Наличные (1031)
				</div>
				<div className="mt-1 text-base font-bold text-amber-600 dark:text-amber-400">
					{queueSummary.cashRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)]">
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
					<CreditCard className="w-3.5 h-3.5 text-indigo-500" />
					Карты (1081)
				</div>
				<div className="mt-1 text-base font-bold text-indigo-600 dark:text-indigo-400">
					{queueSummary.cardRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)]">
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
					<QrCode className="w-3.5 h-3.5 text-teal-500" />
					СБП QR (1081)
				</div>
				<div className="mt-1 text-base font-bold text-teal-600 dark:text-teal-400">
					{queueSummary.sbpRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>

			<div className="p-3 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)]">
				<div className="text-xs text-[var(--muted)] flex items-center gap-1.5">
					<Wallet className="w-3.5 h-3.5 text-purple-500" />
					Зачет авансов (1215)
				</div>
				<div className="mt-1 text-base font-bold text-purple-600 dark:text-purple-400">
					{queueSummary.advanceRub.toLocaleString("ru-RU")} ₽
				</div>
			</div>
		</div>
	);
}
