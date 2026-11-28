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
				className="relative z-10 w-full max-h-[82dvh] flex flex-col rounded-t-[24px] bg-[var(--paper)] border-t border-[var(--line)] shadow-2xl animate-in slide-in-from-bottom duration-250 p-4 pb-[max(20px,env(safe-area-inset-bottom))]"
				role="dialog"
				aria-modal="true"
				aria-label="Настройка яркости и контрастности снимка"
			>
				{/* Tactile Drag Handle */}
				<div className="flex justify-center pb-2 cursor-grab">
					<div className="w-10 h-1.5 rounded-full bg-[var(--line)]" />
				</div>

				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
					<div className="flex items-center gap-2">
						<Sliders size={17} className="text-[var(--primary)]" />
						<h3 className="text-sm font-bold text-[var(--ink)] tracking-tight">
							Яркость и контрастность (W/L)
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center bg-[var(--paper-soft)] text-[var(--ink-muted)] hover:text-[var(--ink)] border border-[var(--line)] cursor-pointer"
						aria-label="Закрыть шторку"
					>
						<X size={16} />
					</button>
				</div>

				{/* Sliders Area */}
				<div className="py-3.5 flex flex-col gap-4 overflow-y-auto overscroll-contain">
					{/* Brightness Slider */}
					<div>
						<div className="flex items-center justify-between text-xs text-[var(--ink)] mb-1.5 font-semibold">
							<span>Яркость (Window Level)</span>
							<span className="font-mono text-[var(--primary)] font-bold">
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
								className="flex-1 h-3 bg-[var(--paper-soft)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
								data-testid="mobile-slider-brightness"
								aria-label="Яркость"
							/>
							<button
								type="button"
								onClick={() => onBrightnessChange(0)}
								className="px-2 py-1 text-[11px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
								title="Сбросить яркость на 0"
							>
								0%
							</button>
						</div>
					</div>

					{/* Contrast Slider */}
					<div>
						<div className="flex items-center justify-between text-xs text-[var(--ink)] mb-1.5 font-semibold">
							<span>Контрастность (Window Width)</span>
							<span className="font-mono text-[var(--primary)] font-bold">
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
								className="flex-1 h-3 bg-[var(--paper-soft)] rounded-lg appearance-none cursor-pointer accent-[var(--primary)]"
								data-testid="mobile-slider-contrast"
								aria-label="Контрастность"
							/>
							<button
								type="button"
								onClick={() => onContrastChange(0)}
								className="px-2 py-1 text-[11px] rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink-muted)] hover:text-[var(--ink)] cursor-pointer"
								title="Сбросить контраст на 0"
							>
								0%
							</button>
						</div>
					</div>

					{/* Clinical Quick Presets */}
					<div>
						<span className="block text-[11px] font-semibold text-[var(--ink-muted)] tracking-normal mb-2">
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
								className="h-11 px-3 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-sharp-contours"
							>
								<Sparkles size={13} className="text-[var(--primary)]" />
								<span>Резкие контуры</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: true, maxSharpness: false, invert: true, pseudoRelief: false });
									onBrightnessChange(-5);
									onContrastChange(30);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-endo-canal"
							>
								<Contrast size={13} className="text-amber-500" />
								<span>Эндо-канал (верхушки)</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: false, maxSharpness: true, invert: false, pseudoRelief: false });
									onBrightnessChange(10);
									onContrastChange(35);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-bone-tissue"
							>
								<Sliders size={13} className="text-cyan-500" />
								<span>Костная ткань</span>
							</button>

							<button
								type="button"
								onClick={() => {
									onFilterChange({ sharpness: false, maxSharpness: false, invert: false, pseudoRelief: true });
									onBrightnessChange(0);
									onContrastChange(15);
								}}
								className="h-11 px-3 rounded-xl text-xs font-bold bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
								data-testid="preset-pseudo-relief"
							>
								<Sparkles size={13} className="text-emerald-500" />
								<span>Псевдо-рельеф 3D</span>
							</button>
						</div>
					</div>

					{/* Reset */}
					<div className="pt-2 border-t border-[var(--line)]">
						<button
							type="button"
							onClick={onReset}
							className="w-full h-11 rounded-xl bg-[var(--paper-soft)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
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
