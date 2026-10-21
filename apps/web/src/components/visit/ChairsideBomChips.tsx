/**
 * ChairsideBomChips.tsx
 * Display BOM materials chips and soft overdraft warnings.
 */

import React from "react";
import { AlertCircle, Boxes, Zap } from "lucide-react";
import type { ServiceBomMaterial } from "./chairsideBomMaterials.js";
import type { VisitBillingServiceItem } from "./visitBillingTypes.js";

interface ChairsideBomChipsProps {
	item: VisitBillingServiceItem;
	materials: ServiceBomMaterial[];
	showOverdraft: boolean;
	onOpenMaterialDeduction?: ((item: VisitBillingServiceItem) => void) | undefined;
}

export const ChairsideBomChips: React.FC<ChairsideBomChipsProps> = ({
	item,
	materials,
	showOverdraft,
	onOpenMaterialDeduction,
}) => {
	return (
		<div className="pt-1.5 flex flex-col gap-1 text-[11px]" data-testid={`bom-deduction-info-${item.id}`}>
			<div className="flex items-center justify-between gap-1.5 text-[var(--muted,#64748b)] font-semibold flex-wrap">
				<div className="flex items-center gap-1.5">
					<Boxes size={12} className="text-indigo-500 shrink-0" />
					<span>Списание материалов по услуге:</span>
				</div>
				{onOpenMaterialDeduction && (
					<button
						type="button"
						onClick={() => onOpenMaterialDeduction(item)}
						className="text-[10px] text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 transition-colors"
						title="Проверить нормы расхода и списать по FEFO"
						data-testid={`btn-open-material-deduction-${item.id}`}
					>
						<Zap size={10} className="text-teal-600" />
						<span>Расходники</span>
					</button>
				)}
			</div>
			<div className="flex flex-wrap gap-1">
				{materials.map((mat, mIdx) => (
					<span
						key={mIdx}
						className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40"
						data-testid={`bom-chip-${item.id}-${mIdx}`}
					>
						<span>{mat.name}</span>
						<span className="font-bold opacity-80">({mat.quantity} {mat.unit})</span>
					</span>
				))}
			</div>
			{showOverdraft && (
				<div
					className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 font-medium"
					data-testid={`overdraft-warning-${item.id}`}
				>
					<AlertCircle size={10} className="shrink-0" />
					<span>Материал отсутствует по учету (будет списан в овердрафт)</span>
				</div>
			)}
		</div>
	);
};
