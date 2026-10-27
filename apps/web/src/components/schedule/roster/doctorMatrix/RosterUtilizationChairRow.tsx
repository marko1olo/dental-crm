import React from "react";
import type { CabinetDefinition } from "../doctorShiftRosterPresets";
import { calculateChairUtilization, type DoctorShift } from "../doctorShiftRosterEngine";
import type { WeekDayItem } from "./types";

interface RosterUtilizationChairRowProps {
	cab: CabinetDefinition;
	chair: { id: string; name: string };
	weekDays: WeekDayItem[];
	shifts: DoctorShift[];
	sanitizedAppointments: Parameters<typeof calculateChairUtilization>[1];
	cabinets: CabinetDefinition[];
}

export const RosterUtilizationChairRow: React.FC<RosterUtilizationChairRowProps> = ({
	cab,
	chair,
	weekDays,
	shifts,
	sanitizedAppointments,
	cabinets,
}) => {
	return (
		<tr>
			<td className="roster-lane-header">
				<div>{cab.name}</div>
				<div style={{ color: "var(--teal, #0d9488)", fontSize: "0.75rem" }}>
					{chair.name}
				</div>
			</td>
			{weekDays.map((day) => {
				const metrics = calculateChairUtilization(
					shifts,
					sanitizedAppointments,
					day.dateIso,
					cabinets,
				);
				const chairMetric = metrics.find((m) => m.chairId === chair.id);
				const rate = chairMetric ? chairMetric.utilizationRatePercent : 0;
				const heat = chairMetric ? chairMetric.heatLevel : "empty";

				return (
					<td key={day.dateIso} style={{ textAlign: "center", verticalAlign: "middle" }}>
						<div className={`roster-heatmap-chip ${heat}`}>
							<span>{rate.toFixed(0)}%</span>
						</div>
						<div style={{ fontSize: "0.6875rem", color: "var(--muted, #64748b)", marginTop: "2px" }}>
							{chairMetric?.bookedAppointmentMinutes || 0} / {chairMetric?.totalShiftMinutes || 0} мин
						</div>
					</td>
				);
			})}
		</tr>
	);
};
