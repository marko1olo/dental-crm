import React from "react";
import { Gift } from "lucide-react";

export interface TenderSplitCertificateRowProps {
	readonly totalSumRub: number;
	readonly certificateAmount: number;
	readonly setCertificateAmount: (v: number) => void;
	readonly remainingRub: number;
	readonly handleFillRemaining: (t: "card" | "cash" | "sbp" | "certificate" | "insurance") => void;
}

export const TenderSplitCertificateRow: React.FC<TenderSplitCertificateRowProps> = ({
	totalSumRub,
	certificateAmount,
	setCertificateAmount,
	remainingRub,
	handleFillRemaining,
}) => {
	return (
		<div className="p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--border,#cbd5e1)] space-y-2" data-testid="split-certificate-row">
			<div className="flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5">
					<Gift size={16} className="text-amber-600 shrink-0" />
					<div>
						<span className="text-xs font-bold block text-[var(--ink,#0f172a)]">Подарочный сертификат</span>
						<span className="text-[11px] text-[var(--muted,#64748b)]">Зачет аванса</span>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<input
						type="number"
						min={0}
						max={totalSumRub}
						value={certificateAmount || ""}
						onChange={(e) => setCertificateAmount(Math.max(0, Number(e.target.value) || 0))}
						placeholder="0"
						className="h-8 w-28 px-2.5 text-xs font-mono font-bold rounded-lg border border-[var(--border,#cbd5e1)] bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] text-right"
						data-testid="input-certificate-amount"
					/>
					{remainingRub > 0 && (
						<button
							type="button"
							onClick={() => handleFillRemaining("certificate")}
							className="h-8 px-2.5 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white cursor-pointer transition-all active:scale-95"
							data-testid="btn-fill-remaining-cert"
						>
							+Остаток
						</button>
					)}
				</div>
			</div>

			<div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border,#cbd5e1)]">
				<span className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Номиналы:</span>
				{[3000, 5000, 10000].map((nom) => (
					<button
						key={nom}
						type="button"
						onClick={() => setCertificateAmount(Math.min(totalSumRub, (certificateAmount || 0) + nom))}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-6 px-2 rounded-md text-[11px] font-bold bg-[var(--paper-strong,var(--paper,#ffffff))] border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition-all inline-flex items-center justify-center"
						data-testid={`btn-cert-nominal-${nom}`}
					>
						+{nom.toLocaleString("ru-RU")} ₽
					</button>
				))}
				{certificateAmount > 0 && (
					<button
						type="button"
						onClick={() => setCertificateAmount(0)}
						className="min-h-[44px] sm:min-h-0 sm:h-6 px-2 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 cursor-pointer ml-auto inline-flex items-center justify-center"
					>
						Сброс
					</button>
				)}
			</div>
		</div>
	);
};
