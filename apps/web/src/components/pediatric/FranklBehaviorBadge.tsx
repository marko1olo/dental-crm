import React, { useState } from "react";
import {
	AlertCircle,
	Check,
	ChevronDown,
	ChevronUp,
	Heart,
	Info,
	Sparkles,
	Zap,
} from "lucide-react";
import {
	type FranklRating,
	type FranklRatingDefinition,
	FRANKL_SCALE_DEFINITIONS,
	getFranklDefinition,
} from "../odontogram/pediatricDentitionEngine";

export interface FranklBehaviorBadgeProps {
	readonly rating?: FranklRating | undefined;
	readonly onChange?: ((rating: FranklRating) => void) | undefined;
	readonly onQuickSelect?: ((rating: FranklRating, note?: string) => void) | undefined;
	readonly readOnly?: boolean | undefined;
	readonly showStrategies?: boolean | undefined;
	readonly compact?: boolean | undefined;
	readonly className?: string | undefined;
}

const FRANKL_RATINGS: readonly FranklRating[] = [1, 2, 3, 4];

export const FranklBehaviorBadge: React.FC<FranklBehaviorBadgeProps> = ({
	rating = 3,
	onChange,
	onQuickSelect,
	readOnly = false,
	showStrategies = true,
	compact = false,
	className = "",
}) => {
	const [expanded, setExpanded] = useState<boolean>(false);
	const activeDef: FranklRatingDefinition = getFranklDefinition(rating);

	if (compact) {
		return (
			<div
				className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black select-none border transition-all ${className}`.trim()}
				style={{
					backgroundColor: activeDef.badgeBg,
					color: activeDef.badgeColor,
					borderColor: activeDef.badgeBorder,
				}}
				title={`${activeDef.nameRu}: ${activeDef.descriptionRu}`}
			>
				<span className="text-base leading-none">{activeDef.emoji}</span>
				<span>Франкл {activeDef.symbol}</span>
			</div>
		);
	}

	return (
		<div
			className={`frankl-behavior-card p-4 sm:p-5 rounded-2xl bg-[var(--odontogram-surface,var(--paper-soft,#f8fafc))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-4 ${className}`.trim()}
			data-testid="frankl-behavior-card"
			data-rating={rating}
		>
			{/* Header with Title and Current Selected Badge */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
				<div>
					<div className="flex items-center gap-2">
						<Heart className="w-4 h-4 text-rose-500 shrink-0" />
						<span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[var(--odontogram-ink-muted,var(--muted,#64748b))]">
							Шкала поведения Франкла (Frankl Scale)
						</span>
					</div>
					<h3 className="text-sm sm:text-base font-extrabold text-[var(--odontogram-ink,var(--ink,#0f172a))]">
						Психоэмоциональный статус ребенка на приеме
					</h3>
				</div>

				<div
					className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black border shadow-xs"
					style={{
						backgroundColor: activeDef.badgeBg,
						color: activeDef.badgeColor,
						borderColor: activeDef.badgeBorder,
					}}
				>
					<span className="text-lg leading-none">{activeDef.emoji}</span>
					<span>{activeDef.nameRu}</span>
				</div>
			</div>

			{/* ⚡ 1-клик быстрое заполнение: Поведение позитивное (Frankl 4/4) */}
			{!readOnly && (
				<button
					type="button"
					onClick={() => {
						onChange?.(4);
						onQuickSelect?.(4, "⚡ 1-клик: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания");
					}}
					className={`w-full min-h-[44px] px-3.5 sm:px-4 py-2 rounded-xl border flex items-center justify-between gap-2 font-bold text-xs sm:text-sm cursor-pointer transition-all active:scale-[0.99] select-none ${
						rating === 4
							? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-200 shadow-xs ring-2 ring-emerald-500/20"
							: "bg-[var(--odontogram-paper,var(--paper,#ffffff))] hover:bg-emerald-500/10 border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] text-[var(--odontogram-ink,var(--ink,#0f172a))] hover:border-emerald-500/40"
					}`}
					title="⚡ 1-клик: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания"
					data-testid="frankl-one-click-btn"
				>
					<span className="flex items-center gap-2 text-left">
						<Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span className="truncate sm:whitespace-normal">
							⚡ 1-клик: Поведение позитивное (Frankl 4/4), адаптация успешна, лечение без удержания
						</span>
					</span>
					{rating === 4 ? (
						<span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 dark:text-emerald-300 shrink-0 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-md">
							<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
							Применено
						</span>
					) : (
						<span className="text-xs text-[var(--odontogram-ink-muted,var(--muted,#64748b))] font-medium shrink-0">
							Выбрать
						</span>
					)}
				</button>
			)}

			{/* 4 Interactive Rating Selector Cards (1..4) */}
			{!readOnly && (
				<div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
					{FRANKL_RATINGS.map((r) => {
						const def = FRANKL_SCALE_DEFINITIONS[r];
						const isSelected = rating === r;
						return (
							<button
								key={r}
								type="button"
								onClick={() => onChange?.(r)}
								className={`min-h-[52px] p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
									isSelected
										? "ring-2 shadow-md scale-[1.02]"
										: "opacity-80 hover:opacity-100 hover:scale-[1.01] bg-[var(--odontogram-paper,var(--paper,#ffffff))]"
								}`}
								style={{
									backgroundColor: isSelected ? def.badgeBg : undefined,
									borderColor: isSelected ? def.badgeColor : "var(--odontogram-border-subtle,var(--line,#e2e8f0))",
									color: isSelected ? def.badgeColor : "var(--odontogram-ink,var(--ink,#0f172a))",
								}}
								title={def.descriptionRu}
								data-testid={`frankl-btn-${r}`}
							>
								<div className="flex items-center gap-1.5">
									<span className="text-xl leading-none">{def.emoji}</span>
									<span className="font-mono font-black text-sm sm:text-base">{def.symbol}</span>
									{isSelected && <Check className="w-4 h-4 shrink-0" />}
								</div>
								<div className="text-xs font-bold mt-1 line-clamp-1">
									{def.labelRu}
								</div>
							</button>
						);
					})}
				</div>
			)}

			{/* Description & Clinical Signs */}
			<div className="p-3.5 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] space-y-1.5 shadow-xs">
				<div className="flex items-start gap-2 text-xs sm:text-sm text-[var(--odontogram-ink,var(--ink,#0f172a))] font-medium">
					<Info className="w-4 h-4 text-[var(--teal,#0d9488)] shrink-0 mt-0.5" />
					<div>
						<strong className="font-bold text-[var(--odontogram-ink,var(--ink,#0f172a))]">Клиническая картина: </strong>
						<span>{activeDef.clinicalSignsRu}</span>
					</div>
				</div>
			</div>

			{/* Management Strategies & Collapsible Details */}
			{showStrategies && (
				<div className="space-y-2">
					<button
						type="button"
						onClick={() => setExpanded((prev) => !prev)}
						className="flex items-center justify-between w-full py-1.5 text-xs sm:text-sm font-bold text-[var(--odontogram-ink-muted,var(--muted,#64748b))] hover:text-[var(--odontogram-ink,var(--ink,#0f172a))] transition-colors cursor-pointer"
					>
						<span className="flex items-center gap-1.5">
							<Sparkles className="w-4 h-4 text-amber-500" />
							<span>Рекомендованные техники психологической адаптации ({activeDef.managementStrategiesRu.length})</span>
						</span>
						{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</button>

					{expanded && (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 animate-in fade-in duration-150">
							{activeDef.managementStrategiesRu.map((strat, idx) => (
								<div
									key={idx}
									className="p-3 rounded-xl bg-[var(--odontogram-paper,var(--paper,#ffffff))] border border-[var(--odontogram-border-subtle,var(--line,#e2e8f0))] flex items-start gap-2 text-xs sm:text-sm text-[var(--odontogram-ink,var(--ink,#0f172a))] font-medium shadow-xs"
								>
									<Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
									<span>{strat}</span>
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
