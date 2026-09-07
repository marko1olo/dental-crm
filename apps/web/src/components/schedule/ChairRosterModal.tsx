import React from "react";
import {
	DoctorShiftRosterModal,
	type DoctorShiftRosterModalProps,
	type DoctorShift,
	type StaffMember,
	type CabinetDefinition,
	type ShiftArchetypeId,
	getMondayOfWeekIso,
} from "./roster/DoctorShiftRosterModal";
import {
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
} from "./roster/doctorShiftRosterPresets";

export interface ChairRosterModalProps extends DoctorShiftRosterModalProps {
	/**
	 * Focus on a specific chair ID when opening the roster modal
	 */
	focusedChairId?: string | null;
}

/**
 * ChairRosterModal — StomX / IDENT parity weekly chair-to-doctor shift roster.
 * Supports:
 * - Weekly template (Mon–Sun)
 * - Shift 1 (morning 08:00–14:00) -> Doctor X
 * - Shift 2 (evening 14:00–20:00) -> Doctor Y
 * - Full day (08:00–20:00) -> Doctor Z
 * - Chair duty doctor auto-population in schedule grid
 * - Mandate 8n (Solo doctor 1-chair default) & Mandate 8e (0 disabled buttons)
 */
export const ChairRosterModal: React.FC<ChairRosterModalProps> = (props) => {
	const { focusedChairId, ...rosterProps } = props;

	return <DoctorShiftRosterModal {...rosterProps} />;
};

export {
	DoctorShiftRosterModal,
	getMondayOfWeekIso,
	DEFAULT_CLINIC_STAFF,
	CLINIC_CABINETS_CATALOG,
};
export type {
	DoctorShiftRosterModalProps,
	DoctorShift,
	StaffMember,
	CabinetDefinition,
	ShiftArchetypeId,
};

export default ChairRosterModal;
