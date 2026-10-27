import type React from "react";
import type { ReactElement } from "react";
import { CabinetBranchSelector } from "./CabinetBranchSelector";
import { CabinetChairChips } from "./CabinetChairChips";
import { DoctorFilterDropdown } from "./DoctorFilterDropdown";
import type {
	ScheduleBranch,
	ScheduleChair,
	ScheduleStaffMember,
	ShiftQueueCounts,
} from "./types";

export interface CabinetFilterBarProps {
	activeScheduleFilterCount: number;
	scheduleStatusFilter?: string | null | undefined;
	resetScheduleFilters: () => void;
	setScheduleStatusFilter?: ((status: string | null) => void) | undefined;
	queueCounts?: ShiftQueueCounts | undefined;
	hasMultipleBranches: boolean;
	selectedBranchId?: string | null | undefined;
	onSelectBranch?: ((branchId: string | null) => void) | undefined;
	activeBranches: ScheduleBranch[];
	hasMultipleChairs: boolean;
	myChair: ScheduleChair | null;
	isMyChairActive: boolean;
	handleSelectMyChair: () => void;
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null | undefined;
	setScheduleDoctorFilterId?: ((id: string | null) => void) | undefined;
	displayChairs: readonly ScheduleChair[];
	scheduleChairFilterId?: string | null | undefined;
	setScheduleChairFilterId?: ((id: string | null) => void) | undefined;
	handleOpenAddChair: () => void;
	activeFilterSummary?: React.ReactNode | undefined;
}

export function CabinetFilterBar(props: CabinetFilterBarProps): ReactElement {
	const {
		hasMultipleBranches,
		selectedBranchId,
		onSelectBranch,
		activeBranches,
		hasMultipleChairs,
		myChair,
		isMyChairActive,
		handleSelectMyChair,
		hasMultipleDoctors,
		activeDoctors,
		scheduleDoctorFilterId,
		setScheduleDoctorFilterId,
		displayChairs,
		scheduleChairFilterId,
		setScheduleChairFilterId,
		handleOpenAddChair,
		activeFilterSummary,
	} = props;

	return (
		<div
			className="schedule-filter-chips dente-filter-chips hidden sm:flex flex-1 items-center gap-1.5 overflow-x-auto whitespace-nowrap flex-nowrap scrollbar-none py-0.5 min-w-0 px-2"
			onWheel={(e) => {
				if (e.deltaY !== 0) {
					e.currentTarget.scrollLeft += e.deltaY;
				}
			}}
		>
			<CabinetBranchSelector
				hasMultipleBranches={hasMultipleBranches}
				selectedBranchId={selectedBranchId}
				onSelectBranch={onSelectBranch}
				activeBranches={activeBranches}
				hasMultipleChairs={hasMultipleChairs}
				myChair={myChair}
				isMyChairActive={isMyChairActive}
				handleSelectMyChair={handleSelectMyChair}
			/>

			<DoctorFilterDropdown
				hasMultipleDoctors={hasMultipleDoctors}
				activeDoctors={activeDoctors}
				scheduleDoctorFilterId={scheduleDoctorFilterId ?? null}
				setScheduleDoctorFilterId={setScheduleDoctorFilterId ?? (() => {})}
			/>

			<CabinetChairChips
				hasMultipleChairs={hasMultipleChairs}
				displayChairs={displayChairs}
				scheduleChairFilterId={scheduleChairFilterId}
				setScheduleChairFilterId={setScheduleChairFilterId}
				handleOpenAddChair={handleOpenAddChair}
			/>

			{activeFilterSummary}
		</div>
	);
}
