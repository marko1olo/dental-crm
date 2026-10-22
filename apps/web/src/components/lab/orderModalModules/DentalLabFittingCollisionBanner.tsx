import React from "react";
import { AlertTriangle, Clock } from "lucide-react";

export interface DentalLabFittingCollisionBannerProps {
	readonly fittingCollision: { hasCollision: boolean; warningRu?: string | null | undefined };
	readonly onAdjustStages?: (() => void) | undefined;
}

export function DentalLabFittingCollisionBanner({
	fittingCollision,
	onAdjustStages,
}: DentalLabFittingCollisionBannerProps): React.JSX.Element | null {
	if (!fittingCollision?.hasCollision) return null;

	return (
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
	);
}
