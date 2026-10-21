import { formatRublesClean } from "./executiveAnalyticsTypes";

export interface MobilePaymentLegendProps {
	readonly cashPercent: number;
	readonly cashRub: number;
	readonly cashFormatted?: string | undefined;
	readonly cardDmsPercent: number;
	readonly cardDmsRub: number;
	readonly cardDmsFormatted?: string | undefined;
	readonly sbpPercent: number;
	readonly sbpRub: number;
	readonly sbpFormatted?: string | undefined;
	readonly depositPercent: number;
	readonly depositRub: number;
	readonly depositFormatted?: string | undefined;
}

export function MobilePaymentLegend({
	cashPercent,
	cashRub,
	cashFormatted,
	cardDmsPercent,
	cardDmsRub,
	cardDmsFormatted,
	sbpPercent,
	sbpRub,
	sbpFormatted,
	depositPercent,
	depositRub,
	depositFormatted,
}: MobilePaymentLegendProps) {
	return (
		<div className="exec-payments-legend grid grid-cols-2 sm:grid-cols-4 gap-2">
			<div className="exec-legend-col">
				<div className="exec-legend-dot-row">
					<span className="exec-dot dot-cash" />
					<span className="exec-legend-label">Наличные</span>
				</div>
				<div className="exec-legend-values">
					<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">
						{cashPercent}%
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						{cashFormatted || formatRublesClean(cashRub)}
					</span>
				</div>
			</div>

			<div className="exec-legend-col">
				<div className="exec-legend-dot-row">
					<span className="exec-dot dot-card" />
					<span className="exec-legend-label">Карта / ДМС</span>
				</div>
				<div className="exec-legend-values">
					<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">
						{cardDmsPercent}%
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						{cardDmsFormatted || formatRublesClean(cardDmsRub)}
					</span>
				</div>
			</div>

			<div className="exec-legend-col">
				<div className="exec-legend-dot-row">
					<span className="exec-dot dot-sbp" />
					<span className="exec-legend-label">СБП QR</span>
				</div>
				<div className="exec-legend-values">
					<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">
						{sbpPercent}%
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						{sbpFormatted || formatRublesClean(sbpRub)}
					</span>
				</div>
			</div>

			<div className="exec-legend-col">
				<div className="exec-legend-dot-row">
					<span className="exec-dot dot-deposit" />
					<span className="exec-legend-label">Депозит семьи</span>
				</div>
				<div className="exec-legend-values">
					<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">
						{depositPercent}%
					</span>
					<span className="text-[11px] text-[var(--muted)]">
						{depositFormatted || formatRublesClean(depositRub)}
					</span>
				</div>
			</div>
		</div>
	);
}
