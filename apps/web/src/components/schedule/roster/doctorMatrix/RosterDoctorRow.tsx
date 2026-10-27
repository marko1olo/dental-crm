import React from "react";
import { MEDICAL_STAFF_ROLES, type CabinetDefinition, type StaffMember } from "../doctorShiftRosterPresets";
import type { DoctorShift } from "../doctorShiftRosterEngine";
import type { ActivePopoverCell, FlatChairItem, WeekDayItem } from "./types";
import { RosterDoctorDayCell } from "./RosterDoctorDayCell";

interface RosterDoctorRowProps {
	staff: StaffMember;
	shifts: DoctorShift[];
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	weekEndDateIso: string;
	cabinets: CabinetDefinition[];
	flatChairsList: FlatChairItem[];
	onCellClick: (cell: ActivePopoverCell) => void;
}

export const RosterDoctorRow: React.FC<RosterDoctorRowProps> = ({
	staff,
	shifts,
	weekDays,
	weekStartDateIso,
	weekEndDateIso,
	cabinets,
	flatChairsList,
	onCellClick,
}) => {
	const userShifts = shifts.filter(
		(s) =>
			(s.doctorId === staff.id || s.assistantId === staff.id) &&
			s.dateIso >= weekStartDateIso &&
			s.dateIso <= weekEndDateIso &&
			s.status !== "cancelled" &&
			s.durationHours > 0,
	);
	const totalWeekHours = userShifts.reduce((sum, s) => sum + s.durationHours, 0);
	const isOverLimit = totalWeekHours > staff.weeklyHourLimit;

	return (
		<tr>
			<td className="roster-lane-header">
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<div
						style={{
							width: "10px",
							height: "10px",
							borderRadius: "50%",
							backgroundColor: staff.avatarColor,
						}}
					/>
					<div style={{ fontWeight: 700 }}>{staff.fullName}</div>
				</div>
				<div style={{ fontSize: "0.75rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
					Таб. № {staff.tabNumber} • {MEDICAL_STAFF_ROLES[staff.role]?.nameRu}
				</div>
			</td>
			{weekDays.map((day) => (
				<RosterDoctorDayCell
					key={day.dateIso}
					day={day}
					staff={staff}
					dayShifts={userShifts.filter((s) => s.dateIso === day.dateIso)}
					cabinets={cabinets}
					flatChairsList={flatChairsList}
					onCellClick={onCellClick}
				/>
			))}
			<td style={{ verticalAlign: "middle", padding: "0.75rem" }}>
				<div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", fontWeight: 700 }}>
					<span>{totalWeekHours.toFixed(1)} ч</span>
					<span style={{ color: isOverLimit ? "#ef4444" : "var(--muted, #64748b)" }}>
						макс {staff.weeklyHourLimit} ч
					</span>
				</div>
				<div style={{ height: "6px", background: "var(--line, #334155)", borderRadius: "9999px", overflow: "hidden", marginTop: "4px" }}>
					<div
						style={{
							width: `${Math.min(100, (totalWeekHours / staff.weeklyHourLimit) * 100)}%`,
							height: "100%",
							backgroundColor: isOverLimit ? "#ef4444" : "var(--teal, #0d9488)",
						}}
					/>
				</div>
			</td>
		</tr>
	);
};
