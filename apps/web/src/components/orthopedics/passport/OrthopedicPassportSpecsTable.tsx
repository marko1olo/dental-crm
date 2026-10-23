import React from "react";
import { DentalCrown } from "../../icons/DentalIcons.js";
import type { OrthopedicPassportData } from "./orthopedicPassportTypes.js";

export interface OrthopedicPassportSpecsTableProps {
	readonly passport: OrthopedicPassportData;
	readonly batchLot: string;
	readonly standards: string;
}

export function OrthopedicPassportSpecsTable({
	passport,
	batchLot,
	standards,
}: OrthopedicPassportSpecsTableProps) {
	return (
		<div className="mb-4">
			<h3 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 tracking-wider mb-2 flex items-center gap-1.5">
				<DentalCrown size={14} className="text-teal-600" />
				<span>Клинико-техническая спецификация</span>
			</h3>
			<div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
				<div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
					<div className="p-2.5 space-y-1.5">
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Локализация (FDI зуб):</span>
							<span className="font-bold font-mono text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
								{passport.toothFdi}
							</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Вид конструкции:</span>
							<span className="font-bold text-slate-900 dark:text-slate-100 text-right">{passport.constructionName}</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Конструкционный материал:</span>
							<span className="font-bold text-slate-900 dark:text-slate-100 text-right">{passport.material}</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Партия / LOT номер:</span>
							<span className="font-mono text-slate-700 dark:text-slate-300">{batchLot}</span>
						</div>
					</div>

					<div className="p-2.5 space-y-1.5">
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Цвет по шкале VITA:</span>
							<span className="font-bold font-mono text-slate-900 dark:text-slate-100 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
								{passport.colorVita}
							</span>
						</div>
						{passport.stumpShade && (
							<div className="flex justify-between items-baseline">
								<span className="text-slate-500">Цвет культи (Natural Die):</span>
								<span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{passport.stumpShade}</span>
							</div>
						)}
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Граница препарирования:</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200">
								{passport.preparationMarginLabel || "Круговой уступ Chamfer"}
							</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-slate-500">Вид фиксации:</span>
							<span className="font-semibold text-slate-800 dark:text-slate-200">
								{passport.fixationTypeLabel || "Постоянная цементная (Fuji Plus / RelyX)"}
							</span>
						</div>
					</div>
				</div>

				<div className="p-2 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
					<span>Стандарты безопасности: <strong>{standards}</strong></span>
					<span className="font-mono text-teal-700 dark:text-teal-400 font-bold">100% БИОСОВМЕСТИМО</span>
				</div>
			</div>
		</div>
	);
}
