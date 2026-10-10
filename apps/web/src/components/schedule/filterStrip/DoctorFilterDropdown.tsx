import type React from "react";
import type { ReactElement } from "react";
import { formatDoctorShortName } from "../ScheduleGrid";
import type { ScheduleStaffMember } from "./types";

export interface DoctorFilterDropdownProps {
	hasMultipleDoctors: boolean;
	activeDoctors: ScheduleStaffMember[];
	scheduleDoctorFilterId?: string | null;
	setScheduleDoctorFilterId?: (id: string | null) => void;
}

export function DoctorFilterDropdown({
	hasMultipleDoctors,
	activeDoctors,
	scheduleDoctorFilterId,
	setScheduleDoctorFilterId,
}: DoctorFilterDropdownProps): ReactElement | null {
	if (!hasMultipleDoctors || activeDoctors.length === 0 || !setScheduleDoctorFilterId) {
		return null;
	}

	return (
		<>
			{activeDoctors.map((member) => {
				const rawName = member?.fullName || "Врач";
				const formattedShort = formatDoctorShortName(rawName) || rawName;

				return (
					<button
						key={member.id}
						type="button"
						className={`quick-chip dente-filter-chip schedule-doctor-chip h-8 min-h-[32px] max-h-8 rounded-lg px-2.5 text-[12.5px] ${scheduleDoctorFilterId === member.id ? "active font-semibold" : ""} shrink-0 flex-shrink-0 cursor-pointer inline-flex items-center justify-center select-none`}
						style={{ whiteSpace: "nowrap", flexShrink: 0 }}
						onClick={() =>
							setScheduleDoctorFilterId(
								scheduleDoctorFilterId === member.id ? null : member.id,
							)
						}
						title={`Фильтр по врачу: ${member?.fullName || "Врач"}`}
					>
						<span className="shrink-0 flex-shrink-0 whitespace-nowrap min-w-max font-medium">
							{formattedShort}
						</span>
					</button>
				);
			})}
		</>
	);
}
