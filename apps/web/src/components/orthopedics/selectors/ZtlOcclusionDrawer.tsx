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
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="occlusion-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Окклюзия и артикулятор:
					</span>
				</div>
				<span className="text-[11px] text-[var(--muted)] truncate">
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
										? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] ring-1 ring-[var(--primary)] shadow-2xs font-bold"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper-subtle)]"
								}`}
								data-testid={`articulator-chip-${art.id}`}
							>
								{art.label}
							</button>
						);
					})}
				</div>

				<label className="flex items-center gap-2 px-2.5 py-1 min-h-[34px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] cursor-pointer select-none" data-testid="facebow-checkbox-label">
					<input
						type="checkbox"
						checked={activeFacebow}
						onChange={(e) => onToggleFacebow(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
						data-testid="facebow-checkbox"
					/>
					<span>Лицевая дуга (суставной путь 33° / Беннетт 15°)</span>
				</label>
			</div>
		</div>
	);
}
