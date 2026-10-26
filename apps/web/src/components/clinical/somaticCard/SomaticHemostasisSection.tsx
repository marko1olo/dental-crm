import { Check, HeartPulse } from "lucide-react";
import React from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";
import { SomaticMedicationInputs } from "./SomaticMedicationInputs";

export interface SomaticHemostasisSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly setProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
	readonly onToggle: (key: keyof PatientClinicalSafetyProfile) => void;
}

export const SomaticHemostasisSection: React.FC<SomaticHemostasisSectionProps> = ({
	profile,
	setProfile,
	onToggle,
}) => {
	const items = [
		{
			key: "hasHypertension" as const,
			testId: "toggle-hypertension",
			title: "Гипертоническая болезнь / нестабильное АД",
			label: "Гипертоническая болезнь",
			activeBg: "bg-amber-50 dark:bg-amber-950/50 border-amber-400 text-amber-900 dark:text-amber-200",
			checkBg: "bg-amber-600 border-amber-600",
		},
		{
			key: "takesAnticoagulants" as const,
			testId: "toggle-anticoagulants",
			title: "Антикоагулянты (Ксарелто, Эликвис, Варфарин) — риск кровотечения",
			label: "Антикоагулянты (Ксарелто)",
			activeBg: "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs",
			checkBg: "bg-[#ef4444] border-[#ef4444]",
		},
		{
			key: "takesBisphosphonates" as const,
			testId: "toggle-bisphosphonates",
			title: "Бисфосфонаты / деносумаб — риск остеонекроза челюсти (MRONJ)",
			label: "Бисфосфонаты (MRONJ)",
			activeBg: "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs",
			checkBg: "bg-[#ef4444] border-[#ef4444]",
		},
		{
			key: "hasPacemakerExs" as const,
			testId: "toggle-pacemaker",
			title: "Электрокардиостимулятор (ЭКС) — абсолютный запрет ультразвуковых скейлеров",
			label: "ЭКС (Запрет УЗ)",
			activeBg: "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs",
			checkBg: "bg-[#ef4444] border-[#ef4444]",
		},
	];

	return (
		<div className="space-y-2">
			<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<HeartPulse className="w-3.5 h-3.5 text-blue-500" />
				Гемостаз, кардиология и стоп-факторы
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
				{items.map((item) => {
					const isActive = Boolean(profile[item.key]);
					const inactiveBg =
						"bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-amber-50/50";

					return (
						<button
							key={item.key}
							type="button"
							data-testid={item.testId}
							onClick={() => onToggle(item.key)}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								isActive ? item.activeBg : inactiveBg
							}`}
							title={item.title}
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									isActive ? `${item.checkBg} text-white` : "border-slate-300 dark:border-slate-600"
								}`}
							>
								{isActive ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">{item.label}</span>
						</button>
					);
				})}
			</div>

			<SomaticMedicationInputs profile={profile} setProfile={setProfile} />
		</div>
	);
};
