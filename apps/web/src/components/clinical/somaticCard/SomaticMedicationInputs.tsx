import React, { useId } from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticMedicationInputsProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly setProfile: React.Dispatch<React.SetStateAction<PatientClinicalSafetyProfile>>;
}

export const SomaticMedicationInputs: React.FC<SomaticMedicationInputsProps> = ({
	profile,
	setProfile,
}) => {
	const anticoagulantInputId = useId();
	const bisphosphonateInputId = useId();

	if (!profile.takesAnticoagulants && !profile.takesBisphosphonates) {
		return null;
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
			{profile.takesAnticoagulants && (
				<div className="flex flex-col gap-1">
					<label
						htmlFor={anticoagulantInputId}
						className="text-xs font-medium text-[var(--ink)]"
					>
						Препарат антикоагулянта и МНО (INR):
					</label>
					<input
						id={anticoagulantInputId}
						type="text"
						value={profile.anticoagulantName || ""}
						onChange={(e) =>
							setProfile((prev) => ({ ...prev, anticoagulantName: e.target.value }))
						}
						placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
						className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 sm:px-2.5 text-sm sm:text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
					/>
				</div>
			)}
			{profile.takesBisphosphonates && (
				<div className="flex flex-col gap-1">
					<label
						htmlFor={bisphosphonateInputId}
						className="text-xs font-medium text-[var(--ink)]"
					>
						Препарат бисфосфонатов (MRONJ):
					</label>
					<input
						id={bisphosphonateInputId}
						type="text"
						value={profile.bisphosphonateName || ""}
						onChange={(e) =>
							setProfile((prev) => ({ ...prev, bisphosphonateName: e.target.value }))
						}
						placeholder="Акласта 5 мг, Пролиа, Фосамакс..."
						className="min-h-[44px] sm:min-h-[32px] h-11 sm:h-8 px-3 sm:px-2.5 text-sm sm:text-xs rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
					/>
				</div>
			)}
		</div>
	);
};
