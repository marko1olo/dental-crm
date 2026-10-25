import { Check, Clock } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import { DURATION_PRESETS, useDoctorPreferencesStore } from "../../../store/doctorPreferencesStore";

export function DoctorVisitDurationCard() {
	const defaultVisitDuration = useDoctorPreferencesStore((s) => s.preferences.defaultVisitDuration);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	const handleDurationSelect = (mins: 15 | 30 | 45 | 60 | 90 | 120) => {
		updatePreferences({ defaultVisitDuration: mins });
		showToast(`Длительность приёма по умолчанию: ${mins} мин`, "success");
	};

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Clock size={15} className="text-[var(--teal)]" />
					<span>Длительность приёма по умолчанию</span>
				</label>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Подставляется в расписание и бронирование
				</span>
			</div>
			<div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
				{DURATION_PRESETS.map((mins) => {
					const isSelected = defaultVisitDuration === mins;
					return (
						<button
							key={mins}
							type="button"
							onClick={() => handleDurationSelect(mins)}
							className={`min-h-[44px] sm:min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border ${
								isSelected
									? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-xs"
									: "bg-[var(--paper-card)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--line-strong)]"
							}`}
						>
							<span>{mins} мин</span>
							{isSelected && <Check size={13} className="stroke-[3]" />}
						</button>
					);
				})}
			</div>
		</div>
	);
}
