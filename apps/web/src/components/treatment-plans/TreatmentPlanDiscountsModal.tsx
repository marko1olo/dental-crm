/**
 * TreatmentPlanDiscountsModal.tsx — модальное окно управления скидками врача и списания бонусов/депозита.
 * Вынесено из тулбара для соблюдения лимита высоты экрана (y <= 140px для 3-Tier карточек).
 */

import React from "react";
import { Coins, Percent, X } from "lucide-react";

export interface TreatmentPlanDiscountsModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (pct: number) => void;
	readonly bonusPointsToUseRub: number;
	readonly setBonusPointsToUseRub: (rub: number) => void;
	readonly patientBalanceRub: number;
}

export const TreatmentPlanDiscountsModal: React.FC<TreatmentPlanDiscountsModalProps> = ({
	isOpen,
	onClose,
	discountPercent,
	setDiscountPercent,
	bonusPointsToUseRub,
	setBonusPointsToUseRub,
	patientBalanceRub,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tp-discounts-title"
			data-testid="treatment-plan-discounts-modal"
		>
			<div className="relative w-full max-w-lg p-5 rounded-3xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,var(--border,#cbd5e1))]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
							<Percent size={18} />
						</div>
						<div>
							<h3 id="tp-discounts-title" className="text-sm font-black m-0">
								Скидки и бонусы пациента
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Врачебная автономия: скидки от 0 до 100% без согласований
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Quick Discounts */}
				<div className="space-y-2">
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block">
						Скидка врача на план лечения:
					</label>
					<div className="flex items-center gap-1.5 flex-wrap">
						{[0, 5, 10, 15, 20, 50, 100].map((pct) => (
							<button
								key={pct}
								type="button"
								onClick={() => setDiscountPercent(pct)}
								className={`px-3 py-1.5 min-h-[36px] rounded-xl font-mono font-bold text-xs cursor-pointer transition-all ${
									discountPercent === pct
										? pct === 100
											? "bg-emerald-600 text-white shadow-xs"
											: "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
										: pct === 100
											? "bg-[var(--paper-soft)] text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
											: "bg-[var(--paper-soft)] text-[var(--muted)] hover:text-[var(--ink)] border border-[var(--line)]"
								}`}
							>
								{pct === 100 ? "100% (Гарантия)" : `${pct}%`}
							</button>
						))}
					</div>
					<div className="flex items-center gap-2 pt-1">
						<span className="text-xs text-[var(--muted,#64748b)] font-semibold">Произвольный %:</span>
						<input
							type="number"
							min="0"
							max="100"
							value={discountPercent}
							onChange={(e) => {
								const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
								setDiscountPercent(val);
							}}
							className="w-20 h-8 px-2 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-center focus:ring-1 focus:ring-[var(--teal)]"
							placeholder="%"
						/>
						<span className="text-xs text-[var(--muted)] font-bold">%</span>
					</div>
				</div>

				{/* Patient Loyalty Balance / Deposit */}
				<div className="space-y-2 pt-2 border-t border-[var(--line,var(--border,#cbd5e1))]">
					<div className="flex items-center justify-between text-xs">
						<span className="font-bold text-[var(--muted,#64748b)] flex items-center gap-1.5">
							<Coins size={15} className="text-amber-500" />
							Доступный баланс / бонусы:
						</span>
						<strong className="font-mono text-[var(--ink,#0f172a)]">
							{patientBalanceRub.toLocaleString("ru-RU")} ₽
						</strong>
					</div>

					{patientBalanceRub > 0 ? (
						<div className="flex items-center gap-2 pt-1">
							<input
								type="number"
								min={0}
								max={patientBalanceRub}
								value={bonusPointsToUseRub || ""}
								onChange={(e) => {
									const val = Math.max(0, Math.min(patientBalanceRub, Number(e.target.value) || 0));
									setBonusPointsToUseRub(val);
								}}
								placeholder="Списать ₽"
								className="w-32 h-8 px-2 text-xs font-mono font-bold rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:ring-1 focus:ring-[var(--teal)]"
							/>
							<span className="text-xs text-[var(--muted)]">₽ к списанию</span>
							{bonusPointsToUseRub > 0 && (
								<button
									type="button"
									onClick={() => setBonusPointsToUseRub(0)}
									className="text-xs font-bold text-rose-500 hover:underline cursor-pointer ml-auto"
								>
									Сбросить
								</button>
							)}
						</div>
					) : (
						<p className="text-xs text-[var(--muted,#64748b)] m-0">
							У пациента пока нет накопленных бонусов или депозита.
						</p>
					)}
				</div>

				{/* Footer */}
				<div className="pt-3 border-t border-[var(--line,var(--border,#cbd5e1))] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-white hover:bg-[var(--teal-dark,var(--teal))] cursor-pointer shadow-xs"
					>
						Готово
					</button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanDiscountsModal;
