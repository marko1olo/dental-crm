import { Check } from "lucide-react";
import type React from "react";
import type { BookingSlotItem } from "./contracts/bookingContracts";

export interface BookingSlotButtonProps {
	readonly slot: BookingSlotItem;
	readonly isSelected: boolean;
	readonly onSelectSlot: (slot: BookingSlotItem) => void;
}

export const BookingSlotButton: React.FC<BookingSlotButtonProps> = ({
	slot,
	isSelected,
	onSelectSlot,
}) => {
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
