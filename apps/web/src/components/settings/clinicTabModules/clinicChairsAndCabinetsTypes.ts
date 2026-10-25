import type React from "react";
import type { Chair, DentalSpecialty, StaffMember, StaffRole } from "@dental/shared";

export interface ClinicChairsAndCabinetsSectionProps {
	// Staff Props
	typedStaffMembers: StaffMember[];
	newStaffName?: string;
	setNewStaffName?: (name: string) => void;
	newStaffRole?: StaffRole;
	setNewStaffRole?: (role: StaffRole) => void;
	newStaffSpecialty?: DentalSpecialty;
	setNewStaffSpecialty?: (spec: DentalSpecialty) => void;
	handleAddStaff: () => void;
	staffRoleLabels?: Record<string, string>;
	specialtyLabels?: Record<string, string>;
	onNavigateToStaffTab?: () => void;

	// Chairs Props
	typedChairs: Chair[];
	newChairName?: string;
	setNewChairName?: (name: string) => void;
	handleAddChair: (overrideName?: string) => void;
	newChairReadyToCreate?: boolean;
	newChairHasXraySensor?: boolean;
	setNewChairHasXraySensor?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasMicroscope?: boolean;
	setNewChairHasMicroscope?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	newChairHasSurgeryKit?: boolean;
	setNewChairHasSurgeryKit?: React.Dispatch<React.SetStateAction<boolean>> | ((val: any) => void);
	chairScheduleDrafts?: Record<string, any>;
	chairScheduleSaveStates?: Record<string, any>;
	chairScheduleDirtyIds?: Set<string>;
	chairScheduleSavingId?: string | null;
	staffScheduleDraftFromWorkingHours?: (h: any) => any;
	updateChairScheduleDraft?: (chairId: string, patch: any) => void;
	toggleChairWorkingDay?: (chairId: string, day: number) => void;
	updateChairScheduleDay?: (chairId: string, day: number, hours: any) => void;
	saveChairSchedule?: (chairId: string) => Promise<void> | void;
	deleteChair?: (chairId: string) => Promise<void> | void;
	typedWeekdayOptions?: Array<{ value: number; label: string }>;
	setChairPresetDays?: (chairId: string, days: number[]) => void;
	applyChairHoursToAll?: (chairId: string) => void;
	showToast?: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}
