import React from "react";
import { Sliders } from "lucide-react";

export interface ZtlOcclusionDrawerProps {
	readonly activeArticulator: "bio_art" | "kavo_protar" | "average_anatomical";
	readonly onSelectArticulator: (type: "bio_art" | "kavo_protar" | "average_anatomical") => void;
	readonly activeFacebow: boolean;
	readonly onToggleFacebow: (checked: boolean) => void;
}

export function ZtlOcclusionDrawer({
	activeArticulator,
	onSelectArticulator,
	activeFacebow,
	onToggleFacebow,
}: ZtlOcclusionDrawerProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 min-w-0 overflow-hidden" data-testid="occlusion-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
						Окклюзия и артикулятор (1 клик):
					</span>
				</div>
				<span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
					Соотношение челюстей и биомеханика в ЗТЛ
				</span>
			</div>
			<div className="flex flex-wrap items-center justify-between gap-2">
				<div className="flex flex-wrap items-center gap-1.5">
					{[
						{ id: "bio_art", label: "Bio-Art" },
						{ id: "kavo_protar", label: "KaVo Protar" },
						{ id: "average_anatomical", label: "Среднеанатомический" },
					].map((art) => {
						const isSelected = activeArticulator === art.id;
						return (
							<button
								key={art.id}
								type="button"
								onClick={() => onSelectArticulator(art.id as "bio_art" | "kavo_protar" | "average_anatomical")}
								className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
									isSelected
										? "bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-100 ring-1 ring-teal-500 shadow-2xs font-bold"
										: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								data-testid={`articulator-chip-${art.id}`}
							>
								{art.label}
							</button>
						);
					})}
				</div>

				<label className="flex items-center gap-2 px-2.5 py-1 min-h-[34px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 cursor-pointer select-none" data-testid="facebow-checkbox-label">
					<input
						type="checkbox"
						checked={activeFacebow}
						onChange={(e) => onToggleFacebow(e.target.checked)}
						className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
						data-testid="facebow-checkbox"
					/>
					<span>Лицевая дуга (суставной путь 33° / Беннетт 15°)</span>
				</label>
			</div>
		</div>
	);
}
