import React from "react";
import { Percent, Sparkles } from "lucide-react";

export interface WizardSummaryFooterProps {
	readonly totalRub: number;
	readonly doctorDiscountPercent: number;
	readonly onSetDoctorDiscountPercent: (val: number) => void;
	readonly isSubmitting: boolean;
	readonly onSubmit: () => void;
}

export const WizardSummaryFooter: React.FC<WizardSummaryFooterProps> = ({
	totalRub,
	doctorDiscountPercent,
	onSetDoctorDiscountPercent,
	isSubmitting,
	onSubmit,
}) => {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-t border-[var(--line)] bg-[var(--paper-strong)]">
			<div className="flex items-center gap-3">
				<div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
					<Percent size={14} className="text-amber-500" />
					<span>Скидка врача:</span>
					<input
						type="number"
						min={0}
						max={100}
						value={doctorDiscountPercent}
						onChange={(e) => onSetDoctorDiscountPercent(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
						className="w-14 h-7 px-2 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-bold text-[var(--ink)] text-center font-mono"
						data-testid="wizard-doctor-discount-input"
					/>
					<div className="inline-flex gap-1 ml-1">
						{[0, 5, 10, 15].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => onSetDoctorDiscountPercent(pct)}
								className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
									doctorDiscountPercent === pct
										? "bg-amber-500 text-white"
										: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								{pct}%
							</button>
						))}
						<button
							type="button"
							onClick={() => onSetDoctorDiscountPercent(100)}
							className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-colors ${
								doctorDiscountPercent === 100
									? "bg-amber-500 text-white"
									: "bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
							}`}
							data-testid="wizard-discount-100-btn"
						>
							100%
						</button>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-4 justify-between sm:justify-end">
				<div className="text-right">
					<div className="text-[11px] text-[var(--muted)] uppercase font-semibold">Итого к оплате</div>
					<div className="text-lg font-bold font-mono text-teal-600 dark:text-teal-400">
						{totalRub.toLocaleString("ru-RU")} ₽
					</div>
				</div>

				<button
					type="button"
					onClick={onSubmit}
					disabled={isSubmitting}
					className="h-9 px-4 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:opacity-90 active:scale-95 transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
					data-testid="btn-create-treatment-plan"
				>
					<Sparkles size={14} />
					<span>{isSubmitting ? "Сохранение..." : "Сформировать план"}</span>
				</button>
			</div>
		</div>
	);
};
