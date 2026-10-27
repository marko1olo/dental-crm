import React from "react";
import type { CabinetDefinition, StaffMember } from "../doctorShiftRosterPresets";
import type { DoctorShift } from "../doctorShiftRosterEngine";
import type { ActivePopoverCell, FlatChairItem, WeekDayItem } from "./types";
import { RosterDoctorRow } from "./RosterDoctorRow";

interface RosterDoctorsTabViewProps {
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	weekEndDateIso: string;
	cabinets: CabinetDefinition[];
	staffList: StaffMember[];
	shifts: DoctorShift[];
	flatChairsList: FlatChairItem[];
	onCellClick: (cell: ActivePopoverCell) => void;
}

export const RosterDoctorsTabView: React.FC<RosterDoctorsTabViewProps> = ({
	weekDays,
	weekStartDateIso,
	weekEndDateIso,
	cabinets,
	staffList,
	shifts,
	flatChairsList,
	onCellClick,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<table className="roster-grid-table">
				<thead>
					<tr>
						<th style={{ width: "16rem" }}>Сотрудник / Должность</th>
						{weekDays.map((d) => (
							<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
								{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
							</th>
						))}
						<th style={{ width: "10rem" }}>Неделя / Норма (33 ч)</th>
					</tr>
				</thead>
				<tbody>
					{staffList.length === 0 ? (
						<tr>
							<td colSpan={weekDays.length + 2} style={{ textAlign: "center", padding: "3rem 1rem" }}>
								<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem" }}>
										В штате клиники пока нет сотрудников.
									</div>
									<a
										href="/settings?tab=staff"
										className="roster-btn roster-btn-secondary"
										style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem", minHeight: "36px" }}
									>
										+ Добавить сотрудника в штат
									</a>
								</div>
							</td>
						</tr>
					) : (
						staffList.map((staff) => (
							<RosterDoctorRow
								key={staff.id}
								staff={staff}
								shifts={shifts}
								weekDays={weekDays}
								weekStartDateIso={weekStartDateIso}
								weekEndDateIso={weekEndDateIso}
								cabinets={cabinets}
								flatChairsList={flatChairsList}
								onCellClick={onCellClick}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
