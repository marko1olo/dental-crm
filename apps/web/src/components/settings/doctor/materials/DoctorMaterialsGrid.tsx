import { Check } from "lucide-react";
import React from "react";
import type { ClinicalMaterialOption } from "../../../../store/doctorPreferencesStore";

interface DoctorMaterialsGridProps {
	materials: readonly ClinicalMaterialOption[];
	isSelected: (id: string) => boolean;
	onSelect: (mat: ClinicalMaterialOption) => void;
}

export function DoctorMaterialsGrid({
	materials,
	isSelected,
	onSelect,
}: DoctorMaterialsGridProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
			{materials.map((mat) => {
				const selected = isSelected(mat.id);
				return (
					<button
						key={mat.id}
						type="button"
						onClick={() => onSelect(mat)}
						className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between gap-1.5 min-h-[96px] ${
							selected
								? "bg-[var(--paper)] border-teal-600 shadow-xs ring-2 ring-teal-500/40"
								: "bg-[var(--paper)] border-[var(--line)] hover:border-teal-500/60"
						}`}
						data-testid={`material-item-${mat.id}`}
					>
						<div className="flex items-start justify-between gap-1.5 w-full">
							<div className="min-w-0">
								<div className="flex items-center gap-1.5 flex-wrap">
									<span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--muted)]">
										#{mat.popularityRank}
									</span>
									<span className="text-xs font-bold text-[var(--ink)] leading-snug">
										{mat.name}
									</span>
								</div>
								<span className="text-[10px] text-[var(--muted)] block mt-0.5">
									{mat.manufacturer}
								</span>
							</div>
							{selected ? (
								<span
									className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0"
									title="Выбран по умолчанию"
								>
									<Check size={12} className="stroke-[3]" />
								</span>
							) : (
								<span
									className="w-5 h-5 rounded-full border border-[var(--line)] shrink-0"
									title="Нажмите для выбора"
								/>
							)}
						</div>

						<p className="text-[11px] text-[var(--muted)] m-0 line-clamp-2 leading-relaxed">
							{mat.description}
						</p>

						<div className="flex items-center justify-between gap-1 mt-1 pt-1 border-t border-[var(--line)]/50">
							<span className="text-[10px] font-medium text-teal-700 dark:text-teal-300">
								{mat.category || mat.generation || mat.badge || "Стандарт"}
							</span>
							{selected && (
								<span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.2 rounded">
									Любимый в ЕМК
								</span>
							)}
						</div>
					</button>
				);
			})}
		</div>
	);
}
