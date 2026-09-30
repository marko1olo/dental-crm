/**
 * OrthopedicsVitaShadePicker.tsx — 1-клик селектор шкалы VITA Classical и VITA 3D-Master.
 *
 * Mandate 8b: Декомпозиция монолитов (строго <= 800 строк).
 * Mandate 8e: Сенсорные тач-таргеты min-h-[48px], мгновенный выбор оттенка.
 */

import React from "react";
import { ToothShadeGuide } from "../icons/DentalIcons.js";
import { VITA_SHADE_GROUPS } from "./orthopedicProtocols.js";
import { VITA_3D_MASTER_SHADE_GROUPS } from "./orthopedicsPresets.js";
import { SHADE_SWATCH_MAP } from "../lab/labMath.js";

export interface OrthopedicsVitaShadePickerProps {
	readonly shadeSystem: "classical" | "3d_master";
	readonly onShadeSystemChange: (system: "classical" | "3d_master") => void;
	readonly selectedShade: string;
	readonly onSelectShade: (shade: string) => void;
}

export function OrthopedicsVitaShadePicker({
	shadeSystem,
	onShadeSystemChange,
	selectedShade,
	onSelectShade,
}: OrthopedicsVitaShadePickerProps) {
	return (
		<div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-2.5">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="flex items-center gap-2">
					<ToothShadeGuide size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
					<span className="text-xs font-bold text-slate-800 dark:text-slate-200">
						Шкала VITA:
					</span>
					<div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden text-xs">
						<button
							type="button"
							onClick={() => onShadeSystemChange("classical")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors ${
								shadeSystem === "classical"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							data-testid="vita-classical-tab"
						>
							VITA Classical
						</button>
						<button
							type="button"
							onClick={() => onShadeSystemChange("3d_master")}
							className={`min-h-[48px] px-3 font-bold cursor-pointer transition-colors border-l border-slate-300 dark:border-slate-700 ${
								shadeSystem === "3d_master"
									? "bg-teal-600 text-white"
									: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
							data-testid="vita-3d-master-tab"
						>
							VITA 3D-Master
						</button>
					</div>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-slate-600 dark:text-slate-300 font-medium">Выбранный оттенок:</span>
					<span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-teal-600 text-white shadow-xs inline-flex items-center gap-1.5">
						{(() => {
							const swatch = SHADE_SWATCH_MAP[selectedShade];
							return swatch ? (
								<span
									className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0"
									style={{ backgroundColor: swatch.bg }}
									aria-hidden="true"
								/>
							) : null;
						})()}
						<span>{selectedShade}</span>
					</span>
				</div>
			</div>

			{shadeSystem === "classical" ? (
				/* 1-клик сетка групп VITA Classical */
				<div className="space-y-1.5">
					{VITA_SHADE_GROUPS.map((grp) => (
						<div key={grp.group} className="flex flex-wrap items-center gap-1.5">
							<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-16 shrink-0">
								{grp.group === "Bleach" ? "Bleach" : `Гр. ${grp.group}`}:
							</span>
							<div className="flex flex-wrap items-center gap-1.5 flex-1">
								{grp.shades.map((shade) => {
									const isSelected = selectedShade === shade;
									const isBleach = shade.startsWith("BL");
									const swatch = SHADE_SWATCH_MAP[shade];

									return (
										<button
											key={shade}
											type="button"
											onClick={() => onSelectShade(shade)}
											aria-label={`Оттенок ${shade}`}
											title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок ${shade}`}
											className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
												isSelected
													? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
													: isBleach
														? "bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
														: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
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
			) : (
				/* 1-клик сетка групп VITA 3D-Master */
				<div className="space-y-1.5">
					{VITA_3D_MASTER_SHADE_GROUPS.map((grp) => (
						<div key={grp.group} className="flex flex-wrap items-center gap-1.5">
							<span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-24 shrink-0">
								{grp.labelRu}:
							</span>
							<div className="flex flex-wrap items-center gap-1.5 flex-1">
								{grp.shades.map((shade) => {
									const isSelected = selectedShade === shade;
									const swatch = SHADE_SWATCH_MAP[shade];
									return (
										<button
											key={shade}
											type="button"
											onClick={() => onSelectShade(shade)}
											aria-label={`Оттенок 3D-Master ${shade}`}
											title={swatch ? `${shade}: ${swatch.desc}` : `Выбрать оттенок VITA 3D-Master ${shade}`}
											className={`min-h-[48px] min-w-[56px] px-2.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
												isSelected
													? "bg-teal-600 text-white ring-2 ring-teal-500 ring-offset-1 shadow-sm font-extrabold"
													: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
											}`}
											data-testid={`vita-3d-shade-${shade}`}
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
			)}
		</div>
	);
}
