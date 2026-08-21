import React from "react";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ChevronLeft,
	ChevronRight,
	CornerDownRight,
	Droplet,
	Flame,
	Minus,
	Plus,
	RotateCcw,
	Sparkles,
	Zap,
} from "lucide-react";
import type { PerioSiteKey } from "./perioTypes";

interface PerioKeypadProps {
	activeToothNumber: number;
	activeSiteKey: PerioSiteKey;
	probingDepthMm: number;
	gingivalMarginMm: number;
	calMm: number;
	bleedingOnProbing: boolean;
	suppuration: boolean;
	plaque: boolean;
	calculus: boolean;
	autoAdvance: boolean;
	onAutoAdvanceToggle: () => void;
	onDepthSelect: (depth: number) => void;
	onGingivalMarginChange: (gm: number) => void;
	onToggleBop: () => void;
	onToggleSuppuration: () => void;
	onTogglePlaque: () => void;
	onToggleCalculus: () => void;
	onPrevSite: () => void;
	onNextSite: () => void;
	onPrevTooth: () => void;
	onNextTooth: () => void;
}

const DEPTH_BUTTONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export const PerioKeypad: React.FC<PerioKeypadProps> = ({
	activeToothNumber,
	activeSiteKey,
	probingDepthMm,
	gingivalMarginMm,
	calMm,
	bleedingOnProbing,
	suppuration,
	plaque,
	calculus,
	autoAdvance,
	onAutoAdvanceToggle,
	onDepthSelect,
	onGingivalMarginChange,
	onToggleBop,
	onToggleSuppuration,
	onTogglePlaque,
	onToggleCalculus,
	onPrevSite,
	onNextSite,
	onPrevTooth,
	onNextTooth,
}) => {
	const siteLabels: Record<PerioSiteKey, { short: string; full: string; isBuccal: boolean }> = {
		mesioBuccal: { short: "MB", full: "Медиально-вестибулярно", isBuccal: true },
		midBuccal: { short: "B", full: "По центру вестибулярно", isBuccal: true },
		distoBuccal: { short: "DB", full: "Дистально-вестибулярно", isBuccal: true },
		mesioLingual: { short: "ML", full: "Медиально-орально", isBuccal: false },
		midLingual: { short: "L", full: "По центру орально", isBuccal: false },
		distoLingual: { short: "DL", full: "Дистально-орально", isBuccal: false },
	};

	const currentSiteInfo = siteLabels[activeSiteKey];

	return (
		<div className="perio-keypad-container bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
			{/* Top Active Target Header */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
				<div className="flex items-center gap-2">
					<span className="px-2.5 py-1 bg-teal-600 text-white font-mono font-bold text-sm rounded-md shadow-xs">
						#{activeToothNumber}
					</span>
					<div>
						<div className="flex items-center gap-1.5">
							<span className="text-xs font-bold text-slate-900 dark:text-slate-100">
								{currentSiteInfo.short} — {currentSiteInfo.full}
							</span>
							<span
								className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
									currentSiteInfo.isBuccal
										? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
										: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
								}`}
							>
								{currentSiteInfo.isBuccal ? "Щёчно / Вестибулярно" : "Язычно / Нёбно"}
							</span>
						</div>
						<div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-3 mt-0.5">
							<span>
								Глубина PD: <strong className="text-slate-900 dark:text-slate-200">{probingDepthMm} мм</strong>
							</span>
							<span>
								Рецессия GM: <strong className="text-slate-900 dark:text-slate-200">{gingivalMarginMm} мм</strong>
							</span>
							<span>
								Потеря CAL: <strong className="text-teal-600 dark:text-teal-400 font-bold">{calMm} мм</strong>
							</span>
						</div>
					</div>
				</div>

				{/* Auto-Advance Probing Mode Toggle */}
				<button
					type="button"
					onClick={onAutoAdvanceToggle}
					className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
						autoAdvance
							? "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/40"
							: "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
					}`}
					title="Автоматический переход к следующей точке при вводе глубины"
				>
					<Zap className={`w-4 h-4 ${autoAdvance ? "text-teal-600 dark:text-teal-400 animate-bounce" : ""}`} />
					<span>Авто-шаг (Auto-advance)</span>
					<span
						className={`w-2 h-2 rounded-full ${autoAdvance ? "bg-teal-500" : "bg-slate-400"}`}
					/>
				</button>
			</div>

			{/* 12-Millimeter Depth Quick Keypad (Touch Target >= 48px) */}
			<div>
				<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center justify-between">
					<span>Быстрый ввод глубины кармана (Probing Depth 1–12 мм):</span>
					<span className="text-[10px] text-slate-400">1 тап для планшета</span>
				</div>
				<div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
					{DEPTH_BUTTONS.map((depth) => {
						const isSelected = probingDepthMm === depth;
						const isSevere = depth >= 6;
						const isModerate = depth >= 4 && depth <= 5;

						return (
							<button
								key={depth}
								type="button"
								onClick={() => onDepthSelect(depth)}
								className={`min-h-[48px] min-w-[44px] rounded-lg text-base font-extrabold flex flex-col items-center justify-center transition-all cursor-pointer select-none border active:scale-95 ${
									isSelected
										? isSevere
											? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-500/50 scale-105 z-10"
											: isModerate
												? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/50 scale-105 z-10"
												: "bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-500/50 scale-105 z-10"
										: isSevere
											? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100"
											: isModerate
												? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100"
												: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								aria-label={`Глубина кармана ${depth} мм`}
							>
								<span>{depth}</span>
								<span className="text-[9px] font-medium opacity-75">мм</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Clinical Diagnostic Toggles (BOP, Suppuration, Plaque, Calculus) & GM Steppers */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
				{/* 4 Clinical Indicators */}
				<div className="space-y-1.5">
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
						Клинические маркеры воспаления:
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
						{/* BOP Toggle */}
						<button
							type="button"
							onClick={onToggleBop}
							className={`min-h-[48px] px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								bleedingOnProbing
									? "bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-500/40"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
							}`}
							title="Кровоточивость при зондировании (BOP)"
						>
							<div className="flex items-center gap-1">
								<span className={`w-2.5 h-2.5 rounded-full ${bleedingOnProbing ? "bg-white animate-pulse" : "bg-rose-500"}`} />
								<span>BOP</span>
							</div>
							<span className="text-[9px] font-normal opacity-85">Кровь</span>
						</button>

						{/* Suppuration / Pus Toggle */}
						<button
							type="button"
							onClick={onToggleSuppuration}
							className={`min-h-[48px] px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								suppuration
									? "bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/40"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
							}`}
							title="Гноетечение из кармана (Suppuration / Pus)"
						>
							<div className="flex items-center gap-1">
								<Droplet className={`w-3 h-3 ${suppuration ? "text-amber-200" : "text-amber-500"}`} />
								<span>SUP</span>
							</div>
							<span className="text-[9px] font-normal opacity-85">Гной</span>
						</button>

						{/* Plaque Toggle */}
						<button
							type="button"
							onClick={onTogglePlaque}
							className={`min-h-[48px] px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								plaque
									? "bg-yellow-500 text-slate-900 border-yellow-600 shadow-sm ring-2 ring-yellow-400/40"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
							}`}
							title="Зубная бляшка / налёт (Plaque)"
						>
							<div className="flex items-center gap-1">
								<span className={`w-2.5 h-2.5 rounded-full ${plaque ? "bg-slate-900" : "bg-yellow-400"}`} />
								<span>PLQ</span>
							</div>
							<span className="text-[9px] font-normal opacity-85">Налёт</span>
						</button>

						{/* Calculus Toggle */}
						<button
							type="button"
							onClick={onToggleCalculus}
							className={`min-h-[48px] px-2 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								calculus
									? "bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-600/40"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300"
							}`}
							title="Поддесневой зубной камень (Calculus)"
						>
							<div className="flex items-center gap-1">
								<span className={`w-2.5 h-2.5 rounded-full ${calculus ? "bg-white" : "bg-stone-500"}`} />
								<span>CALC</span>
							</div>
							<span className="text-[9px] font-normal opacity-85">Камень</span>
						</button>
					</div>
				</div>

				{/* Gingival Margin Recession Steppers */}
				<div className="space-y-1.5">
					<div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
						<span>Уровень десневого края (Gingival Margin GM):</span>
						<span className="text-teal-600 dark:text-teal-400 font-bold">{gingivalMarginMm} мм</span>
					</div>
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={() => onGingivalMarginChange(Math.max(-5, gingivalMarginMm - 1))}
							className="min-h-[48px] min-w-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-bold active:scale-95"
							title="Уменьшить GM (гиперплазия)"
						>
							<Minus className="w-4 h-4" />
						</button>

						<div className="grid grid-cols-5 gap-1 flex-1">
							{[-2, 0, 1, 2, 3].map((val) => (
								<button
									key={val}
									type="button"
									onClick={() => onGingivalMarginChange(val)}
									className={`min-h-[48px] rounded-lg text-xs font-bold transition-all cursor-pointer border ${
										gingivalMarginMm === val
											? "bg-teal-600 text-white border-teal-700 shadow-xs"
											: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
									}`}
								>
									{val > 0 ? `+${val}` : val}
								</button>
							))}
						</div>

						<button
							type="button"
							onClick={() => onGingivalMarginChange(Math.min(12, gingivalMarginMm + 1))}
							className="min-h-[48px] min-w-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-bold active:scale-95"
							title="Увеличить GM (рецессия)"
						>
							<Plus className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>

			{/* Navigation Buttons (Touch Target >= 44px) */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-2.5">
				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onPrevTooth}
						className="min-h-[44px] px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
					>
						<ChevronLeft className="w-4 h-4" />
						<span>Пред. зуб</span>
					</button>
					<button
						type="button"
						onClick={onPrevSite}
						className="min-h-[44px] px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
					>
						<ArrowLeft className="w-4 h-4" />
						<span>Пред. точка</span>
					</button>
				</div>

				<div className="flex items-center gap-1.5">
					<button
						type="button"
						onClick={onNextSite}
						className="min-h-[44px] px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
					>
						<span>След. точка</span>
						<ArrowRight className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={onNextTooth}
						className="min-h-[44px] px-3 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
					>
						<span>След. зуб</span>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};
