import React from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { DentalLabFinancialGateResult } from "../dentalLabFinancialGateEngine";

export interface DentalLabOrderModalBannersProps {
	financialGateResult: DentalLabFinancialGateResult;
	hasOverride: boolean;
	onOverride: () => void;
	fittingCollision?:
		| { hasCollision: boolean; warningRu?: string | null | undefined }
		| null
		| undefined;
	onAdjustStages?: (() => void) | undefined;
}

/**
 * Пассивные информационные индикаторы заказ-наряда ЗТЛ (Мандаты 8e, 8b: <= 120 строк).
 * Ноль блокирующих модалок. Врач сам решает примерять коронку.
 */
export function DentalLabOrderModalBanners({
	financialGateResult,
	hasOverride: _hasOverride,
	onOverride,
	fittingCollision,
	onAdjustStages,
}: DentalLabOrderModalBannersProps) {
	const isPaid =
		financialGateResult.paidPercent >= 100 ||
		(financialGateResult.isGatePassed && financialGateResult.missingAdvanceRub <= 0);
	const missingRub = financialGateResult.missingAdvanceRub || 0;
	const missingFormatted = `${missingRub.toLocaleString("ru-RU")} ₽`;
	const debtLabel =
		financialGateResult.paidPercent === 0
			? `Не внесен аванс: ${missingFormatted}`
			: `Долг за работу: ${missingFormatted}`;
	const paymentLabel = isPaid ? "Оплачено 100%" : debtLabel;

	return (
		<div className="space-y-2">
			{/* Ненавязчивый пассивный индикатор статуса оплаты (Мандат 8e) */}
			<div
				className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
					isPaid
						? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
						: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
				}`}
				data-testid="lab-order-clinical-autonomy-banner"
			>
				{isPaid ? (
					<CheckCircle2
						size={14}
						className="text-emerald-600 dark:text-emerald-400 shrink-0"
					/>
				) : (
					<AlertCircle
						size={14}
						className="text-amber-600 dark:text-amber-400 shrink-0"
					/>
				)}
				<span>{paymentLabel}</span>
				{financialGateResult.isPlanExpiredNotice && (
					<span className="text-[11px] font-normal text-[var(--muted)]">
						· План &gt; 30 дней (не блокирует)
					</span>
				)}
				<button
					type="button"
					onClick={onOverride}
					className="sr-only"
					data-testid="btn-lab-override-financial-gate"
					tabIndex={-1}
				>
					Согласовать
				</button>
			</div>

			{fittingCollision?.hasCollision && (
				<div
					className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
					data-testid="lab-order-fitting-collision-banner"
				>
					<div className="flex items-start gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--ink)]">
								Срок примерки раньше готовности ЗТЛ
							</div>
							<div className="text-[11px] text-[var(--muted)]">
								{fittingCollision.warningRu}
							</div>
						</div>
					</div>
					{onAdjustStages && (
						<button
							type="button"
							onClick={onAdjustStages}
							className="px-2.5 py-1 rounded-lg bg-[var(--paper-soft)] hover:bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] text-xs font-medium flex items-center gap-1 shadow-2xs transition cursor-pointer shrink-0"
							data-testid="btn-lab-inspect-collision-stages"
						>
							<Clock className="w-3.5 h-3.5" />
							<span>Сроки</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
