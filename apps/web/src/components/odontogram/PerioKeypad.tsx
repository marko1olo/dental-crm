import React from "react";
import {
	ArrowLeft,
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Droplet,
	Minus,
	Plus,
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
		<div className="perio-keypad-container bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-4">
			{/* Top Active Target Header */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
				<div className="flex items-center gap-3">
					<span className="px-3 py-1.5 bg-teal-600 text-white font-mono font-black text-base rounded-lg shadow-xs">
						#{activeToothNumber}
					</span>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-bold text-slate-900 dark:text-slate-100">
								{currentSiteInfo.short} — {currentSiteInfo.full}
							</span>
							<span
								className={`text-xs px-2 py-0.5 rounded font-bold ${
									currentSiteInfo.isBuccal
										? "bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300"
										: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
								}`}
							>
								{currentSiteInfo.isBuccal ? "Щёчно / Вестибулярно" : "Язычно / Нёбно"}
							</span>
						</div>
						<div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-4 mt-1">
							<span>
								Глубина PD: <strong className="text-slate-900 dark:text-slate-100 font-bold">{probingDepthMm} мм</strong>
							</span>
							<span>
								Рецессия GM: <strong className="text-slate-900 dark:text-slate-100 font-bold">{gingivalMarginMm} мм</strong>
							</span>
							<span>
								Потеря CAL: <strong className="text-teal-600 dark:text-teal-400 font-extrabold">{calMm} мм</strong>
							</span>
						</div>
					</div>
				</div>

				{/* Auto-Advance Probing Mode Toggle */}
				<button
					type="button"
					onClick={onAutoAdvanceToggle}
					className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border ${
						autoAdvance
							? "bg-teal-500/15 border-teal-500/50 text-teal-700 dark:text-teal-300 ring-2 ring-teal-500/40"
							: "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
					}`}
					title="Автоматический переход к следующей точке при вводе глубины кармана"
				>
					<Zap className={`w-4 h-4 ${autoAdvance ? "text-teal-600 dark:text-teal-400 animate-bounce" : ""}`} />
					<span>Авто-шаг (Auto-advance)</span>
					<span
						className={`w-2.5 h-2.5 rounded-full ${autoAdvance ? "bg-teal-500" : "bg-slate-400"}`}
					/>
				</button>
			</div>

			{/* 12-Millimeter Depth Quick Keypad (Touch Target >= 48px) */}
			<div>
				<div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
					<span>Ввод глубины кармана (Probing Depth 1–12 мм):</span>
					<span className="text-xs font-medium text-slate-500 dark:text-slate-400">1 тап (Florida Probe)</span>
				</div>
				<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
					{DEPTH_BUTTONS.map((depth) => {
						const isSelected = probingDepthMm === depth;
						const isSevere = depth >= 6;
						const isModerate = depth >= 4 && depth <= 5;

						return (
							<button
								key={depth}
								type="button"
								onClick={() => onDepthSelect(depth)}
								className={`min-h-[52px] min-w-[48px] rounded-xl text-base font-black flex flex-col items-center justify-center transition-all cursor-pointer select-none border active:scale-95 ${
									isSelected
										? isSevere
											? "bg-rose-600 text-white border-rose-700 shadow-md ring-2 ring-rose-500/60 scale-105 z-10"
											: isModerate
												? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/60 scale-105 z-10"
												: "bg-teal-600 text-white border-teal-700 shadow-md ring-2 ring-teal-500/60 scale-105 z-10"
										: isSevere
											? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-900/60 hover:bg-rose-100"
											: isModerate
												? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-900/60 hover:bg-amber-100"
												: "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
								}`}
								aria-label={`Глубина кармана ${depth} мм`}
							>
								<span>{depth}</span>
								<span className="text-xs font-medium opacity-80">мм</span>
							</button>
						);
					})}
				</div>
			</div>

			{/* Clinical Diagnostic Toggles (BOP, Suppuration, Plaque, Calculus) & GM Steppers */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
				{/* 4 Clinical Indicators */}
				<div className="space-y-2">
					<div className="text-xs font-bold text-slate-700 dark:text-slate-300">
						Клинические маркеры воспаления:
					</div>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
						{/* BOP Toggle */}
						<button
							type="button"
							onClick={onToggleBop}
							className={`min-h-[50px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								bleedingOnProbing
									? "bg-rose-600 text-white border-rose-700 shadow-sm ring-2 ring-rose-500/50"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
							}`}
							title="Кровоточивость при зондировании (BOP)"
						>
							<div className="flex items-center gap-1.5">
								<span className={`w-3 h-3 rounded-full ${bleedingOnProbing ? "bg-white animate-pulse" : "bg-rose-500"}`} />
								<span className="font-black">BOP</span>
							</div>
							<span className="text-xs font-normal opacity-90">Кровь</span>
						</button>

						{/* Suppuration / Pus Toggle */}
						<button
							type="button"
							onClick={onToggleSuppuration}
							className={`min-h-[50px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								suppuration
									? "bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-500/50"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
							}`}
							title="Гноетечение из кармана (Suppuration / Pus)"
						>
							<div className="flex items-center gap-1.5">
								<Droplet className={`w-3.5 h-3.5 ${suppuration ? "text-amber-200" : "text-amber-500"}`} />
								<span className="font-black">SUP</span>
							</div>
							<span className="text-xs font-normal opacity-90">Гной</span>
						</button>

						{/* Plaque Toggle */}
						<button
							type="button"
							onClick={onTogglePlaque}
							className={`min-h-[50px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								plaque
									? "bg-yellow-500 text-slate-950 border-yellow-600 shadow-sm ring-2 ring-yellow-400/50"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
							}`}
							title="Зубная бляшка / налёт (Plaque)"
						>
							<div className="flex items-center gap-1.5">
								<span className={`w-3 h-3 rounded-full ${plaque ? "bg-slate-950" : "bg-yellow-400"}`} />
								<span className="font-black">PLQ</span>
							</div>
							<span className="text-xs font-normal opacity-90">Налёт</span>
						</button>

						{/* Calculus Toggle */}
						<button
							type="button"
							onClick={onToggleCalculus}
							className={`min-h-[50px] px-2.5 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer border ${
								calculus
									? "bg-slate-700 text-white border-slate-800 shadow-sm ring-2 ring-slate-600/50"
									: "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400"
							}`}
							title="Поддесневой зубной камень (Calculus)"
						>
							<div className="flex items-center gap-1.5">
								<span className={`w-3 h-3 rounded-full ${calculus ? "bg-white" : "bg-stone-500"}`} />
								<span className="font-black">CALC</span>
							</div>
							<span className="text-xs font-normal opacity-90">Камень</span>
						</button>
					</div>
				</div>

				{/* Gingival Margin Recession Steppers */}
				<div className="space-y-2">
					<div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
						<span>Уровень десневого края (GM):</span>
						<span className="text-teal-600 dark:text-teal-400 font-black text-sm">{gingivalMarginMm} мм</span>
					</div>
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => onGingivalMarginChange(Math.max(-5, gingivalMarginMm - 1))}
							className="min-h-[48px] min-w-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-bold active:scale-95 shadow-2xs"
							title="Уменьшить GM (гиперплазия / ложный карман)"
						>
							<Minus className="w-5 h-5" />
						</button>

						<div className="grid grid-cols-5 gap-1.5 flex-1">
							{[-2, 0, 1, 2, 3].map((val) => (
								<button
									key={val}
									type="button"
									onClick={() => onGingivalMarginChange(val)}
									className={`min-h-[48px] rounded-xl text-sm font-black transition-all cursor-pointer border ${
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
							className="min-h-[48px] min-w-[48px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer font-bold active:scale-95 shadow-2xs"
							title="Увеличить GM (рецессия десны)"
						>
							<Plus className="w-5 h-5" />
						</button>
					</div>
				</div>
			</div>

			{/* Navigation Buttons (Touch Target >= 44px) */}
			<div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrevTooth}
						className="min-h-[44px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
					>
						<ChevronLeft className="w-4 h-4" />
						<span>Пред. зуб</span>
					</button>
					<button
						type="button"
						onClick={onPrevSite}
						className="min-h-[44px] px-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
					>
						<ArrowLeft className="w-4 h-4" />
						<span>Пред. точка</span>
					</button>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onNextSite}
						className="min-h-[44px] px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
					>
						<span>След. точка</span>
						<ArrowRight className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={onNextTooth}
						className="min-h-[44px] px-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
					>
						<span>След. зуб</span>
						<ChevronRight className="w-4 h-4" />
					</button>
				</div>
			</div>
		</div>
	);
};
