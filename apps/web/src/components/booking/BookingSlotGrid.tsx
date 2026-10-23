import { Check, Sunrise, Sun, Sunset } from "lucide-react";
import type React from "react";
import { BookingSlotsEmptyState } from "./BookingSlotsEmptyState";
import type { BookingSlotItem } from "./contracts/bookingContracts";
import type { SlotPeriod } from "./BookingSlotPeriodFilters";

export interface BookingSlotGridProps {
	readonly slotsLoading: boolean;
	readonly filteredSlots: BookingSlotItem[];
	readonly activePeriodFilter: SlotPeriod;
	readonly morningSlots: BookingSlotItem[];
	readonly afternoonSlots: BookingSlotItem[];
	readonly eveningSlots: BookingSlotItem[];
	readonly selectedSlot: BookingSlotItem | null;
	readonly onSelectSlot: (slot: BookingSlotItem) => void;
	readonly onJoinWaitlist?: (() => void) | undefined;
}

const renderSlotButton = (
	slot: BookingSlotItem,
	selectedSlot: BookingSlotItem | null,
	onSelectSlot: (slot: BookingSlotItem) => void,
) => {
	const isSelected = selectedSlot?.time === slot.time;
	return (
		<button
			type="button"
			key={slot.time}
			className={`dbw-slot-btn ${isSelected ? "selected" : ""}`}
			onClick={() => onSelectSlot(slot)}
			aria-pressed={isSelected}
		>
			<span className="text-base font-bold">{slot.time}</span>
			{isSelected && (
				<Check size={14} className="dbw-slot-check" aria-hidden="true" />
			)}
		</button>
	);
};

export const BookingSlotGrid: React.FC<BookingSlotGridProps> = ({
	slotsLoading,
	filteredSlots,
	activePeriodFilter,
	morningSlots,
	afternoonSlots,
	eveningSlots,
	selectedSlot,
	onSelectSlot,
	onJoinWaitlist,
}) => {
	if (slotsLoading) {
		return (
			<div className="dbw-slots-section" aria-live="polite">
				<div className="dbw-slots-loading-container">
					<div className="dbw-loading-spinner" aria-hidden="true" />
					<div className="text-sm font-semibold text-slate-500 dark:text-slate-400">
						Загрузка свободных интервалов…
					</div>
				</div>
			</div>
		);
	}

	if (filteredSlots.length === 0) {
		return <BookingSlotsEmptyState onJoinWaitlist={onJoinWaitlist} />;
	}

	return (
		<div className="dbw-slots-section" aria-live="polite">
			<div className="dbw-slots-groups">
				{activePeriodFilter === "all" ? (
					<>
						{morningSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sunrise size={16} />
									<span>Утро (09:00–12:00)</span>
									<span className="dbw-period-count-badge">{morningSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{morningSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
						{afternoonSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sun size={16} />
									<span>День (12:00–16:00)</span>
									<span className="dbw-period-count-badge">{afternoonSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{afternoonSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
						{eveningSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sunset size={16} />
									<span>Вечер (16:00–21:00)</span>
									<span className="dbw-period-count-badge">{eveningSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">
									{eveningSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
								</div>
							</div>
						)}
					</>
				) : (
					<div className="dbw-slots-grid">
						{filteredSlots.map((s) => renderSlotButton(s, selectedSlot, onSelectSlot))}
					</div>
				)}
			</div>
		</div>
	);
};
