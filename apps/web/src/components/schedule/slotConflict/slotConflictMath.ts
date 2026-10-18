export interface AlternativeChairOption {
	id: string;
	name: string;
	roomNumber?: string;
}

/**
 * Canonical half-open interval overlap check [startA, endA) and [startB, endB).
 * Strictly mirrors backend scheduleConflictService.ts SSOT:
 * Adjacent back-to-back slots (endA === startB) do NOT collide (returns false).
 */
export function hasTimeOverlap(
	startA: Date | string | number,
	endA: Date | string | number,
	startB: Date | string | number,
	endB: Date | string | number,
): boolean {
	const sA = typeof startA === "number" ? startA : new Date(startA).getTime();
	const eA = typeof endA === "number" ? endA : new Date(endA).getTime();
	const sB = typeof startB === "number" ? startB : new Date(startB).getTime();
	const eB = typeof endB === "number" ? endB : new Date(endB).getTime();

	if (Number.isNaN(sA) || Number.isNaN(eA) || Number.isNaN(sB) || Number.isNaN(eB)) {
		return false;
	}
	return sA < eB && eA > sB;
}

/**
 * Checks if two slots are back-to-back adjacent without overlap.
 */
export function areSlotsAdjacent(
	endA: Date | string | number,
	startB: Date | string | number,
): boolean {
	const eA = typeof endA === "number" ? endA : new Date(endA).getTime();
	const sB = typeof startB === "number" ? startB : new Date(startB).getTime();
	return Math.abs(eA - sB) <= 60_000; // within 1 minute tolerance
}

export interface SlotConflictModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly conflictMessage?: string | null | undefined;
	readonly conflictType?: "chair" | "doctor" | "patient" | "double_booking" | null | undefined;
	readonly suggestedSlots?: readonly (string | { timeDisplay?: string; label?: string; startsAt?: string; endsAt?: string })[] | undefined;
	readonly onSelectSlot?: ((slotTime: string) => void) | undefined;
	readonly onOverbook?: (() => void) | undefined;
	readonly onForceSave?: (() => void) | undefined;
	readonly patientName?: string | null | undefined;
	readonly doctorName?: string | null | undefined;
	readonly conflictingDoctorName?: string | null | undefined;
	readonly conflictingPatientName?: string | null | undefined;
	readonly conflictingTimeRange?: string | null | undefined;
	readonly inline?: boolean | undefined;
	readonly onShiftMinutes?: ((minutes: number) => void) | undefined;
	readonly shiftMinutesList?: readonly number[] | undefined;
	readonly alternativeChairs?: readonly AlternativeChairOption[] | undefined;
	readonly onMoveToChair?: ((chairId: string) => void) | undefined;
	readonly currentChairName?: string | null | undefined;
}
