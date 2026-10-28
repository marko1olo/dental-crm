import React from "react";
import type { TargetSlotInfo } from "../waitlistTypes";

export interface WaitlistFilterBarProps {
	searchQuery: string;
	onSearchChange: (val: string) => void;
	targetSlot?: TargetSlotInfo | null;
	isSmartMatch: boolean;
	sameDoctorOnly: boolean;
	onSameDoctorOnlyChange: (val: boolean) => void;
	urgencyFilter: string;
	onUrgencyFilterChange: (val: string) => void;
}

export function WaitlistFilterBar({
	searchQuery,
	onSearchChange,
	targetSlot,
	isSmartMatch,
	sameDoctorOnly,
	onSameDoctorOnlyChange,
	urgencyFilter,
	onUrgencyFilterChange,
}: WaitlistFilterBarProps) {
	return (
		<div className="space-y-2 pb-1">
			<div className="relative">
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
					placeholder="Поиск по пациенту, телефону, врачу..."
					className="w-full h-10 pl-9 pr-3 text-xs rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] focus:outline-none focus:ring-1 focus:ring-[var(--teal,#0d9488)]"
					style={{ paddingLeft: "36px" }}
				/>
				<span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted,#64748b)]">🔍</span>
			</div>

			<div className="flex items-center gap-2 flex-wrap text-xs">
				{targetSlot?.doctorUserId && isSmartMatch && (
					<label className="flex items-center gap-1.5 cursor-pointer select-none bg-[var(--paper-subtle,#f1f5f9)] px-2.5 py-1 rounded-md text-[var(--text,#0f172a)]">
						<input
							type="checkbox"
							checked={sameDoctorOnly}
							onChange={(e) => onSameDoctorOnlyChange(e.target.checked)}
							className="rounded border-[var(--line,#cbd5e1)] text-[var(--teal,#0d9488)] focus:ring-0"
						/>
						<span>Только к этому врачу</span>
					</label>
				)}
				<select
					value={urgencyFilter}
					onChange={(e) => onUrgencyFilterChange(e.target.value)}
					className="h-7 text-xs rounded-md border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--text,#0f172a)] px-2 focus:ring-0"
				>
					<option value="all">Все приоритеты</option>
					<option value="urgent">Острая боль</option>
					<option value="treatment_plan">По плану лечения</option>
					<option value="hygiene">Профгигиена</option>
					<option value="routine">Плановые</option>
				</select>
			</div>
		</div>
	);
}
