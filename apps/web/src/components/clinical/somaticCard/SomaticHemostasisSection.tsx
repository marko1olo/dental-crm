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
			activeBg: "bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--ink)]",
			checkBg: "bg-[var(--warning)] border-[var(--warning)]",
		},
		{
			key: "takesAnticoagulants" as const,
			testId: "toggle-anticoagulants",
			title: "Антикоагулянты (Ксарелто, Эликвис, Варфарин) — риск кровотечения",
			label: "Антикоагулянты (Ксарелто)",
			activeBg: "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--ink)] shadow-xs",
			checkBg: "bg-[var(--danger)] border-[var(--danger)]",
		},
		{
			key: "takesBisphosphonates" as const,
			testId: "toggle-bisphosphonates",
			title: "Бисфосфонаты / деносумаб — риск остеонекроза челюсти (MRONJ)",
			label: "Бисфосфонаты (MRONJ)",
			activeBg: "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--ink)] shadow-xs",
			checkBg: "bg-[var(--danger)] border-[var(--danger)]",
		},
		{
			key: "hasPacemakerExs" as const,
			testId: "toggle-pacemaker",
			title: "Электрокардиостимулятор (ЭКС) — абсолютный запрет ультразвуковых скейлеров",
			label: "ЭКС (Запрет УЗ)",
			activeBg: "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--ink)] shadow-xs",
			checkBg: "bg-[var(--danger)] border-[var(--danger)]",
		},
	];

	return (
		<div className="space-y-2">
			<span className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
				<HeartPulse className="w-3.5 h-3.5 text-[var(--primary)]" />
				Гемостаз, кардиология и стоп-факторы
			</span>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
				{items.map((item) => {
					const isActive = Boolean(profile[item.key]);
					const inactiveBg =
						"bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]";

					return (
						<button
							key={item.key}
							type="button"
							data-testid={item.testId}
							onClick={() => onToggle(item.key)}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
								isActive ? item.activeBg : inactiveBg
							}`}
							title={item.title}
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									isActive ? `${item.checkBg} text-white` : "border-[var(--line-strong)]"
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
