/**
 * AnamnesisAllergyChips.tsx — 1-кликовые чипы аллергий (Пенициллин, Лидокаин, Артикаин, Латекс, Йод).
 */

import React from "react";
import { Check, Pill } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface AnamnesisAllergyChipsProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onToggleField: (key: keyof PatientClinicalSafetyProfile) => void;
}

export const AnamnesisAllergyChips: React.FC<AnamnesisAllergyChipsProps> = ({
	profile,
	onToggleField,
}) => {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
					<Pill className="w-3.5 h-3.5 text-rose-500" />
					1. Аллергологический статус (1-кликовые чипы)
				</span>
				<span className="text-[11px] text-[var(--muted,#64748b)]">
					Красный — аллергия / Серый — норма
				</span>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
				{/* Пенициллин */}
				<button
					type="button"
					data-testid="toggle-allergy-penicillin"
					onClick={() => onToggleField("hasPenicillinAllergy")}
					className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
						profile.hasPenicillinAllergy
							? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
					}`}
					title="Пенициллиновый ряд (Амоксиклав, Аугментин)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasPenicillinAllergy
								? "bg-[#ef4444] border-[#ef4444] text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasPenicillinAllergy ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Пенициллин</span>
				</button>

				{/* Лидокаин */}
				<button
					type="button"
					data-testid="toggle-allergy-lidocaine"
					onClick={() => onToggleField("hasLidocaineAllergy")}
					className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
						profile.hasLidocaineAllergy
							? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
					}`}
					title="Лидокаин (спреи, инфильтрационная анестезия)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasLidocaineAllergy
								? "bg-[#ef4444] border-[#ef4444] text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasLidocaineAllergy ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Лидокаин</span>
				</button>

				{/* Артикаин */}
				<button
					type="button"
					data-testid="toggle-allergy-articaine"
					onClick={() => onToggleField("hasArticaineAllergy")}
					className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
						profile.hasArticaineAllergy
							? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
					}`}
					title="Артикаин (Ультракаин, Септанест, Убистезин)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasArticaineAllergy
								? "bg-[#ef4444] border-[#ef4444] text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasArticaineAllergy ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Артикаин</span>
				</button>

				{/* Латекс */}
				<button
					type="button"
					data-testid="toggle-allergy-latex"
					onClick={() => onToggleField("hasLatexAllergy")}
					className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
						profile.hasLatexAllergy
							? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
					}`}
					title="Латекс (коффердам, перчатки) — нитриловый протокол"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasLatexAllergy
								? "bg-[#ef4444] border-[#ef4444] text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasLatexAllergy ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Латекс</span>
				</button>

				{/* Йод */}
				<button
					type="button"
					data-testid="toggle-allergy-iodine"
					onClick={() => onToggleField("hasIodineAllergy")}
					className={`flex items-center gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
						profile.hasIodineAllergy
							? "bg-rose-50 dark:bg-rose-950/60 border-2 border-[#ef4444] text-rose-900 dark:text-rose-100 shadow-xs"
							: "bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800/80 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:border-rose-300"
					}`}
					title="Йод и йодоформсодержащие препараты (Бетадин, Метапекс, Альвожил)"
				>
					<div
						className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
							profile.hasIodineAllergy
								? "bg-[#ef4444] border-[#ef4444] text-white"
								: "border-slate-300 dark:border-slate-600"
						}`}
					>
						{profile.hasIodineAllergy ? <Check className="w-3 h-3" /> : null}
					</div>
					<span className="truncate min-w-0">Йод (Альвожил)</span>
				</button>
			</div>
		</div>
	);
};
