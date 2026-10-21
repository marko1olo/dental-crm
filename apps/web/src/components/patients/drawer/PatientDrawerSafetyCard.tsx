/**
 * apps/web/src/components/patients/drawer/PatientDrawerSafetyCard.tsx
 * Somatic status and allergy alert badges for patient drawer.
 * Mandate 8b: strictly <= 120 lines.
 */

import { HeartPulse, ShieldAlert, ShieldCheck } from "lucide-react";
import React from "react";
import type { PatientClinicalSafetyProfile } from "../safetyMath";

export interface PatientDrawerSafetyCardProps {
	readonly effectiveSafety: PatientClinicalSafetyProfile;
	readonly isPhysiologicalNorm: boolean;
	readonly onOpenAnamnesis?: (() => void) | undefined;
}

export const PatientDrawerSafetyCard: React.FC<PatientDrawerSafetyCardProps> =
	React.memo(function PatientDrawerSafetyCard({
		effectiveSafety,
		isPhysiologicalNorm,
		onOpenAnamnesis,
	}) {
		return (
			<div className="p-4 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-2.5 shadow-2xs">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
						<HeartPulse className="w-4 h-4 text-[var(--teal)]" />
						<span>Клиническая безопасность</span>
					</div>
					{isPhysiologicalNorm ? (
						<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
							<ShieldCheck className="w-3.5 h-3.5" />
							Норма
						</span>
					) : (
						<span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/30 inline-flex items-center gap-1">
							<ShieldAlert className="w-3.5 h-3.5" />
							Особый контроль
						</span>
					)}
				</div>

				<div className="flex flex-wrap gap-1.5">
					{effectiveSafety.hasPenicillinAllergy && (
						<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
							Пенициллин
						</span>
					)}
					{effectiveSafety.hasLidocaineAllergy && (
						<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
							Лидокаин
						</span>
					)}
					{effectiveSafety.hasArticaineAllergy && (
						<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-rose-600 text-white shadow-2xs">
							Артикаин
						</span>
					)}
					{effectiveSafety.hasLatexAllergy && (
						<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
							Латекс
						</span>
					)}
					{effectiveSafety.hasIodineAllergy && (
						<span className="px-2 py-0.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-500/40">
							Йод
						</span>
					)}
					{isPhysiologicalNorm && (
						<span className="text-xs text-[var(--muted)]">
							Аллергоанамнез чист, соматически здоров.
						</span>
					)}
				</div>

				{effectiveSafety.customChronicNotes && (
					<p className="text-xs text-[var(--muted)] m-0 bg-[var(--paper-soft)] p-2 rounded-xl border border-[var(--line)]">
						{effectiveSafety.customChronicNotes}
					</p>
				)}

				<button
					type="button"
					data-testid="patient-drawer-anamnesis-btn"
					onClick={onOpenAnamnesis}
					className="mt-1 min-h-[44px] sm:min-h-[36px] h-9 px-3 rounded-xl border border-[var(--line)] bg-[var(--paper-strong)] hover:bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
				>
					<HeartPulse className="w-3.5 h-3.5 text-[var(--teal)]" />
					<span>Редактировать соматику и анамнез</span>
				</button>
			</div>
		);
	});
