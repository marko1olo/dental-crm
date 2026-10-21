import { Wallet } from "lucide-react";
import { MobilePaymentLegend } from "./MobilePaymentLegend";

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
		<div
			className="exec-payments-breakdown-card"
			data-testid="tile-payment-methods"
		>
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
					<div
						className="exec-payments-bar-track"
						title="Соотношение способов оплат"
					>
						{pb.cashPercent > 0 && (
							<div
								className="exec-payments-segment segment-cash"
								style={{ width: `${pb.cashPercent}%` }}
								title={`Касса наличные: ${pb.cashPercent}%`}
							/>
						)}
						{pb.cardDmsPercent > 0 && (
							<div
								className="exec-payments-segment segment-card"
								style={{ width: `${pb.cardDmsPercent}%` }}
								title={`Безнал и ДМС: ${pb.cardDmsPercent}%`}
							/>
						)}
						{pb.sbpPercent > 0 && (
							<div
								className="exec-payments-segment segment-sbp"
								style={{ width: `${pb.sbpPercent}%` }}
								title={`СБП по QR: ${pb.sbpPercent}%`}
							/>
						)}
						{depPercent > 0 && (
							<div
								className="exec-payments-segment segment-deposit"
								style={{ width: `${depPercent}%` }}
								title={`Депозиты семьи: ${depPercent}%`}
							/>
						)}
					</div>

					<MobilePaymentLegend
						cashPercent={pb.cashPercent}
						cashRub={pb.cashRub}
						cashFormatted={pb.cashFormatted}
						cardDmsPercent={pb.cardDmsPercent}
						cardDmsRub={pb.cardDmsRub}
						cardDmsFormatted={pb.cardDmsFormatted}
						sbpPercent={pb.sbpPercent}
						sbpRub={pb.sbpRub}
						sbpFormatted={pb.sbpFormatted}
						depositPercent={depPercent}
						depositRub={depRub}
						depositFormatted={pb.depositFormatted}
					/>
				</>
			) : (
				<div className="text-[12px] text-[var(--muted)] py-3 text-center">
					Оплат за выбранный период пока не поступало
				</div>
			)}
		</div>
	);
}
