import { Sunrise, Sun, Sunset } from "lucide-react";
import type React from "react";
import { BookingSlotButton } from "./BookingSlotButton";
import { BookingSlotsEmptyState } from "./BookingSlotsEmptyState";
import { BookingSlotsErrorFallback } from "./BookingSlotsErrorFallback";
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
	readonly slotError?: string | null | undefined;
	readonly onRetry?: (() => void) | undefined;
}

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
	slotError,
	onRetry,
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

	if (slotError && filteredSlots.length === 0) {
		return <BookingSlotsErrorFallback slotError={slotError} onRetry={onRetry} />;
	}

	if (filteredSlots.length === 0) {
		return <BookingSlotsEmptyState onJoinWaitlist={onJoinWaitlist} />;
	}

	const renderSlot = (slot: BookingSlotItem) => (
		<BookingSlotButton
			key={slot.time}
			slot={slot}
			isSelected={selectedSlot?.time === slot.time}
			onSelectSlot={onSelectSlot}
		/>
	);

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
								<div className="dbw-slots-grid">{morningSlots.map(renderSlot)}</div>
							</div>
						)}
						{afternoonSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sun size={16} />
									<span>День (12:00–16:00)</span>
									<span className="dbw-period-count-badge">{afternoonSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">{afternoonSlots.map(renderSlot)}</div>
							</div>
						)}
						{eveningSlots.length > 0 && (
							<div className="dbw-slot-group">
								<div className="dbw-slots-period-label">
									<Sunset size={16} />
									<span>Вечер (16:00–21:00)</span>
									<span className="dbw-period-count-badge">{eveningSlots.length}</span>
								</div>
								<div className="dbw-slots-grid">{eveningSlots.map(renderSlot)}</div>
							</div>
						)}
					</>
				) : (
					<div className="dbw-slots-grid">{filteredSlots.map(renderSlot)}</div>
				)}
			</div>
		</div>
	);
};
