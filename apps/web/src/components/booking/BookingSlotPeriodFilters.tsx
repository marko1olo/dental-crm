import { Clock, Sun, Sunrise, Sunset } from "lucide-react";
import type React from "react";
import type { BookingSlotItem } from "./contracts/bookingContracts";

export type SlotPeriod = "all" | "morning" | "afternoon" | "evening";

export interface BookingSlotPeriodFiltersProps {
	readonly activePeriodFilter: SlotPeriod;
	readonly onPeriodFilterChange: (period: SlotPeriod) => void;
	readonly totalSlotsCount: number;
	readonly morningCount: number;
	readonly afternoonCount: number;
	readonly eveningCount: number;
}

export const BookingSlotPeriodFilters: React.FC<BookingSlotPeriodFiltersProps> = ({
	activePeriodFilter,
	onPeriodFilterChange,
	totalSlotsCount,
	morningCount,
	afternoonCount,
	eveningCount,
}) => {
	return (
		<div
			className="dbw-period-filter-chips"
			role="tablist"
			aria-label="Фильтр времени суток"
		>
			<button
				type="button"
				role="tab"
				aria-selected={activePeriodFilter === "all"}
				className={`dbw-chip-btn dente-filter-chip ${activePeriodFilter === "all" ? "active" : ""}`}
				onClick={() => onPeriodFilterChange("all")}
			>
				<Clock size={16} />
				<span>Все ({totalSlotsCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activePeriodFilter === "morning"}
				className={`dbw-chip-btn dente-filter-chip ${activePeriodFilter === "morning" ? "active" : ""}`}
				onClick={() => onPeriodFilterChange("morning")}
				disabled={morningCount === 0}
			>
				<Sunrise size={16} />
				<span>Утро ({morningCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activePeriodFilter === "afternoon"}
				className={`dbw-chip-btn dente-filter-chip ${activePeriodFilter === "afternoon" ? "active" : ""}`}
				onClick={() => onPeriodFilterChange("afternoon")}
				disabled={afternoonCount === 0}
			>
				<Sun size={16} />
				<span>День ({afternoonCount})</span>
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={activePeriodFilter === "evening"}
				className={`dbw-chip-btn dente-filter-chip ${activePeriodFilter === "evening" ? "active" : ""}`}
				onClick={() => onPeriodFilterChange("evening")}
				disabled={eveningCount === 0}
			>
				<Sunset size={16} />
				<span>Вечер ({eveningCount})</span>
			</button>
		</div>
	);
};
