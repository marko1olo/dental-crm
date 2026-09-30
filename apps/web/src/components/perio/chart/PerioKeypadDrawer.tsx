import {
	PERIO_SITES_CONFIG,
	type PerioSiteKey,
	type PerioToothRecord,
} from "@dental/shared";
import { Droplets } from "lucide-react";
import React from "react";
import { PerioProbe } from "../../icons/DentalIcons";
import { probingDepthTone } from "../perioHeatmap";

export interface PerioKeypadDrawerProps {
	readonly focusedSite: {
		toothNumber: number;
		siteKey: PerioSiteKey;
	} | null;
	readonly toothMap: Map<number, PerioToothRecord>;
	readonly isProbeKeyboardEnabled: boolean;
	readonly onToggleProbeKeyboard: (enabled: boolean) => void;
	readonly readOnly?: boolean | undefined;
	readonly onKeypadDepth: (depth: number) => void;
	readonly onToggleBop: () => void;
	readonly onTogglePlaque: () => void;
	readonly onToggleSuppuration: () => void;
	readonly onPrevSite: () => void;
	readonly onNextSite: () => void;
}

export const PerioKeypadDrawer: React.FC<PerioKeypadDrawerProps> = React.memo(({
	focusedSite,
	toothMap,
	isProbeKeyboardEnabled,
	onToggleProbeKeyboard,
	readOnly = false,
	onKeypadDepth,
	onToggleBop,
	onTogglePlaque,
	onToggleSuppuration,
	onPrevSite,
	onNextSite,
}) => {
	const currentTooth = focusedSite
		? toothMap.get(focusedSite.toothNumber)
		: null;
	const currentSite =
		focusedSite && currentTooth ? currentTooth[focusedSite.siteKey] : null;
	const currentDepth = currentSite?.probingDepthMm ?? 0;
	const tone = probingDepthTone(currentDepth);

	return (
		<div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[var(--paper-soft)] border border-teal-500/30 shadow-xs">
			{/* Active Probe Site Info Badge */}
			<div className="flex items-center gap-2 flex-wrap">
				<div className="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-mono text-xs font-bold flex items-center gap-1.5">
					<PerioProbe size={14} className="text-teal-400 shrink-0" />
					<span>
						{focusedSite ? (
							<>
								Зуб{" "}
								<strong className="text-[var(--ink)] text-sm">
									{focusedSite.toothNumber}
								</strong>{" "}
								•{" "}
								{
									PERIO_SITES_CONFIG.find((s) => s.key === focusedSite.siteKey)
										?.shortKey
								}{" "}
								(
								{PERIO_SITES_CONFIG.find(
									(s) => s.key === focusedSite.siteKey,
								)
									?.labelRu.split("(")[0]
									?.trim()}
								)
							</>
						) : (
							"Пародонтограмма: Выберите точку или нажмите 1..9 для старта"
						)}
					</span>
				</div>
				{focusedSite && (
					<span className="text-xs font-mono font-bold text-[var(--ink)]">
						Глубина:{" "}
						<strong
							className={`text-sm ${
								tone === "success"
									? "text-emerald-400"
									: tone === "warning-low"
										? "text-amber-400"
										: tone === "warning-high"
											? "text-orange-400"
											: "text-rose-400"
							}`}
						>
							{currentDepth} мм
						</strong>
					</span>
				)}

				{/* Numpad Keyboard intercept toggle in Tier 3 */}
				<label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--paper)] border border-[var(--line)] cursor-pointer text-xs select-none">
					<input
						type="checkbox"
						data-testid="perio-probe-keyboard-toggle-tier3"
						checked={isProbeKeyboardEnabled}
						onChange={(e) => onToggleProbeKeyboard(e.target.checked)}
						className="accent-teal-500 w-3.5 h-3.5 rounded cursor-pointer"
					/>
					<span className="text-[var(--ink-soft)] font-medium">
						Клавиатура Numpad
					</span>
				</label>
			</div>

			{/* Large Touch/Glove NumPad 1..12 Buttons (Florida Probe 1-12 mm Range) */}
			<div className="flex items-center gap-1 flex-wrap">
				<span className="text-[11px] font-bold text-[var(--muted)] mr-1 hidden sm:inline">
					NumPad (1–12 мм):
				</span>
				{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((numVal) => {
					const isNorm = numVal <= 3;
					const isMild = numVal <= 5;
					const isMod = numVal <= 7;
					return (
						<button
							key={numVal}
							type="button"
							disabled={readOnly}
							onClick={() => onKeypadDepth(numVal)}
							className={`min-w-[44px] min-h-[44px] sm:min-w-[34px] sm:min-h-0 sm:h-9 rounded-lg font-black text-xs sm:text-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center border ${
								isNorm
									? "bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30"
									: isMild
										? "bg-amber-500/15 hover:bg-amber-500/30 text-amber-300 border-amber-500/30"
										: isMod
											? "bg-orange-500/20 hover:bg-orange-500/35 text-orange-300 border-orange-500/40"
											: "bg-red-600/25 hover:bg-red-600/40 text-red-200 border-red-500/50 shadow-xs"
							}`}
							title={`Ввести глубину кармана ${numVal} мм и перейти к след. точке (хоткей: ${
								numVal <= 9 ? numVal : numVal === 10 ? "0" : `Shift+${numVal - 10}`
							})`}
							data-testid={`perio-keypad-depth-${numVal}`}
						>
							{numVal}
						</button>
					);
				})}

				<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

				{/* Quick Toggles: BOP, PLQ, PUS */}
				<button
					type="button"
					disabled={readOnly}
					onClick={onToggleBop}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.bleedingOnProbing
							? "bg-rose-500 text-white border-rose-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-rose-500/20 text-rose-300 border-[var(--line)]"
					}`}
					title="Переключить кровоточивость (BOP) на активной точке (хоткей: B)"
				>
					<Droplets size={14} />
					<span>BOP</span>
				</button>

				<button
					type="button"
					disabled={readOnly}
					onClick={onTogglePlaque}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.plaque
							? "bg-amber-500 text-slate-950 font-black border-amber-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-amber-500/20 text-amber-300 border-[var(--line)]"
					}`}
					title="Переключить налет (Plaque) на активной точке (хоткей: P)"
				>
					<span>PLQ</span>
				</button>

				<button
					type="button"
					disabled={readOnly}
					onClick={onToggleSuppuration}
					className={`min-h-[44px] min-w-[44px] sm:min-h-0 sm:h-9 px-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all active:scale-95 cursor-pointer border ${
						currentSite?.suppuration
							? "bg-indigo-500 text-white border-indigo-400 shadow-xs"
							: "bg-[var(--paper)] hover:bg-indigo-500/20 text-indigo-300 border-[var(--line)]"
					}`}
					title="Нагноение (хоткей: S)"
				>
					<span>PUS</span>
				</button>

				<div className="h-6 w-[1px] bg-[var(--line)] mx-1 hidden sm:block" />

				{/* Step Prev / Next Buttons */}
				<button
					type="button"
					onClick={onPrevSite}
					className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
					title="Предыдущая точка (хоткей: Стрелка влево / Shift+Tab)"
				>
					←
				</button>
				<button
					type="button"
					onClick={onNextSite}
					className="min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 sm:w-8 sm:h-9 rounded-lg bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-teal-300 border border-[var(--line)] font-bold text-xs flex items-center justify-center cursor-pointer"
					title="Следующая точка (хоткей: Стрелка вправо / Tab)"
				>
					→
				</button>
			</div>
		</div>
	);
});

PerioKeypadDrawer.displayName = "PerioKeypadDrawer";
