import React from "react";
import { ShieldCheck } from "lucide-react";
import type { OfflineFiscalBatchResult } from "@dental/shared";
import type { QueueSummaryMetrics } from "./OfflineFiscalBatchSummaryBar";

interface OfflineFiscalBatchReconciliationTabProps {
	readonly batchResult: OfflineFiscalBatchResult | null;
	readonly queueSummary: QueueSummaryMetrics;
}

export function OfflineFiscalBatchReconciliationTab({
	batchResult,
	queueSummary,
}: OfflineFiscalBatchReconciliationTabProps) {
	const fiscalCardRub = batchResult ? batchResult.reconciliation.fiscalCardRub : queueSummary.cardRub;
	const fiscalSbpRub = batchResult ? batchResult.reconciliation.fiscalSbpRub : queueSummary.sbpRub;
	const fiscalElectronicRub = batchResult ? batchResult.reconciliation.fiscalElectronicRub : queueSummary.cardRub + queueSummary.sbpRub;
	const bankTotalRub = batchResult ? batchResult.reconciliation.bankTotalRub : queueSummary.cardRub + queueSummary.sbpRub;
	const feeRub = bankTotalRub * 0.015;

	return (
		<div className="space-y-4">
			<div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
				<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
					<ShieldCheck className="w-5 h-5" />
					Сверка безналичной выручки кассы с банковским эквайрингом и СБП
				</div>
				<p className="text-xs text-[var(--muted)]">
					Автоматическое сопоставление сумм терминалов эквайринга с зарегистрированными в ОФД фискальными документами.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] space-y-2 text-xs">
					<div className="font-bold text-sm text-[var(--ink)] mb-2">Данные онлайн-кассы</div>
					<div className="flex justify-between py-1 border-b border-[var(--glass-border)]">
						<span className="text-[var(--muted)]">Банковские карты:</span>
						<span className="font-mono font-bold">{fiscalCardRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between py-1 border-b border-[var(--glass-border)]">
						<span className="text-[var(--muted)]">СБП QR:</span>
						<span className="font-mono font-bold">{fiscalSbpRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between py-1 font-bold text-emerald-600 dark:text-emerald-400">
						<span>Всего безналичных:</span>
						<span className="font-mono">{fiscalElectronicRub.toLocaleString("ru-RU")} ₽</span>
					</div>
				</div>

				<div className="p-4 rounded-lg border border-[var(--glass-border)] bg-[var(--paper-strong)] space-y-2 text-xs">
					<div className="font-bold text-sm text-[var(--ink)] mb-2">Данные банковской выписки</div>
					<div className="flex justify-between py-1 border-b border-[var(--glass-border)]">
						<span className="text-[var(--muted)]">Поступления по выписке:</span>
						<span className="font-mono font-bold">{bankTotalRub.toLocaleString("ru-RU")} ₽</span>
					</div>
					<div className="flex justify-between py-1 border-b border-[var(--glass-border)]">
						<span className="text-[var(--muted)]">Комиссия эквайринга (~1.5%):</span>
						<span className="font-mono text-[var(--muted)]">{feeRub.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽</span>
					</div>
					<div className="flex justify-between py-1 font-bold text-emerald-600 dark:text-emerald-400">
						<span>Расхождение:</span>
						<span className="font-mono">
							{batchResult ? `${batchResult.reconciliation.discrepancyRub.toLocaleString("ru-RU")} ₽ (${batchResult.reconciliation.status === "reconciled_exact" ? "100% сверка" : "расхождение"})` : "0.00 ₽ (100% сверка)"}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
