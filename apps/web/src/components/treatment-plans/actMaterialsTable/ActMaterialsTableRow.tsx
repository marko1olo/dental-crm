import React from "react";
import { AlertTriangle, Check } from "lucide-react";
import type { CompletedWorksActAndWriteOffData } from "../types";
import { formatMoneyExact } from "../treatmentPlanActFormatters";

type WrittenOffMaterial = CompletedWorksActAndWriteOffData["writtenOffMaterials"][number];

export interface ActMaterialsTableRowProps {
	readonly mat: WrittenOffMaterial;
	readonly idx: number;
}

export const ActMaterialsTableRow: React.FC<ActMaterialsTableRowProps> = ({ mat, idx }) => {
	return (
		<tr className="hover:bg-slate-50 transition-colors border-b border-slate-300 text-xs">
			<td className="border border-slate-300 p-2 text-center text-slate-500 font-mono text-[11px]">
				{idx + 1}
			</td>
			<td className="border border-slate-300 p-2 font-medium text-slate-900 leading-snug">
				<div>{mat.materialName}</div>
				<span className="block text-[11px] font-mono text-slate-500 mt-0.5">
					Код услуги: {mat.serviceCode || mat.order804nCode}
				</span>
			</td>
			<td className="border border-slate-300 p-2 text-center text-[11px] text-slate-700">
				<div>{mat.procedureName}</div>
				{mat.toothNumber && (
					<span className="font-bold text-[var(--teal-dark,var(--teal))]">(зуб №{mat.toothNumber})</span>
				)}
			</td>
			<td className="border border-slate-300 p-2 text-center font-mono">
				{mat.unitOfMeasure}
			</td>
			<td className="border border-slate-300 p-2 text-center font-mono font-bold">
				{mat.quantityRequired}
			</td>
			<td className="border border-slate-300 p-2 text-right font-mono text-slate-700">
				{formatMoneyExact(mat.unitCostRub, mat.unitCostKopecks)}
			</td>
			<td className="border border-slate-300 p-2 text-right font-mono font-bold text-slate-950">
				{formatMoneyExact(mat.totalCostRub, mat.totalCostKopecks)}
			</td>
			<td className="border border-slate-300 p-2 text-center font-mono text-xs">
				{mat.inStockQuantity !== undefined ? (
					mat.isDeficit ? (
						<span className="text-amber-700 dark:text-amber-400 font-bold flex items-center justify-center gap-1">
							<AlertTriangle className="w-3.5 h-3.5 inline shrink-0 text-amber-600 dark:text-amber-400" />
							<span>{mat.inStockQuantity} (Овердрафт -{mat.deficitQuantity})</span>
						</span>
					) : (
						<span className="text-emerald-700 font-semibold flex items-center justify-center gap-1">
							<Check className="w-3.5 h-3.5 inline shrink-0" />
							<span>
								{mat.inStockQuantity} {mat.unitOfMeasure}
							</span>
						</span>
					)
				) : (
					<span className="text-slate-400 font-mono">—</span>
				)}
			</td>
		</tr>
	);
};
