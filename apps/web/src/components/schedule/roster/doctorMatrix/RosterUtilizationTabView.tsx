import React from "react";
import type { CabinetDefinition } from "../doctorShiftRosterPresets";
import type { calculateChairUtilization, DoctorShift } from "../doctorShiftRosterEngine";
import type { WeekDayItem } from "./types";
import { RosterUtilizationChairRow } from "./RosterUtilizationChairRow";

interface RosterUtilizationTabViewProps {
	weekDays: WeekDayItem[];
	weekStartDateIso: string;
	cabinets: CabinetDefinition[];
	shifts: DoctorShift[];
	sanitizedAppointments: Parameters<typeof calculateChairUtilization>[1];
}

export const RosterUtilizationTabView: React.FC<RosterUtilizationTabViewProps> = ({
	weekDays,
	weekStartDateIso,
	cabinets,
	shifts,
	sanitizedAppointments,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			<div>
				<h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
					Тепловая карта загрузки кресел (Chair Utilization Matrix)
				</h3>
				<span style={{ fontSize: "0.8125rem", color: "var(--muted, #64748b)" }}>
					Формула: Занятые минуты приемов / Доступные минуты смен x 100%
				</span>
			</div>

			<table className="roster-grid-table">
				<thead>
					<tr>
						<th style={{ width: "15rem" }}>Кабинет / Кресло</th>
						{weekDays.map((d) => (
							<th key={d.dateIso} className={d.isWeekend ? "is-weekend" : ""}>
								{d.dayName}, {d.dayNumber}.{weekStartDateIso.substring(5, 7)}
							</th>
						))}
					</tr>
				</thead>
				<tbody>
					{cabinets.length === 0 ? (
						<tr>
							<td colSpan={weekDays.length + 1} style={{ textAlign: "center", padding: "3rem 1rem" }}>
								<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
									<div style={{ color: "var(--muted, #64748b)", fontSize: "0.875rem" }}>
										Для расчета загрузки кресел добавьте хотя бы одно рабочее место.
									</div>
									<a
										href="/settings?tab=clinic"
										className="roster-btn roster-btn-secondary"
										style={{
											textDecoration: "none",
											display: "inline-flex",
											alignItems: "center",
											gap: "0.5rem",
											minHeight: "36px",
										}}
									>
										+ Настроить кресла
									</a>
								</div>
							</td>
						</tr>
					) : (
						cabinets.map((cab) =>
							cab.chairs.map((chair) => (
								<RosterUtilizationChairRow
									key={chair.id}
									cab={cab}
									chair={chair}
									weekDays={weekDays}
									shifts={shifts}
									sanitizedAppointments={sanitizedAppointments}
									cabinets={cabinets}
								/>
							)),
						)
					)}
				</tbody>
			</table>
		</div>
	);
};
