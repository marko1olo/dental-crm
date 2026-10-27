import React from "react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";

export interface RiskFactorMedicationsInputProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly anticoagulantInputId: string;
	readonly bisphosphonateInputId: string;
	readonly onUpdateField: <K extends keyof PatientClinicalSafetyProfile>(
		key: K,
		value: PatientClinicalSafetyProfile[K],
	) => void;
}

export const RiskFactorMedicationsInput: React.FC<RiskFactorMedicationsInputProps> = ({
	profile,
	anticoagulantInputId,
	bisphosphonateInputId,
	onUpdateField,
}) => {
	if (!profile.takesAnticoagulants && !profile.takesBisphosphonates) return null;

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/60 border border-[var(--line,#e2e8f0)] dark:border-slate-700 mt-2">
			{profile.takesAnticoagulants && (
				<div className="flex flex-col gap-1">
					<label htmlFor={anticoagulantInputId} className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">
						Препарат антикоагулянта и МНО (INR):
					</label>
					<input
						id={anticoagulantInputId}
						type="text"
						value={profile.anticoagulantName || ""}
						onChange={(e) => onUpdateField("anticoagulantName", e.target.value)}
						placeholder="Варфарин (МНО 2.1), Ксарелто 20 мг..."
						className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
					/>
				</div>
			)}
			{profile.takesBisphosphonates && (
				<div className="flex flex-col gap-1">
					<label htmlFor={bisphosphonateInputId} className="text-[11px] font-bold text-[var(--ink,#0f172a)] dark:text-slate-200">
						Препарат бисфосфонатной терапии (MRONJ):
					</label>
					<input
						id={bisphosphonateInputId}
						type="text"
						value={profile.bisphosphonateName || ""}
						onChange={(e) => onUpdateField("bisphosphonateName", e.target.value)}
						placeholder="Акласта 5 мг/год, Пролиа, Фосамакс..."
						className="h-8 px-2.5 text-xs rounded-lg border border-[var(--line,#e2e8f0)] dark:border-slate-700 bg-[var(--paper,#ffffff)] dark:bg-slate-900 text-[var(--ink,#0f172a)] dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
					/>
				</div>
			)}
		</div>
	);
};
