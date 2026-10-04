/**
 * DENTE CRM — Mobile Window/Level (W/L) Tactile Drawer
 * Standards: Apple HIG Native Bottom Sheet, >=44px touch targets.
 */

import React, { useEffect } from "react";
import { Contrast, RotateCcw, Sliders, Sparkles, X } from "lucide-react";
import type { RadiologyQuickFilterState } from "./RadiologyQuickFiltersPanel.js";

export interface SensorStudyMobileWlDrawerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly brightnessPct: number;
	readonly contrastPct: number;
	readonly onBrightnessChange: (val: number) => void;
	readonly onContrastChange: (val: number) => void;
	readonly filters: RadiologyQuickFilterState;
	readonly onFilterChange: (next: Partial<RadiologyQuickFilterState>) => void;
	readonly onReset: () => void;
}

export const SensorStudyMobileWlDrawer: React.FC<SensorStudyMobileWlDrawerProps> = ({
	isOpen,
	onClose,
	brightnessPct,
	contrastPct,
	onBrightnessChange,
	onContrastChange,
	filters,
	onFilterChange,
	onReset,
}) => {
	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "";
		}
		return () => {
			document.body.style.overflow = "";
		};
	}, [isOpen]);

	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex flex-col justify-end"
			data-testid="mobile-wl-drawer"
		>
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-200"
				onClick={onClose}
				aria-hidden="true"
			/>

			{/* Drawer Surface */}
			<div
				className="relative z-10 w-full max-h-[82dvh] flex flex-col rounded-t-[24px] bg-[#0f172a] border-t border-[#334155] shadow-2xl animate-in slide-in-from-bottom duration-250 p-4 pb-[max(20px,env(safe-area-inset-bottom))]"
				role="dialog"
				aria-modal="true"
				aria-label="Настройка яркости и контрастности снимка"
			>
				{/* Tactile Drag Handle */}
				<div className="flex justify-center pb-2 cursor-grab">
					<div className="w-10 h-1.5 rounded-full bg-slate-500/50" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
					<div className="flex items-center gap-2">
						<Sliders size={17} className="text-teal-400" />
						<h3 className="text-sm font-bold text-white tracking-tight">
							Яркость и контрастность (W/L)
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
						aria-label="Закрыть шторку"
					>
						<X size={16} />
					</button>
				</div>

				{/* Sliders Area */}
				<div className="py-3.5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
					{/* Brightness Slider */}
					<div>
						<div className="flex items-center justify-between text-xs text-slate-200 mb-1.5 font-semibold">
							<span>Яркость (Window Level)</span>
							<span className="font-mono text-teal-400 font-bold">
								{brightnessPct > 0 ? `+${brightnessPct}%` : `${brightnessPct}%`}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min="-100"
								max="100"
								step="5"
								value={brightnessPct}
								onChange={(e) => onBrightnessChange(Number(e.target.value))}
								className="flex-1 h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
								data-testid="mobile-slider-brightness"
								aria-label="Яркость"
							/>
							<button
								type="button"
								onClick={() => onBrightnessChange(0)}
								className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
								title="Сбросить яркость на 0"
							>
								0%
							</button>
						</div>
					</div>

					{/* Contrast Slider */}
					<div>
						<div className="flex items-center justify-between text-xs text-slate-200 mb-1.5 font-semibold">
							<span>Контрастность (Window Width)</span>
							<span className="font-mono text-teal-400 font-bold">
								{contrastPct > 0 ? `+${contrastPct}%` : `${contrastPct}%`}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min="-100"
								max="100"
								step="5"
								value={contrastPct}
								onChange={(e) => onContrastChange(Number(e.target.value))}
								className="flex-1 h-3 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
								data-testid="mobile-slider-contrast"
								aria-label="Контрастность"
							/>
							<button
								type="button"
								onClick={() => onContrastChange(0)}
								className="px-2 py-1 text-[11px] rounded bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
								title="Сбросить контраст на 0"
							>
								0%
							</button>
						</div>
					</div>

					{/* Clinical Quick Presets */}
					<div>
						<span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
							Клинические пресеты:
						</span>
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: true, maxSharpness: false, invert: false, pseudoRelief: false });
									onBrightnessChange(0);
									onContrastChange(20);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-sharp-contours"
							>
								<Sparkles size={13} className="text-teal-400" />
								<span>Резкие контуры</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: true, maxSharpness: false, invert: true, pseudoRelief: false });
									onBrightnessChange(-5);
									onContrastChange(30);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-endo-canal"
							>
								<Contrast size={13} className="text-amber-400" />
								<span>Эндо-канал (верхушки)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: false, maxSharpness: true, invert: false, pseudoRelief: false });
									onBrightnessChange(10);
									onContrastChange(35);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-bone-tissue"
							>
								<Sliders size={13} className="text-cyan-400" />
								<span>Костная ткань</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: false, maxSharpness: false, invert: false, pseudoRelief: true });
									onBrightnessChange(0);
									onContrastChange(15);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-pseudo-relief"
							>
								<Sparkles size={13} className="text-emerald-400" />
								<span>Псевдо-рельеф 3D</span>
							</button>
						</div>
					</div>

					{/* 1-Click Reset */}
					<div className="pt-2 border-t border-slate-800">
						<button
							type="button"
							onClick={onReset}
							className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
							data-testid="mobile-btn-reset-filters"
						>
							<RotateCcw size={14} />
							<span>Сбросить все настройки на норму</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
