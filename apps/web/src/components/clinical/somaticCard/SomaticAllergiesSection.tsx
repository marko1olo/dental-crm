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
			<span className="text-xs font-semibold text-[var(--ink-muted)] flex items-center gap-1.5">
				<Pill className="w-3.5 h-3.5 text-[var(--danger)]" />
				Аллергологический статус (анестетики, антибиотики, латекс)
			</span>
			<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
				{ALLERGY_ITEMS.map((item) => {
					const isActive = Boolean(profile[item.key]);
					const activeBg = item.isCritical
						? "bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--ink)] shadow-xs"
						: "bg-[var(--danger-soft)] border-[var(--danger)]/50 text-[var(--ink)]";
					const inactiveBg =
						"bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]";
					const checkBg = "bg-[var(--danger)] border-[var(--danger)]";

					return (
						<button
							key={item.key}
							type="button"
							data-testid={item.testId}
							onClick={() => onToggle(item.key)}
							className={`flex items-center min-w-0 gap-2 p-2 sm:p-2.5 min-h-[44px] sm:min-h-[36px] rounded-xl border text-xs font-medium text-left transition-all cursor-pointer ${
								isActive ? activeBg : inactiveBg
							}`}
							title={item.title}
						>
							<div
								className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
									isActive ? `${checkBg} text-white` : "border-[var(--line-strong)]"
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
