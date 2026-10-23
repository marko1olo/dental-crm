import {
	Activity,
	Check,
	ChevronRight,
	Clock,
	Scissors,
	Smile,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import type React from "react";
import type { BookingCategoryOption } from "./contracts/bookingContracts";

export interface BookingCategoryCardProps {
	readonly category: BookingCategoryOption;
	readonly isSelected: boolean;
	readonly onSelect: (category: BookingCategoryOption) => void;
}

const renderIcon = (iconName: string) => {
	switch (iconName) {
		case "Stethoscope":
			return <Stethoscope size={20} className="shrink-0" />;
		case "Sparkles":
			return <Sparkles size={20} className="shrink-0" />;
		case "Activity":
			return <Activity size={20} className="shrink-0" />;
		case "Scissors":
			return <Scissors size={20} className="shrink-0" />;
		case "Smile":
		default:
			return <Smile size={20} className="shrink-0" />;
	}
};

export const BookingCategoryCard: React.FC<BookingCategoryCardProps> = ({
	category,
	isSelected,
	onSelect,
}) => {
	const isEmergency = category.id === "emergency";

	return (
		<button
			type="button"
			onClick={() => onSelect(category)}
			aria-pressed={isSelected}
			className={`dbw-category-card group relative w-full text-left rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 flex items-center justify-between gap-3 min-h-[64px] active:scale-[0.99] ${
				isSelected
					? "dbw-category-selected bg-teal-50/90 dark:bg-teal-950/40 border-teal-500 shadow-sm ring-1 ring-teal-500/30"
					: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
			}`}
		>
			<div className="flex items-center gap-3.5 min-w-0 flex-1">
				<div
					className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
						isEmergency
							? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
							: isSelected
								? "bg-teal-600 text-white shadow-sm"
								: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400"
					}`}
				>
					{renderIcon(category.iconName)}
				</div>

				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 tracking-tight">
							{category.title}
						</span>
						{category.badge && (
							<span
								className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
									isEmergency
										? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
										: "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300"
								}`}
							>
								{category.badge}
							</span>
						)}
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 sm:line-clamp-none break-words mt-0.5 leading-snug">
						{category.subtitle}
					</p>
					<div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 mt-1">
						<span className="font-bold text-slate-900 dark:text-slate-200">
							{category.priceLabel}
						</span>
						<span>•</span>
						<span className="inline-flex items-center gap-1">
							<Clock size={12} className="text-slate-400" />
							{category.durationMinutes} мин
						</span>
					</div>
				</div>
			</div>

			<div className="shrink-0 pl-1">
				{isSelected ? (
					<div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-sm">
						<Check size={14} strokeWidth={3} />
					</div>
				) : (
					<ChevronRight
						size={18}
						className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-transform group-hover:translate-x-0.5"
					/>
				)}
			</div>
		</button>
	);
};
