/**
 * DENTE Dental CRM — Booking Service & Category Selection Section (Step 1)
 *
 * Apple Store HIG & Clinical Ergonomics (Mandates 8c, 8e, 8p, 8n)
 */

import React from "react";
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

export interface BookingCategoryOption {
	id: string;
	title: string;
	subtitle: string;
	durationMinutes: number;
	priceLabel: string;
	iconName: "Stethoscope" | "Sparkles" | "Activity" | "Smile" | "Scissors";
	badge?: string;
	isPopular?: boolean;
}

export const CANONICAL_BOOKING_CATEGORIES: BookingCategoryOption[] = [
	{
		id: "therapy",
		title: "Лечение кариеса",
		subtitle: "Терапия, пломбы, эстетическая реставрация, лечение каналов",
		durationMinutes: 45,
		priceLabel: "от 3 500 ₽",
		iconName: "Stethoscope",
		isPopular: true,
		badge: "Популярно",
	},
	{
		id: "hygiene",
		title: "Чистка зубов",
		subtitle: "Комплексная гигиена, снятие налёта, ультразвук и AirFlow",
		durationMinutes: 60,
		priceLabel: "от 4 500 ₽",
		iconName: "Sparkles",
		isPopular: true,
	},
	{
		id: "emergency",
		title: "⚡ Срочный приём / Острая боль",
		subtitle: "Экстренная помощь день-в-день, снятие болевого синдрома",
		durationMinutes: 30,
		priceLabel: "от 2 500 ₽",
		iconName: "Activity",
		badge: "Срочно",
	},
	{
		id: "consultation",
		title: "Консультация и осмотр",
		subtitle: "Первичный приём, диагностика и составление комплексного плана",
		durationMinutes: 30,
		priceLabel: "Бесплатно",
		iconName: "Smile",
		badge: "0 ₽",
	},
	{
		id: "orthodontics",
		title: "Брекеты и элайнеры",
		subtitle: "Консультация ортодонта, диагностика прикуса и выравнивание зубов",
		durationMinutes: 45,
		priceLabel: "от 3 000 ₽",
		iconName: "Smile",
	},
	{
		id: "surgery",
		title: "Имплантация и хирургия",
		subtitle: "Удаление зубов, дентальная имплантация, консультация хирурга",
		durationMinutes: 45,
		priceLabel: "от 5 000 ₽",
		iconName: "Scissors",
	},
];

export interface BookingCategoriesSectionProps {
	selectedCategoryId: string | null;
	onSelectCategory: (category: BookingCategoryOption) => void;
	categories?: BookingCategoryOption[];
	className?: string;
}

export const BookingCategoriesSection: React.FC<BookingCategoriesSectionProps> = ({
	selectedCategoryId,
	onSelectCategory,
	categories = CANONICAL_BOOKING_CATEGORIES,
	className = "",
}) => {
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

	return (
		<section
			aria-labelledby="booking-categories-heading"
			className={`dbw-categories-section ${className}`}
			data-testid="booking-categories-section"
		>
			<div className="dbw-section-header-row mb-3 flex items-center justify-between">
				<h3
					id="booking-categories-heading"
					className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
				>
					Выберите услугу или повод для визита:
				</h3>
			</div>

			<div className="dbw-categories-grouped-list space-y-2.5">
				{categories.map((cat) => {
					const isSelected = selectedCategoryId === cat.id;
					return (
						<button
							key={cat.id}
							type="button"
							onClick={() => onSelectCategory(cat)}
							aria-pressed={isSelected}
							className={`dbw-category-card group relative w-full text-left rounded-2xl p-3.5 sm:p-4 border transition-all duration-200 flex items-center justify-between gap-3 min-h-[64px] active:scale-[0.99] ${
								isSelected
									? "dbw-category-selected bg-teal-50/90 dark:bg-teal-950/40 border-teal-500 shadow-sm ring-1 ring-teal-500/30"
									: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
							}`}
						>
							<div className="flex items-center gap-3.5 min-w-0 flex-1">
								{/* Icon in colored container */}
								<div
									className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
										cat.id === "emergency"
											? "bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
											: isSelected
												? "bg-teal-600 text-white shadow-sm"
												: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400"
									}`}
								>
									{renderIcon(cat.iconName)}
								</div>

								{/* Details */}
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="font-bold text-[15px] sm:text-base text-slate-900 dark:text-slate-100 tracking-tight">
											{cat.title}
										</span>
										{cat.badge && (
											<span
												className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
													cat.id === "emergency"
														? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
														: "bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300"
												}`}
											>
												{cat.badge}
											</span>
										)}
									</div>
									<p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 sm:line-clamp-none break-words mt-0.5 leading-snug">
										{cat.subtitle}
									</p>
									<div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 mt-1">
										<span className="font-bold text-slate-900 dark:text-slate-200">
											{cat.priceLabel}
										</span>
										<span>•</span>
										<span className="inline-flex items-center gap-1">
											<Clock size={12} className="text-slate-400" />
											{cat.durationMinutes} мин
										</span>
									</div>
								</div>
							</div>

							{/* Trailing check or chevron */}
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
				})}
			</div>
		</section>
	);
};
