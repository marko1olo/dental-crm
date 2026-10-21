import React from "react";
import { Wallet } from "lucide-react";
import { formatRublesClean } from "./executiveAnalyticsTypes";

interface PaymentBreakdownData {
	readonly cashRub: number;
	readonly cashPercent: number;
	readonly cashFormatted?: string | undefined;
	readonly cardDmsRub: number;
	readonly cardDmsPercent: number;
	readonly cardDmsFormatted?: string | undefined;
	readonly sbpRub: number;
	readonly sbpPercent: number;
	readonly sbpFormatted?: string | undefined;
	readonly depositRub?: number | undefined;
	readonly depositPercent?: number | undefined;
	readonly depositFormatted?: string | undefined;
	readonly totalRub: number;
}

interface MobilePaymentBreakdownProps {
	readonly pb: PaymentBreakdownData;
	readonly totalRevenueFormatted: string;
}

export function MobilePaymentBreakdown({
	pb,
	totalRevenueFormatted,
}: MobilePaymentBreakdownProps) {
	const depPercent = pb.depositPercent ?? 0;
	const depRub = pb.depositRub ?? 0;
	const hasPayments = pb.totalRub > 0;

	return (
		<div className="exec-payments-breakdown-card" data-testid="tile-payment-methods">
			<div className="exec-payments-header">
				<div className="flex items-center gap-1.5 font-semibold text-[13px] text-[var(--ink)]">
					<Wallet size={15} className="text-[var(--teal)]" aria-hidden="true" />
					<span>Доля оплат по 4 каналам (Мандат 8e/8n)</span>
				</div>
				<span className="text-[12px] text-[var(--muted)] font-mono">
					Всего: {totalRevenueFormatted}
				</span>
			</div>

			{hasPayments ? (
				<>
					<div className="exec-payments-bar-track" role="meter" aria-label="Соотношение способов оплат">
						{pb.cashPercent > 0 && (
							<div className="exec-payments-segment segment-cash" style={{ width: `${pb.cashPercent}%` }} title={`Касса наличные: ${pb.cashPercent}%`} />
						)}
						{pb.cardDmsPercent > 0 && (
							<div className="exec-payments-segment segment-card" style={{ width: `${pb.cardDmsPercent}%` }} title={`Безнал и ДМС: ${pb.cardDmsPercent}%`} />
						)}
						{pb.sbpPercent > 0 && (
							<div className="exec-payments-segment segment-sbp" style={{ width: `${pb.sbpPercent}%` }} title={`СБП по QR: ${pb.sbpPercent}%`} />
						)}
						{depPercent > 0 && (
							<div className="exec-payments-segment segment-deposit" style={{ width: `${depPercent}%` }} title={`Депозиты семьи: ${depPercent}%`} />
						)}
					</div>

					<div className="exec-payments-legend grid grid-cols-2 sm:grid-cols-4 gap-2">
						<div className="exec-legend-col">
							<div className="exec-legend-dot-row">
								<span className="exec-dot dot-cash" />
								<span className="exec-legend-label">Наличные</span>
							</div>
							<div className="exec-legend-values">
								<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.cashPercent}%</span>
								<span className="text-[11px] text-[var(--muted)]">{pb.cashFormatted || formatRublesClean(pb.cashRub)}</span>
							</div>
						</div>

						<div className="exec-legend-col">
							<div className="exec-legend-dot-row">
								<span className="exec-dot dot-card" />
								<span className="exec-legend-label">Карта / ДМС</span>
							</div>
							<div className="exec-legend-values">
								<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.cardDmsPercent}%</span>
								<span className="text-[11px] text-[var(--muted)]">{pb.cardDmsFormatted || formatRublesClean(pb.cardDmsRub)}</span>
							</div>
						</div>

						<div className="exec-legend-col">
							<div className="exec-legend-dot-row">
								<span className="exec-dot dot-sbp" />
								<span className="exec-legend-label">СБП QR</span>
							</div>
							<div className="exec-legend-values">
								<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{pb.sbpPercent}%</span>
								<span className="text-[11px] text-[var(--muted)]">{pb.sbpFormatted || formatRublesClean(pb.sbpRub)}</span>
							</div>
						</div>

						<div className="exec-legend-col">
							<div className="exec-legend-dot-row">
								<span className="exec-dot dot-deposit" />
								<span className="exec-legend-label">Депозит семьи</span>
							</div>
							<div className="exec-legend-values">
								<span className="font-semibold text-[13px] font-mono text-[var(--ink)]">{depPercent}%</span>
								<span className="text-[11px] text-[var(--muted)]">{pb.depositFormatted || formatRublesClean(depRub)}</span>
							</div>
						</div>
					</div>
				</>
			) : (
				<div className="text-[12px] text-[var(--muted)] py-3 text-center">
					Оплат за выбранный период пока не поступало
				</div>
			)}
		</div>
	);
}
