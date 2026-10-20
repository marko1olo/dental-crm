/**
 * PrescriptionAllergyConflictStrip.tsx — Passive Allergy Warning Badges
 */

import { AlertTriangle } from "lucide-react";
import type React from "react";

export interface PrescriptionAllergyConflictStripProps {
	readonly penicillinConflict: boolean;
	readonly nsaidConflict: boolean;
	readonly anestheticConflict?: boolean;
}

export const PrescriptionAllergyConflictStrip: React.FC<
	PrescriptionAllergyConflictStripProps
> = ({ penicillinConflict, nsaidConflict, anestheticConflict }) => {
	return (
		<>
			{penicillinConflict && (
				<div
					data-testid="allergy-conflict-penicillin"
					className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
						<span className="font-bold leading-snug">
							⚠️ Выписан пенициллин при аллергии в анамнезе (Риск
							непереносимости)
						</span>
					</div>
					<span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0 ml-auto">
						Печать рецепта доступна
					</span>
				</div>
			)}
			{nsaidConflict && (
				<div
					data-testid="allergy-conflict-nsaid"
					className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
						<span className="font-bold leading-snug">
							⚠️ Выписан НПВС при аллергии на НПВС/аспирин в анамнезе
						</span>
					</div>
					<span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0 ml-auto">
						Печать рецепта доступна
					</span>
				</div>
			)}
			{anestheticConflict && (
				<div
					data-testid="allergy-conflict-anesthetic"
					className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100 text-xs flex flex-wrap items-center justify-between gap-2"
				>
					<div className="flex items-center gap-2 min-w-0">
						<AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
						<span className="font-bold leading-snug">
							⚠️ Выписан местный анестетик при аллергии на анестетики
						</span>
					</div>
					<span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-600 text-white shrink-0 ml-auto">
						Печать рецепта доступна
					</span>
				</div>
			)}
		</>
	);
};
