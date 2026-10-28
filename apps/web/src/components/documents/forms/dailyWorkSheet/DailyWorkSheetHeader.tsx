import React from "react";
import type { DailyWorkSheetHeaderProps } from "./DailyWorkSheetTypes";

export const DailyWorkSheetHeader: React.FC<DailyWorkSheetHeaderProps> = ({
	workDate,
	setWorkDate,
	doctorName,
	setDoctorName,
	disabled = false,
}) => {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Дата смены</label>
				<input
					type="date"
					className="form-control w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2.5 py-1.5 text-xs"
					value={workDate}
					disabled={disabled}
					onChange={(e) => setWorkDate(e.target.value)}
				/>
			</div>
			<div>
				<label className="block text-xs font-semibold text-[var(--ink)] mb-1">Врач-стоматолог</label>
				<input
					type="text"
					className="form-control w-full rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] px-2.5 py-1.5 text-xs"
					placeholder="ФИО врача"
					value={doctorName}
					disabled={disabled}
					onChange={(e) => setDoctorName(e.target.value)}
				/>
			</div>
		</div>
	);
};
