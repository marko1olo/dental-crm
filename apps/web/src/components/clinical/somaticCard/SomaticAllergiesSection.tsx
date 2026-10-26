import { Check, Pill } from "lucide-react";
import React from "react";
import type { PatientClinicalSafetyProfile } from "../../patients/safetyMath";

export interface SomaticAllergiesSectionProps {
	readonly profile: PatientClinicalSafetyProfile;
	readonly onToggle: (key: keyof PatientClinicalSafetyProfile) => void;
}

interface AllergyItem {
	readonly key: keyof PatientClinicalSafetyProfile;
	readonly testId: string;
	readonly title: string;
	readonly label: string;
	readonly isCritical?: boolean;
}

const ALLERGY_ITEMS: readonly AllergyItem[] = [
	{ key: "hasArticaineAllergy", testId: "toggle-allergy-articaine", title: "Артикаин (Ультракаин, Септанест, Убистезин)", label: "Артикаин (Ультракаин)", isCritical: true },
	{ key: "hasLidocaineAllergy", testId: "toggle-allergy-lidocaine", title: "Лидокаин", label: "Лидокаин", isCritical: true },
	{ key: "hasMepivacaineAllergy", testId: "toggle-allergy-mepivacaine", title: "Мепивакаин (Скандонест, без вазоконстриктора)", label: "Мепивакаин (Скандонест)" },
	{ key: "hasSulfiteAllergy", testId: "toggle-allergy-sulfites", title: "Сульфиты / консерванты в анестетиках с адреналином", label: "Сульфиты / консервант" },
	{ key: "hasPenicillinAllergy", testId: "toggle-allergy-penicillin", title: "Антибиотики пенициллинового ряда (Амоксиклав, Аугментин)", label: "Пенициллины" },
	{ key: "hasLatexAllergy", testId: "toggle-allergy-latex", title: "Латекс (перчатки, платки коффердама)", label: "Латекс (коффердам)" },
];

export const SomaticAllergiesSection: React.FC<SomaticAllergiesSectionProps> = ({
	profile,
	onToggle,
}) => {
	return (
		<div className="space-y-2">
			<span className="text-[11px] font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Pill className="w-3.5 h-3.5 text-rose-500" />
				Аллергологический статус (анестетики, антибиотики, латекс)
			</span>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{ALLERGY_ITEMS.map((item) => {
					const isActive = Boolean(profile[item.key]);
					const activeBg = item.isCritical
						? "bg-rose-50 dark:bg-rose-950/50 border-[#ef4444] text-rose-900 dark:text-rose-200 shadow-xs"
						: "bg-rose-50 dark:bg-rose-950/50 border-rose-400 text-rose-900 dark:text-rose-200";
					const inactiveBg =
						"bg-[var(--paper-soft,#f8fafc)] dark:bg-slate-800 border-[var(--line,#e2e8f0)] dark:border-slate-700 text-[var(--ink,#0f172a)] dark:text-slate-200 hover:bg-rose-50/50";
					const checkBg = item.isCritical ? "bg-[#ef4444] border-[#ef4444]" : "bg-rose-600 border-rose-600";

					return (
						<button
							key={item.key}
							type="button"
							data-testid={item.testId}
							onClick={() => onToggle(item.key)}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[36px] rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
								isActive ? activeBg : inactiveBg
							}`}
							title={item.title}
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									isActive ? `${checkBg} text-white` : "border-slate-300 dark:border-slate-600"
								}`}
							>
								{isActive ? <Check className="w-3 h-3" /> : null}
							</div>
							<span className="truncate min-w-0">{item.label}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
