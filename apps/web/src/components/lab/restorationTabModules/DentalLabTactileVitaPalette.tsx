import React from "react";
import { Sparkles, Palette } from "lucide-react";
import { SHADE_SWATCH_MAP, VITA_CLASSICAL_GROUPS } from "../labShadesData";

export interface DentalLabTactileVitaPaletteProps {
	currentShade?: string | undefined;
	onSelectShade: (shade: string) => void;
	onOpenAdvancedShades?: (() => void) | undefined;
}

const BLEACH_ITEMS = [
	{ id: "BL1", label: "Bleach 1", code: "BL1" },
	{ id: "BL2", label: "Bleach 2", code: "BL2" },
	{ id: "BL3", label: "Bleach 3", code: "BL3" },
	{ id: "BL4", label: "Bleach 4", code: "BL4" },
] as const;

export function DentalLabTactileVitaPalette({
	currentShade = "A2",
	onSelectShade,
	onOpenAdvancedShades,
}: DentalLabTactileVitaPaletteProps) {
	const currentSwatch = SHADE_SWATCH_MAP[currentShade];

	return (
		<div className="p-3 sm:p-4 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3" data-testid="tactile-vita-palette">
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Palette className="w-4 h-4 text-teal-600 dark:text-teal-400" />
					<label className="text-xs font-bold text-[var(--ink)]">3. Расцветка VITA Classical (в 1 тап):</label>
				</div>
				<div className="flex items-center gap-2">
					<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] shadow-2xs">
						<span className="w-3.5 h-3.5 rounded-full border border-black/20 shadow-2xs shrink-0" style={{ backgroundColor: currentSwatch?.bg || "#f0eae0" }} aria-hidden="true" />
						<span className="text-xs font-mono font-extrabold text-[var(--ink)]">{currentShade}</span>
					</div>
					{onOpenAdvancedShades && (
						<button type="button" onClick={onOpenAdvancedShades} className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer">
							Многослойный цвет →
						</button>
					)}
				</div>
			</div>

			{/* VITA Classical 16 оттенков (Группы A, B, C, D) — плитки >= 44x44px */}
			<div className="space-y-2">
				{VITA_CLASSICAL_GROUPS.map((grp) => (
					<div key={grp.id} className="flex flex-wrap items-center gap-1.5">
						<span className="text-[11px] font-bold text-[var(--muted)] w-14 shrink-0">{grp.name}:</span>
						<div className="flex flex-wrap items-center gap-1.5 flex-1">
							{grp.shades.map((shade) => {
								const isSelected = currentShade === shade;
								const swatch = SHADE_SWATCH_MAP[shade];
								return (
									<button
										key={shade} type="button" onClick={() => onSelectShade(shade)}
										aria-label={`Выбрать оттенок VITA ${shade}`} title={`${shade}: ${swatch?.desc || ""}`}
										className={`min-w-[44px] min-h-[44px] w-12 h-11 px-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 active:scale-95 shadow-2xs ${
											isSelected
												? "bg-[var(--teal,#0d9488)] text-white ring-2 ring-[var(--teal,#0d9488)] ring-offset-1 font-extrabold shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] hover:border-teal-500/50"
										}`}
										data-testid={`tactile-shade-${shade}`}
									>
										<span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: swatch?.bg || "#f0eae0" }} aria-hidden="true" />
										<span className="leading-none">{shade}</span>
									</button>
								);
							})}
						</div>
					</div>
				))}
			</div>

			{/* Группа отбеливания: Bleach 1..4 (BL1..BL4) */}
			<div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center gap-2">
				<div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--ink-secondary)] w-24 shrink-0">
					<Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
					<span>Отбеливание:</span>
				</div>
				<div className="flex flex-wrap items-center gap-1.5 flex-1">
					{BLEACH_ITEMS.map((b) => {
						const isSelected = currentShade === b.code;
						const swatch = SHADE_SWATCH_MAP[b.code];
						return (
							<button
								key={b.id} type="button" onClick={() => onSelectShade(b.code)}
								aria-label={`Выбрать ${b.label}`} title={`${b.label}: ${swatch?.desc || ""}`}
								className={`min-h-[44px] min-w-[70px] h-11 px-2.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs ${
									isSelected
										? "bg-teal-700 text-white ring-2 ring-teal-500 ring-offset-1 font-extrabold shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`tactile-shade-${b.code}`}
							>
								<span className="w-3 h-3 rounded-full border border-black/20 shrink-0" style={{ backgroundColor: swatch?.bg || "#ffffff" }} aria-hidden="true" />
								<span className="leading-none">{b.label}</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export default DentalLabTactileVitaPalette;
