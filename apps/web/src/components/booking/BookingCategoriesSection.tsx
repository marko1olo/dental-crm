import type React from "react";
import { BookingCategoryCard } from "./BookingCategoryCard";
import type { BookingCategoryOption } from "./contracts/bookingContracts";
import { CANONICAL_BOOKING_CATEGORIES } from "./presets/bookingCategoryPresets";

export type { BookingCategoryOption };
export { CANONICAL_BOOKING_CATEGORIES };

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
				{categories.map((cat) => (
					<BookingCategoryCard
						key={cat.id}
						category={cat}
						isSelected={selectedCategoryId === cat.id}
						onSelect={onSelectCategory}
					/>
				))}
			</div>
		</section>
	);
};
