import type React from "react";
import type {
	Tooth16CrownMaterial,
	Tooth16RestorationCondition,
} from "./tooth16Types";

export interface Tooth16ProstheticBarProps {
	crownMaterial: Tooth16CrownMaterial;
	onCrownMaterialChange: (m: Tooth16CrownMaterial) => void;
	crownCondition: Tooth16RestorationCondition;
	onCrownConditionChange: (c: Tooth16RestorationCondition) => void;
	isCrownActive: boolean;
	onToggleCrownActive: () => void;
	compositeCondition?: Tooth16RestorationCondition;
	isCompositeActive?: boolean;
	onToggleCompositeCondition?: () => void;
}

const MATERIALS: { id: Tooth16CrownMaterial; label: string }[] = [
	{ id: "zirconia", label: "ZrO2 Цирконий" },
	{ id: "pfm", label: "PFM Керамика" },
	{ id: "emax", label: "E-Max" },
	{ id: "gold", label: "Золото 24K" },
	{ id: "metal", label: "КХС Металл" },
	{ id: "pmma", label: "PMMA" },
];

/**
 * DENTE Dental CRM — Prosthetic Bar for 6 Crown Materials & Defect Statuses
 * Mandate 8b <= 120 lines. Zero cartoon emojis, clean clinical typography.
 */
export const Tooth16ProstheticBar: React.FC<Tooth16ProstheticBarProps> = ({
	crownMaterial,
	onCrownMaterialChange,
	crownCondition,
	onCrownConditionChange,
	isCrownActive,
	onToggleCrownActive,
	compositeCondition,
	isCompositeActive,
	onToggleCompositeCondition,
}) => {
	if (!isCrownActive && !isCompositeActive) return null;

	return (
		<div className="w-full flex items-center gap-2 pt-1 border-t border-[var(--line)] text-xs overflow-x-auto scrollbar-none touch-pan-x [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent_100%)] md:[mask-image:none]">
			{isCrownActive && (
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						onClick={onToggleCrownActive}
						className="px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded-lg font-semibold bg-teal-600 text-white shadow-sm"
					>
						✓ Коронка
					</button>
					<span className="font-semibold text-muted-foreground ml-1">
						Материал:
					</span>
					{MATERIALS.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => onCrownMaterialChange(m.id)}
							className={`px-2 py-1 min-h-[44px] sm:min-h-[28px] rounded-md border transition-all font-medium ${
								crownMaterial === m.id
									? "bg-amber-600 text-white border-amber-500 font-bold"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:opacity-80"
							}`}
						>
							{m.label}
						</button>
					))}
					<button
						type="button"
						onClick={() =>
							onCrownConditionChange(
								crownCondition === "adequate" ? "defective" : "adequate",
							)
						}
						className={`px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded-md border font-semibold ml-1 transition-all ${
							crownCondition === "defective"
								? "bg-rose-600 text-white border-rose-500"
								: "bg-emerald-600 text-white border-emerald-500"
						}`}
					>
						{crownCondition === "defective"
							? "Несостоятельная (скол)"
							: "✓ Состоятельная"}
					</button>
				</div>
			)}
			{isCompositeActive && (
				<div className="flex items-center gap-1 shrink-0 ml-2">
					<span className="font-semibold text-muted-foreground">Пломба:</span>
					<button
						type="button"
						onClick={onToggleCompositeCondition}
						className={`px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded-md border font-semibold transition-all ${
							compositeCondition === "defective"
								? "bg-rose-600 text-white border-rose-500"
								: "bg-emerald-600 text-white border-emerald-500"
						}`}
					>
						{compositeCondition === "defective"
							? "Несостоятельная (кариес)"
							: "✓ Состоятельная"}
					</button>
				</div>
			)}
		</div>
	);
};
