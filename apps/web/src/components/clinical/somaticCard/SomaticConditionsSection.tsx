import { Activity, Check } from "lucide-react";
import React from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticConditionsSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly setProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	readonly onToggle: (key: keyof PatientClinicalSafetyProfile) => void;
}

export const SomaticConditionsSection: React.FC<SomaticConditionsSectionProps> = ({
	profile,
	setProfile,
	onToggle,
}) => {
	const isPregnancyActive = profile.pregnancyTrimester !== "none";

	return (
		<div className="space-y-2">
			<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Activity className="w-3.5 h-3.5 text-teal-600" />
				Диабет, астма, беременность
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
				<button
					type="button"
					data-testid="toggle-diabetes"
					onClick={() => onToggle("hasDiabetesMellitus")}
					className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
						profile.hasDiabetesMellitus
							? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
					}`}
					title="Сахарный диабет (риск замедленной эпителизации и инфекций)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasDiabetesMellitus
								? "bg-amber-600 border-amber-600 text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasDiabetesMellitus ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Сахарный диабет</span>
				</button>

				<button
					type="button"
					data-testid="toggle-asthma"
					onClick={() => onToggle("hasBronchialAsthma")}
					className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
						profile.hasBronchialAsthma
							? "bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-900 dark:text-amber-200"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50"
					}`}
					title="Бронхиальная астма (наличие ингалятора у пациента обязательно)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasBronchialAsthma
								? "bg-amber-600 border-amber-600 text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasBronchialAsthma ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Бронхиальная астма</span>
				</button>

				<button
					type="button"
					data-testid="toggle-pregnancy"
					onClick={() => {
						setProfile((prev) => ({
							...prev,
							pregnancyTrimester:
								prev.pregnancyTrimester === "none" ? "trimester_2" : "none",
						}));
					}}
					className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
						isPregnancyActive
							? "bg-pink-50 dark:bg-pink-950/50 border-pink-400 text-pink-900 dark:text-pink-200"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-pink-50/50"
					}`}
					title="Беременность (ограничения рентгенографии, местная анестезия без адреналина)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							isPregnancyActive
								? "bg-pink-600 border-pink-600 text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{isPregnancyActive ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Беременность (2-й триместр)</span>
				</button>
			</div>
		</div>
	);
};
