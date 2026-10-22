import React from "react";
import { AlertCircle, Check, CheckCircle2 } from "lucide-react";
import type { DentalLabFinancialGateResult } from "../dentalLabFinancialGateEngine";
import { DentalLabFittingCollisionBanner } from "./DentalLabFittingCollisionBanner";

export interface DentalLabOrderModalBannersProps {
	readonly financialGateResult: DentalLabFinancialGateResult;
	readonly hasOverride: boolean;
	readonly onOverride: () => void;
	readonly fittingCollision?: { hasCollision: boolean; warningRu?: string | null | undefined } | null | undefined;
	readonly onAdjustStages?: (() => void) | undefined;
}

/**
 * Пассивные информационные индикаторы заказ-наряда ЗТЛ (Мандаты 8e, 8b: <= 120 строк).
 * Ноль блокирующих модалок. Врач сам решает примерять коронку. Кнопка всегда доступна.
 */
export function DentalLabOrderModalBanners({
	financialGateResult,
	hasOverride,
	onOverride,
	fittingCollision,
	onAdjustStages,
}: DentalLabOrderModalBannersProps): React.JSX.Element {
	const isPaid =
		financialGateResult.paidPercent >= 100 ||
		(financialGateResult.isGatePassed && financialGateResult.missingAdvanceRub <= 0);
	const missingRub = financialGateResult.missingAdvanceRub || 0;
	const missingFormatted = `${missingRub.toLocaleString("ru-RU")} ₽`;
	const debtLabel =
		financialGateResult.paidPercent === 0
			? `Не оплачен аванс: ${missingFormatted}`
			: `Не оплачен аванс (остаток: ${missingFormatted})`;
	const paymentLabel = isPaid ? "Оплачено 100%" : debtLabel;
	const isCleared = isPaid || hasOverride;

	return (
		<div className="space-y-2">
			<div
				className={`flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border shadow-2xs ${
					isCleared
						? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
						: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
				}`}
				data-testid="lab-order-clinical-autonomy-banner"
			>
				<div className="flex items-center gap-2 min-w-0">
					{isCleared ? (
						<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					) : (
						<AlertCircle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />
					)}
					<div className="flex flex-col">
						<span>{hasOverride ? "Наряд отправлен в лабораторию (отсрочка оплаты)" : paymentLabel}</span>
						{financialGateResult.isPlanExpiredNotice && (
							<span className="text-[11px] font-normal text-[var(--muted)]">
								· План &gt; 30 дней (не блокирует наряд)
							</span>
						)}
					</div>
				</div>

				{hasOverride ? (
					<span
						className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 font-semibold text-xs inline-flex items-center gap-1.5"
						data-testid="lab-override-active-badge"
					>
						<Check size={14} className="shrink-0" />
						<span>Наряд отправлен в лабораторию</span>
					</span>
				) : (
					!isPaid && (
						<button
							type="button"
							onClick={onOverride}
							className="min-h-[34px] px-3 py-1.5 rounded-lg border border-teal-600/40 bg-teal-500/15 hover:bg-teal-500/25 text-teal-900 dark:text-teal-100 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-[0.98]"
							data-testid="btn-lab-override-financial-gate"
							title="Отправить наряд в ЗТЛ — клиническое решение лечащего врача (Мандат 8e)"
						>
							<Check size={14} className="shrink-0" />
							<span>Отправить в лабораторию</span>
						</button>
					)
				)}
			</div>

			{fittingCollision && (
				<DentalLabFittingCollisionBanner
					fittingCollision={fittingCollision}
					onAdjustStages={onAdjustStages}
				/>
			)}
		</div>
	);
}
