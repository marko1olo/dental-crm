import React from "react";
import type { CabinetDefinition, StaffMember } from "../doctorShiftRosterPresets";
import type { DoctorShift } from "../doctorShiftRosterEngine";
import type { ActivePopoverCell, FlatChairItem, WeekDayItem } from "./types";

interface RosterDoctorDayCellProps {
	day: WeekDayItem;
	staff: StaffMember;
	dayShifts: DoctorShift[];
	cabinets: CabinetDefinition[];
	flatChairsList: FlatChairItem[];
	onCellClick: (cell: ActivePopoverCell) => void;
}

export const RosterDoctorDayCell: React.FC<RosterDoctorDayCellProps> = ({
	day,
	staff,
	dayShifts,
	cabinets,
	flatChairsList,
	onCellClick,
}) => {
	const docChair = staff.preferredChairId || flatChairsList[0]?.chairId || "";
	const cabForChair =
		cabinets.find((c) => c.chairs.some((ch) => ch.id === docChair))?.id ||
		cabinets[0]?.id ||
		"";

	return (
		<td
			onClick={() =>
				onCellClick({
					dateIso: day.dateIso,
					cabinetId: cabForChair,
					chairId: docChair,
					doctorId: staff.id,
				})
			}
			style={{ cursor: "pointer" }}
		>
			{dayShifts.map((s) => (
				<div
					key={s.id}
					className="roster-shift-pill"
					style={{
						background: "var(--paper-soft, #f8fafc)",
						border: "1px solid var(--line, #cbd5e1)",
						minHeight: "44px",
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						cursor: "pointer",
					}}
					onClick={(e) => {
						e.stopPropagation();
						const cabId =
							cabinets.find((c) => c.chairs.some((ch) => ch.id === s.chairId))?.id ||
							cabinets[0]?.id ||
							"";
						onCellClick({
							dateIso: day.dateIso,
							cabinetId: cabId,
							chairId: s.chairId,
							doctorId: staff.id,
						});
					}}
					title="Кликните для быстрой смены или выбора пресета"
				>
					<div style={{ fontWeight: 700, fontSize: "0.75rem" }}>
						{s.startTime}–{s.endTime}
					</div>
					<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)" }}>
						{s.chairId} • {s.durationHours}ч
					</div>
				</div>
			))}
			{dayShifts.length === 0 && (
				<button
					type="button"
					className="roster-cell-add-btn"
					style={{ minHeight: "44px", width: "100%", marginTop: "0.25rem" }}
					onClick={(e) => {
						e.stopPropagation();
						onCellClick({
							dateIso: day.dateIso,
							cabinetId: cabForChair,
							chairId: docChair,
							doctorId: staff.id,
						});
					}}
					title={`Назначить смену: ${staff.fullName}`}
				>
					+ Смена
				</button>
			)}
		</td>
	);
};
