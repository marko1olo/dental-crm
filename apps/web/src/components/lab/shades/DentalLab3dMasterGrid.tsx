import React, { useState } from "react";
import { SHADE_SWATCH_MAP, VITA_3D_MASTER_GROUPS } from "../labShadesData";

interface DentalLab3dMasterGridProps {
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export function DentalLab3dMasterGrid({
	selectedShade,
	onSelectShade,
}: DentalLab3dMasterGridProps) {
	const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | null>(null);

	const visibleGroups = selectedLevelFilter !== null
		? VITA_3D_MASTER_GROUPS.filter((g) => g.level === selectedLevelFilter)
		: VITA_3D_MASTER_GROUPS;

	return (
		<div className="space-y-2">
			{/* TASK-PROSTH-02: Быстрые кнопки выбора групп 3D Master (Apple HIG Touch Target min-h-[44px] sm:min-h-[32px]) */}
			<div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-[var(--line,#cbd5e1)]" data-testid="vita-3dmaster-groups-bar">
				<span className="text-[11px] font-semibold text-[var(--muted,#64748b)] shrink-0">
					Группы 3D-Master:
				</span>
				<div className="flex flex-wrap items-center gap-1">
					<button
						type="button"
						onClick={() => setSelectedLevelFilter(null)}
						data-testid="vita-3dmaster-group-btn-all"
						className={`min-h-[44px] sm:min-h-[32px] px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer inline-flex items-center justify-center border ${
							selectedLevelFilter === null
								? "bg-[rgba(13,148,136,0.12)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold shadow-2xs"
								: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f8fafc)]"
						}`}
					>
						Все
					</button>
					{VITA_3D_MASTER_GROUPS.map((grp) => {
						const isSelected = selectedLevelFilter === grp.level;
						return (
							<button
								key={grp.level}
								type="button"
								onClick={() => setSelectedLevelFilter(isSelected ? null : grp.level)}
								data-testid={`vita-3dmaster-group-btn-${grp.level}`}
								aria-label={grp.name}
								title={`${grp.name}: ${grp.shades.join(", ")}`}
								className={`min-h-[44px] sm:min-h-[32px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer inline-flex items-center justify-center border ${
									isSelected
										? "bg-[rgba(13,148,136,0.12)] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-extrabold ring-1 ring-[var(--teal,#0d9488)] shadow-2xs"
										: "bg-[var(--paper,#ffffff)] border-[var(--line,#cbd5e1)] text-[var(--ink,#0f172a)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft,#f8fafc)] shadow-2xs"
								}`}
							>
								{grp.name}
							</button>
						);
					})}
				</div>
			</div>

			{visibleGroups.map((grp) => (
				<div
					key={grp.level}
					className="flex flex-col sm:flex-row sm:items-center gap-1.5"
					data-testid={`vita-3dmaster-group-l${grp.level}`}
				>
					<button
						type="button"
						onClick={() => setSelectedLevelFilter(selectedLevelFilter === grp.level ? null : grp.level)}
						data-testid={`vita-3dmaster-group-header-btn-${grp.level}`}
						className="text-[11px] font-semibold text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] w-24 shrink-0 min-h-[44px] sm:min-h-[32px] inline-flex items-center text-left cursor-pointer transition-colors"
						title={`Фильтр по группе ${grp.name}`}
					>
						{grp.name}:
					</button>
					<div className="flex flex-wrap items-center gap-1.5 flex-1 max-w-full overflow-x-auto scrollbar-none overscroll-contain py-0.5">
						{grp.shades.map((shade) => {
							const isSelected = selectedShade === shade;
							const swatch = SHADE_SWATCH_MAP[shade];

							return (
								<button
									key={shade}
									type="button"
									onClick={() => onSelectShade(shade)}
									aria-label={`Оттенок 3D-Master ${shade}`}
									title={
										swatch
											? `${shade}: ${swatch.desc}`
											: `Выбрать оттенок 3D-Master ${shade}`
									}
									className={`min-h-[44px] sm:min-h-[48px] min-w-[50px] sm:min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] ${
										isSelected
											? "bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)] ring-offset-1 shadow-2xs font-extrabold"
											: "bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] border border-[var(--line,#cbd5e1)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft,#f8fafc)] shadow-2xs"
									}`}
									data-testid={`vita-shade-${shade}`}
								>
									<span
										className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 dark:border-white/30 shadow-2xs"
										style={{
											backgroundColor: swatch?.bg || "#f5f0eb",
											borderColor: swatch?.border || "#d1c7bd",
										}}
										aria-hidden="true"
									/>
									<span>{shade}</span>
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}
