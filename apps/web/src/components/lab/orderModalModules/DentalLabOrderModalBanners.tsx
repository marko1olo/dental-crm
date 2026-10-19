import React from "react";
import { AlertTriangle, CheckCircle2, ShieldCheck, Sparkles, Clock } from "lucide-react";
import type { DentalLabFinancialGateResult } from "../dentalLabFinancialGateEngine";

export interface DentalLabOrderModalBannersProps {
	financialGateResult: DentalLabFinancialGateResult;
	hasOverride: boolean;
	onOverride: () => void;
	fittingCollision?: { hasCollision: boolean; warningRu?: string | null | undefined } | null | undefined;
	onAdjustStages?: (() => void) | undefined;
}

export function DentalLabOrderModalBanners({
	financialGateResult,
	hasOverride,
	onOverride,
	fittingCollision,
	onAdjustStages,
}: DentalLabOrderModalBannersProps) {
	return (
		<div className="space-y-3">
			{!financialGateResult.isGatePassed && !hasOverride && (
				<div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" data-testid="lab-order-clinical-autonomy-banner">
					<div className="flex items-start gap-2.5 min-w-0">
						<Sparkles size={18} className="text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--ink)]">Контроль оплаты изделия: внесено {financialGateResult.paidPercent}% (порог 50%)</div>
							<div className="text-[11px] text-[var(--muted)] mt-0.5">Врач вправе согласовать наряд без блокировки (Автономия врача).</div>
							{financialGateResult.isPlanExpiredNotice && (
								<div className="text-[11px] text-teal-700 dark:text-teal-300 font-bold mt-1 flex items-center gap-1">
									<CheckCircle2 size={12} className="shrink-0" /><span>{financialGateResult.isPlanExpiredNotice}</span>
								</div>
							)}
						</div>
					</div>
					<button type="button" onClick={onOverride} className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" data-testid="btn-lab-override-financial-gate">
						<ShieldCheck size={14} /><span>Согласовать наряд (Автономия врача)</span>
					</button>
				</div>
			)}

			{(financialGateResult.isGatePassed || hasOverride) && financialGateResult.isPlanExpiredNotice && (
				<div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center gap-2 text-xs text-teal-800 dark:text-teal-200" data-testid="lab-order-plan-expired-soft-notice">
					<CheckCircle2 size={16} className="text-teal-600 shrink-0" />
					<span>{financialGateResult.isPlanExpiredNotice} (наряд не блокируется)</span>
				</div>
			)}

			{fittingCollision?.hasCollision && (
				<div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs" data-testid="lab-order-fitting-collision-banner">
					<div className="flex items-start gap-2.5 min-w-0">
						<AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
						<div>
							<div className="font-bold text-[var(--ink)]">Внимание: визит на примерку назначен раньше срока готовности лаборатории!</div>
							<div className="text-[11px] text-[var(--muted)] mt-0.5">{fittingCollision.warningRu}</div>
						</div>
					</div>
					{onAdjustStages && (
						<button type="button" onClick={onAdjustStages} className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" data-testid="btn-lab-inspect-collision-stages">
							<Clock className="w-3.5 h-3.5" /><span>Скорректировать сроки</span>
						</button>
					)}
				</div>
			)}
		</div>
	);
}
