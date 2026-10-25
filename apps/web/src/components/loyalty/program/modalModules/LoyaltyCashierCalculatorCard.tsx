import React from "react";
import { Coins, Zap } from "lucide-react";

export interface LoyaltyCashierCalculatorCardProps {
	readonly invoiceAmountRub: number;
	readonly onInvoiceAmountChange: (val: number) => void;
	readonly requestedPointsRub: number;
	readonly onRequestedPointsChange: (val: number) => void;
	readonly maxAllowedPointsRub: number;
	readonly remainingPayableRub: number;
	readonly onOneClickRedeem: () => void;
	readonly onApplyQuickPoints: (pts: number) => void;
	readonly onApplyMaxPoints: () => void;
	readonly isDoctorOverride: boolean;
	readonly onDoctorOverrideChange: (val: boolean) => void;
	readonly onExecuteRedemption: () => void;
}

export const LoyaltyCashierCalculatorCard: React.FC<LoyaltyCashierCalculatorCardProps> = ({
	invoiceAmountRub,
	onInvoiceAmountChange,
	requestedPointsRub,
	onRequestedPointsChange,
	maxAllowedPointsRub,
	remainingPayableRub,
	onOneClickRedeem,
	onApplyQuickPoints,
	onApplyMaxPoints,
	isDoctorOverride,
	onDoctorOverrideChange,
}) => {
	return (
		<div className="loyalty-cashier-card" data-testid="loyalty-cashier-calculator">
			<div className="loyalty-section-title">
				<Coins size={18} />
				<span>Калькулятор списания бонусов в чек</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
						Сумма счета к оплате (₽)
					</label>
					<input
						type="number"
						min="0"
						value={invoiceAmountRub || ""}
						onChange={(e) => onInvoiceAmountChange(Math.max(0, Number(e.target.value)))}
						placeholder="0.00"
						className="dente-input w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono font-bold"
					/>
				</div>
				<div>
					<label className="text-xs font-semibold text-[var(--muted)] mb-1 block">
						Бонусов к списанию (₽)
					</label>
					<input
						type="number"
						min="0"
						max={maxAllowedPointsRub}
						value={requestedPointsRub || ""}
						onChange={(e) => onRequestedPointsChange(Math.max(0, Number(e.target.value)))}
						placeholder="0"
						className="dente-input w-full h-9 px-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-mono font-bold"
					/>
				</div>
			</div>

			<div className="loyalty-quick-actions-row">
				<button type="button" onClick={() => onApplyQuickPoints(500)} className="loyalty-quick-btn">
					500 ₽
				</button>
				<button type="button" onClick={() => onApplyQuickPoints(1000)} className="loyalty-quick-btn">
					1 000 ₽
				</button>
				<button type="button" onClick={onApplyMaxPoints} className="loyalty-quick-btn max-btn">
					<Zap size={14} />
					Макс. ({maxAllowedPointsRub.toLocaleString("ru-RU")} ₽)
				</button>
				<button
					type="button"
					onClick={onOneClickRedeem}
					className="loyalty-quick-btn !bg-[var(--teal)] !text-white !border-[var(--teal)]"
					data-testid="loyalty-one-click-redeem-btn"
				>
					В 1 клик в чек
				</button>
			</div>

			<div className="flex items-center justify-between pt-2 border-t border-[var(--line)] text-xs">
				<label className="flex items-center gap-2 cursor-pointer select-none text-[var(--muted)]">
					<input
						type="checkbox"
						checked={isDoctorOverride}
						onChange={(e) => onDoctorOverrideChange(e.target.checked)}
						className="rounded border-[var(--line)]"
					/>
					<span>Привилегия врача (до 100% покрытия)</span>
				</label>
				<span className="font-mono font-bold text-[var(--ink)]">
					К доплате: {remainingPayableRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</div>
	);
};
