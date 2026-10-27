/**
 * rosterOperationsTypes.ts — Interfaces and parameters for doctor shift roster operations.
 */

import type { CabinetDefinition, StaffMember } from "../doctorShiftRosterPresets";
import type { DoctorShift } from "../doctorShiftRosterEngine";

export interface EmployeeInfo {
	readonly id: string;
	readonly tabNumber: string;
	readonly name: string;
	readonly positionRu: string;
	readonly departmentRu: string;
	readonly defaultShiftHours: number;
}

export interface UseDoctorShiftRosterOperationsParams {
	initialShifts?: DoctorShift[] | undefined;
	staffList?: StaffMember[] | undefined;
	cabinets?: CabinetDefinition[] | undefined;
	appointments?:
		| Array<{
				chairId: string;
				startsAt: string;
				endsAt: string;
				status?: string | undefined;
		  }>
		| undefined;
	clinicName?: string | undefined;
	onSave?: ((shifts: DoctorShift[]) => Promise<void> | void) | undefined;
	onClose: () => void;
	initialEditingShift?: Partial<DoctorShift> | null | undefined;
	currentDate?: string | undefined;
	weekStartDateIso?: string | undefined;
}
