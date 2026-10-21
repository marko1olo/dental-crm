import React from "react";
import { Receipt } from "lucide-react";

export interface TaxDeduction13BannerProps {
	readonly deductionRub: number;
}

export const TaxDeduction13Banner: React.FC<TaxDeduction13BannerProps> = ({ deductionRub }) => {
	return (
		<section className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-3 flex-wrap">
			<div className="flex items-center gap-3">
				<div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
					<Receipt size={17} />
				</div>
				<div>
					<div className="text-xs sm:text-sm font-bold text-[var(--ink)]">
						Возврат 13% НДФЛ через ФНС (Справка КНД 1151156)
					</div>
					<div className="text-xs text-[var(--muted)]">
						Клиника подготовит полный пакет документов для налоговой в 1 клик
					</div>
				</div>
			</div>

			<div className="text-right">
				<span className="text-xs text-[var(--muted)] block">Экономия пациента:</span>
				<span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
					-{deductionRub.toLocaleString("ru-RU")} ₽
				</span>
			</div>
		</section>
	);
};
