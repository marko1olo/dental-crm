import { UserCheck, X } from "lucide-react";
import type React from "react";
import {
	ChairShiftDoctorSelector,
	type ChairShiftDoctorSelectorProps,
} from "./chairShift/ChairShiftDoctorSelector";
import {
	ChairShiftPresetsGrid,
	type ShiftPresetType,
} from "./chairShift/ChairShiftPresetsGrid";
import { ChairShiftSubstituteDrawer } from "./chairShift/ChairShiftSubstituteDrawer";
import type { ScheduleChair } from "./ScheduleFilterStrip";
import type { ChairDoctorShiftAssignment } from "./ScheduleGrid";

export interface ChairShiftPopoverProps extends ChairShiftDoctorSelectorProps {
	popoverRef: React.RefObject<HTMLDivElement | null>;
	onClose: () => void;
	handleAssignShift: (chair: ScheduleChair, preset: ShiftPresetType) => void;
	handleUnassignShift: (chair: ScheduleChair) => void;
	handleDuplicateChair: (chair: ScheduleChair) => void;
	isSubstituteOpen: Record<string, boolean>;
	setIsSubstituteOpen: React.Dispatch<
		React.SetStateAction<Record<string, boolean>>
	>;
	handleQuickSubstituteDoctor: (
		chair: ScheduleChair,
		substituteDocId: string,
	) => void;
}

export function ChairShiftPopover({
	chair,
	popoverRef,
	onClose,
	doctors,
	popoverSelectedDocId,
	setPopoverSelectedDocId,
	chairDoctorAssignments,
	dateKey,
	onAssignChairDoctor,
	handleAssignShift,
	handleUnassignShift,
	handleDuplicateChair,
	isSubstituteOpen,
	setIsSubstituteOpen,
	handleQuickSubstituteDoctor,
}: ChairShiftPopoverProps) {
	return (
		<div
			ref={popoverRef}
			className="absolute top-full mt-1.5 left-0 z-50 w-72 p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-xl text-[var(--ink)] flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100 cursor-default"
			data-testid={`chair-view-shift-popover-${chair.id}`}
			onClick={(e) => e.stopPropagation()}
		>
			<div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
				<div className="flex items-center gap-1.5 font-bold text-xs">
					<UserCheck size={14} className="text-[var(--teal)]" />
					<span>Врач на кресле «{chair.name}»</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="p-1.5 rounded-lg text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
					aria-label="Закрыть"
				>
					<X size={14} />
				</button>
			</div>

			<ChairShiftDoctorSelector
				chair={chair}
				doctors={doctors}
				popoverSelectedDocId={popoverSelectedDocId}
				setPopoverSelectedDocId={setPopoverSelectedDocId}
				chairDoctorAssignments={chairDoctorAssignments}
				dateKey={dateKey}
				onAssignChairDoctor={onAssignChairDoctor}
			/>

			<ChairShiftPresetsGrid
				chair={chair}
				handleAssignShift={handleAssignShift}
			/>

			<ChairShiftSubstituteDrawer
				chair={chair}
				chairDoctorAssignments={chairDoctorAssignments}
				handleUnassignShift={handleUnassignShift}
				handleDuplicateChair={handleDuplicateChair}
				isSubstituteOpen={isSubstituteOpen}
				setIsSubstituteOpen={setIsSubstituteOpen}
				doctors={doctors}
				handleQuickSubstituteDoctor={handleQuickSubstituteDoctor}
			/>
		</div>
	);
}
