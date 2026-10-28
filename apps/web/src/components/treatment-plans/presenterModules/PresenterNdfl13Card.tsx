import React from "react";
import { Coins, ShieldCheck } from "lucide-react";
import type { TreatmentPlanTier } from "../types";

export interface PresenterNdfl13CardProps {
	readonly selectedTier: TreatmentPlanTier;
}

export const PresenterNdfl13Card: React.FC<PresenterNdfl13CardProps> = ({
	selectedTier,
}) => {
	return (
		<div className="p-5 rounded-2xl bg-[var(--tp-surface)] border border-[var(--tp-border)] flex flex-col justify-between gap-4">
			<div>
				<div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-2">
					<Coins size={20} />
					<h4 className="text-sm font-bold text-[var(--tp-text-main)] m-0">
						Налоговый вычет 13% НДФЛ
					</h4>
				</div>
				<p className="text-xs text-[var(--tp-text-muted)] leading-relaxed">
					Государственная компенсация расходов на стоматологическое лечение в соответствии с НК РФ.
				</p>

				<div className="p-4 rounded-xl bg-teal-500/5 border border-teal-500/20 flex flex-col gap-3 my-4">
					<div className="flex items-center justify-between">
						<span className="text-xs text-[var(--tp-text-muted)]">
							Тип лечения по справке:
						</span>
						<span className="text-xs font-bold px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-800 dark:text-teal-200">
							{selectedTier.ndflDetails.isHighCostTreatment
								? "Код 02 (Дорогостоящее — без лимита)"
								: "Код 01 (Обычное — лимит 150 000 ₽)"}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-xs text-[var(--tp-text-muted)]">
							Сумма к возврату (13%):
						</span>
						<span className="text-base font-extrabold text-teal-600 dark:text-teal-400">
							+{selectedTier.ndflRefundRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
					<div className="pt-2 border-t border-teal-500/20 flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--tp-text-main)]">
							Реальная стоимость с учётом вычета:
						</span>
						<span className="text-base font-extrabold text-[var(--tp-text-main)]">
							{selectedTier.priceWithNdflRefundRub.toLocaleString("ru-RU")} ₽
						</span>
					</div>
				</div>
			</div>

			<div className="text-[11px] text-[var(--tp-text-muted)] flex items-center gap-1.5 opacity-80">
				<ShieldCheck size={14} className="text-teal-500 shrink-0" />
				<span>Клиника выдаёт официальную справку для налоговой (вычет 13%)</span>
			</div>
		</div>
	);
};
