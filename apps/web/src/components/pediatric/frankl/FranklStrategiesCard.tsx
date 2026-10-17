import React from "react";
import { Check, Heart, Info, Zap } from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	getFranklVectorIcon,
} from "./franklTypes";
import { FranklRatingButtonsGrid } from "./FranklRatingButtonsGrid";
import { FranklManagementStrategiesAccordion } from "./FranklManagementStrategiesAccordion";

interface FranklStrategiesCardProps {
	readonly rating: FranklRating;
	readonly activeDef: FranklRatingDefinition;
	readonly readOnly?: boolean | undefined;
	readonly showStrategies?: boolean | undefined;
	readonly onChange?: ((rating: FranklRating) => void) | undefined;
	readonly onQuickSelect?: ((rating: FranklRating, note?: string) => void) | undefined;
	readonly className?: string | undefined;
}

export const FranklStrategiesCard: React.FC<FranklStrategiesCardProps> = ({
	rating,
	activeDef,
	readOnly = false,
	showStrategies = true,
	onChange,
	onQuickSelect,
	className = "",
}) => {
	const ActiveIcon = getFranklVectorIcon(rating);

	return (
		<div
			className={`frankl-behavior-card p-4 sm:p-5 rounded-2xl bg-[var(--paper-soft,#f8fafc)] border border-[var(--line,#e2e8f0)] space-y-4 ${className}`.trim()}
			data-testid="frankl-behavior-card"
			data-rating={rating}
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<Heart className="w-4 h-4 text-rose-500 shrink-0" />
						<span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--muted,#64748b)] truncate">
							Шкала поведения Франкла (Frankl Scale)
						</span>
					</div>
					<h3 className="text-sm sm:text-base font-extrabold text-[var(--ink,#0f172a)] truncate">
						Психоэмоциональный статус ребенка на приеме
					</h3>
				</div>

				<div
					className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border shadow-xs shrink-0"
					style={{
						backgroundColor: activeDef.badgeBg,
						color: activeDef.badgeColor,
						borderColor: activeDef.badgeBorder,
					}}
				>
					<ActiveIcon className="w-4 h-4 shrink-0" />
					<span>{activeDef.nameRu}</span>
				</div>
			</div>

			{!readOnly && (
				<button
					type="button"
					onClick={() => {
						onChange?.(4);
						onQuickSelect?.(4, "Пресет: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания");
					}}
					className={`w-full min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border flex items-center justify-between gap-2 font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.99] select-none ${
						rating === 4
							? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
							: "bg-[var(--paper,#ffffff)] hover:bg-emerald-500/10 border-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)] hover:border-emerald-500/40"
					}`}
					title="Пресет: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания"
					data-testid="frankl-one-click-btn"
				>
					<span className="flex items-center gap-2 text-left min-w-0">
						<Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="truncate sm:whitespace-normal">
							1-клик: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания
						</span>
					</span>
					{rating === 4 ? (
						<span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
							<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
							Применено
						</span>
					) : (
						<span className="text-xs text-[var(--muted,#64748b)] font-medium shrink-0">Выбрать</span>
					)}
				</button>
			)}

			{!readOnly && <FranklRatingButtonsGrid rating={rating} onChange={onChange} />}

			<div className="p-3.5 rounded-xl bg-[var(--paper,#ffffff)] border border-[var(--line,#e2e8f0)] space-y-1.5 shadow-xs">
				<div className="flex items-start gap-2 text-xs sm:text-sm text-[var(--ink,#0f172a)] font-medium min-w-0">
					<Info className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
					<div className="min-w-0">
						<strong className="font-bold text-[var(--ink,#0f172a)]">Клиническая картина: </strong>
						<span>{activeDef.clinicalSignsRu}</span>
					</div>
				</div>
			</div>

			{showStrategies && (
				<FranklManagementStrategiesAccordion strategies={activeDef.managementStrategiesRu} />
			)}
		</div>
	);
};
