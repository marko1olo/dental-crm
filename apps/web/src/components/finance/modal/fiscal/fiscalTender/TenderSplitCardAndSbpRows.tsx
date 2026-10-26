import React from "react";
import { CreditCard, QrCode } from "lucide-react";

export interface TenderSplitCardAndSbpRowsProps {
	readonly totalSumRub: number;
	readonly cardAmount: number;
	readonly setCardAmount: (v: number | ((prev: number) => number)) => void;
	readonly sbpAmount: number;
	readonly setSbpAmount: (v: number) => void;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitCardAndSbpRows: React.FC<TenderSplitCardAndSbpRowsProps> = ({
	totalSumRub,
	cardAmount,
	setCardAmount,
	sbpAmount,
	setSbpAmount,
	remainingRub,
	handleFillRemaining,
}) => {
	return (
		<>
			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<CreditCard size={16} className="text-blue-600 shrink-0" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">Карта</span>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={totalSumRub}
						value={cardAmount || ""}
						onChange={(e) => setCardAmount(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
					/>
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleFillRemaining("card")}
							className="primary-button h-8 px-2.5 text-xs rounded-lg cursor-pointer active:scale-95"
							data-testid="btn-fill-remaining-card"
						>
							+Остаток
						</button>
					)}
				</div>
			</div>

			<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<QrCode size={16} className="text-teal-600 shrink-0" />
					<span className="text-xs font-bold text-[var(--ink,#0f172a)]">СБП QR</span>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={totalSumRub}
						value={sbpAmount || ""}
						onChange={(e) => setSbpAmount(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
					/>
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleFillRemaining("sbp")}
							className="h-8 px-2.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-700 text-white cursor-pointer transition-all active:scale-95"
							data-testid="btn-fill-remaining-sbp"
						>
							+Остаток
						</button>
					)}
				</div>
			</div>
		</>
	);
};
