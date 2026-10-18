import React from "react";
import { useModalA11y } from "../../hooks/useModalA11y";
import {
	hasTimeOverlap,
	areSlotsAdjacent,
	type AlternativeChairOption,
	type SlotConflictModalProps,
} from "./slotConflict/slotConflictMath";
import { SlotConflictControls } from "./slotConflict/SlotConflictControls";
import { SlotConflictInlineView } from "./slotConflict/SlotConflictInlineView";
import { SlotConflictDialogView } from "./slotConflict/SlotConflictDialogView";

export { hasTimeOverlap, areSlotsAdjacent };
export type { AlternativeChairOption, SlotConflictModalProps };

const DEFAULT_SHIFT_MINUTES = [15, 30, 45, 60] as const;

export const SlotConflictModal: React.FC<SlotConflictModalProps> = ({
	isOpen,
	onClose,
	conflictMessage,
	conflictType,
	suggestedSlots = [],
	onSelectSlot = () => {},
	onOverbook: propOnOverbook,
	onForceSave,
	patientName: propPatientName,
	doctorName: propDoctorName,
	conflictingDoctorName,
	conflictingPatientName,
	conflictingTimeRange: _conflictingTimeRange,
	inline = false,
	onShiftMinutes,
	shiftMinutesList = DEFAULT_SHIFT_MINUTES,
	alternativeChairs,
	onMoveToChair,
	currentChairName,
}) => {
	const patientName = propPatientName || conflictingPatientName;
	const doctorName = propDoctorName || conflictingDoctorName;
	const onOverbook = propOnOverbook || onForceSave;
	const { modalRef } = useModalA11y<HTMLDivElement>({
		isOpen: isOpen && !inline,
		onClose,
		initialFocusSelector: "[data-autofocus='true'], button[data-slot-btn='true']",
		enableEscape: true,
		enableFocusTrap: !inline,
	});

	if (!isOpen) return null;

	const isDoctorConflict =
		conflictType === "doctor" ||
		conflictType === "double_booking" ||
		/врач|доктор|одновремен|двойная запись/i.test(conflictMessage || "");

	const isChairConflict =
		conflictType === "chair" ||
		/кресло|кабинет/i.test(conflictMessage || "");

	const controls = (
		<SlotConflictControls
			conflictMessage={conflictMessage}
			isDoctorConflict={isDoctorConflict}
			patientName={patientName}
			doctorName={doctorName}
			currentChairName={currentChairName}
			onShiftMinutes={onShiftMinutes}
			shiftMinutesList={shiftMinutesList}
			alternativeChairs={alternativeChairs}
			onMoveToChair={onMoveToChair}
			suggestedSlots={suggestedSlots}
			onSelectSlot={onSelectSlot}
			onClose={onClose}
		/>
	);

	if (inline) {
		return (
			<SlotConflictInlineView
				isDoctorConflict={isDoctorConflict}
				isChairConflict={isChairConflict}
				onClose={onClose}
				onOverbook={onOverbook}
			>
				{controls}
			</SlotConflictInlineView>
		);
	}

	return (
		<SlotConflictDialogView
			modalRef={modalRef}
			isDoctorConflict={isDoctorConflict}
			isChairConflict={isChairConflict}
			onClose={onClose}
			onOverbook={onOverbook}
		>
			{controls}
		</SlotConflictDialogView>
	);
};
