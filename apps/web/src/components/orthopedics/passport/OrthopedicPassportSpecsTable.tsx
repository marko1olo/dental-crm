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
			<h3 className="text-xs font-bold text-[var(--ink)] tracking-wider mb-2 flex items-center gap-1.5">
				<DentalCrown size={14} className="text-[var(--primary)]" />
				<span>Клинико-техническая спецификация</span>
			</h3>
			<div className="border border-[var(--line)] rounded-lg overflow-hidden text-xs">
				<div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[var(--line)] bg-[var(--paper)]">
					<div className="p-2.5 space-y-1.5">
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Локализация (FDI зуб):</span>
							<span className="font-bold font-mono text-[var(--primary)] bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/30">
								{passport.toothFdi}
							</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Вид конструкции:</span>
							<span className="font-bold text-[var(--ink)] text-right">{passport.constructionName}</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Конструкционный материал:</span>
							<span className="font-bold text-[var(--ink)] text-right">{passport.material}</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Партия / LOT номер:</span>
							<span className="font-mono text-[var(--ink)]">{batchLot}</span>
						</div>
					</div>

					<div className="p-2.5 space-y-1.5">
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Цвет по шкале VITA:</span>
							<span className="font-bold font-mono text-[var(--ink)] bg-[var(--paper-soft)] px-2 py-0.5 rounded border border-[var(--line)]">
								{passport.colorVita}
							</span>
						</div>
						{passport.stumpShade && (
							<div className="flex justify-between items-baseline">
								<span className="text-[var(--ink-muted)]">Цвет культи (Natural Die):</span>
								<span className="font-mono font-semibold text-[var(--ink)]">{passport.stumpShade}</span>
							</div>
						)}
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Граница препарирования:</span>
							<span className="font-semibold text-[var(--ink)]">
								{passport.preparationMarginLabel || "Круговой уступ Chamfer"}
							</span>
						</div>
						<div className="flex justify-between items-baseline">
							<span className="text-[var(--ink-muted)]">Вид фиксации:</span>
							<span className="font-semibold text-[var(--ink)]">
								{passport.fixationTypeLabel || "Постоянная цементная фиксация (двойного отверждения / СИЦ)"}
							</span>
						</div>
					</div>
				</div>

				<div className="p-2 bg-[var(--paper-soft)] border-t border-[var(--line)] text-[11px] text-[var(--ink-muted)] flex items-center justify-between">
					<span>Стандарты безопасности: <strong>{standards}</strong></span>
					<span className="font-mono text-[var(--primary)] font-bold">100% биосовместимо</span>
				</div>
			</div>
		</div>
	);
}
