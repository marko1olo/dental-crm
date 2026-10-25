import { Check, Sparkles } from "lucide-react";
import React from "react";
import { showToast } from "../../GlobalToast";
import {
	ODONTOGRAM_NOTATIONS,
	useDoctorPreferencesStore,
	type DefaultDentition,
} from "../../../store/doctorPreferencesStore";

const DENTITION_OPTIONS = [
	{ key: "adult", title: "Постоянный прикус (32 зуба, 11–48)" },
	{ key: "pediatric", title: "Молочный прикус (20 зубов, 51–85)" },
	{ key: "mixed", title: "Сменный прикус (детский / подростковый)" },
] as const;

export function DoctorOdontogramSettingsCard() {
	const preferences = useDoctorPreferencesStore((s) => s.preferences);
	const updatePreferences = useDoctorPreferencesStore((s) => s.updatePreferences);

	return (
		<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3">
			<div className="flex items-center justify-between">
				<label className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
					<Sparkles size={15} className="text-[var(--teal)]" />
					<span>Зубная формула и одонтограмма</span>
				</label>
				<span className="text-[11px] font-medium text-[var(--muted)]">
					Стандарт нумерации в карте пациента
				</span>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<div className="space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)] block">
						Система нумерации зубов
					</span>
					<div className="space-y-1.5">
						{ODONTOGRAM_NOTATIONS.map((n) => {
							const isSelected = preferences.odontogramNotation === n.key;
							return (
								<button
									key={n.key}
									type="button"
									onClick={() => {
										updatePreferences({ odontogramNotation: n.key });
										showToast(`Нумерация: ${n.title}`, "info");
									}}
									className={`w-full p-2.5 rounded-xl text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[34px] cursor-pointer ${
										isSelected
											? "bg-[var(--paper-card)] border-[var(--teal)] font-bold text-[var(--ink)] shadow-2xs"
											: "bg-[var(--paper-card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
									}`}
								>
									<div className="flex items-center gap-2">
										<span>{n.title}</span>
										<span className="text-[10px] text-[var(--muted)] font-mono">({n.sample})</span>
									</div>
									{isSelected && <Check size={14} className="text-[var(--teal)] stroke-[3]" />}
								</button>
							);
						})}
					</div>
				</div>

				<div className="space-y-1">
					<span className="text-[11px] font-bold text-[var(--muted)] block">
						Тип зубного ряда по умолчанию
					</span>
					<div className="space-y-1.5">
						{DENTITION_OPTIONS.map((d) => {
							const isSelected = preferences.defaultDentition === d.key;
							return (
								<button
									key={d.key}
									type="button"
									onClick={() => {
										updatePreferences({ defaultDentition: d.key as DefaultDentition });
										showToast(`Прикус: ${d.title}`, "info");
									}}
									className={`w-full p-2.5 rounded-xl text-left border text-xs transition-all flex items-center justify-between min-h-[44px] sm:min-h-[34px] cursor-pointer ${
										isSelected
											? "bg-[var(--paper-card)] border-[var(--teal)] font-bold text-[var(--ink)] shadow-2xs"
											: "bg-[var(--paper-card)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]"
									}`}
								>
									<span>{d.title}</span>
									{isSelected && <Check size={14} className="text-[var(--teal)] stroke-[3]" />}
								</button>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
}
