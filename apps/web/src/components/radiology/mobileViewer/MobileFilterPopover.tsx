import { Sliders, X } from "lucide-react";
import React from "react";

export interface MobileFilterPopoverProps {
	isOpen: boolean;
	brightness: number;
	contrast: number;
	enhancementClahe: boolean;
	onChangeBrightness: (val: number) => void;
	onChangeContrast: (val: number) => void;
	onToggleClahe: () => void;
	onResetFilters: () => void;
	onClose: () => void;
}

export const MobileFilterPopover: React.FC<MobileFilterPopoverProps> = ({
	isOpen,
	brightness,
	contrast,
	enhancementClahe,
	onChangeBrightness,
	onChangeContrast,
	onToggleClahe,
	onResetFilters,
	onClose,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="mobile-radiology-slider-popover"
			data-testid="mobile-contrast-popover"
		>
			<div className="flex items-center justify-between pb-1 border-b border-white/10">
				<span className="text-xs font-bold text-white flex items-center gap-1.5">
					<Sliders size={14} className="text-teal-400" />
					<span>Тонкая настройка видимости</span>
				</span>
				<button
					type="button"
					onClick={onClose}
					className="text-slate-400 hover:text-white p-1 cursor-pointer"
					aria-label="Закрыть настройки"
				>
					<X size={15} />
				</button>
			</div>

			<div className="space-y-3 pt-1">
				<label className="flex flex-col gap-1 text-xs text-slate-300">
					<div className="flex justify-between font-semibold">
						<span>Яркость:</span>
						<span className="text-teal-400 font-mono">
							{Math.round(brightness * 100)}%
						</span>
					</div>
					<input
						type="range"
						min="0.6"
						max="1.5"
						step="0.05"
						value={brightness}
						onChange={(e) => onChangeBrightness(Number(e.target.value))}
						className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
					/>
				</label>

				<label className="flex flex-col gap-1 text-xs text-slate-300">
					<div className="flex justify-between font-semibold">
						<span>Контраст:</span>
						<span className="text-teal-400 font-mono">
							{Math.round(contrast * 100)}%
						</span>
					</div>
					<input
						type="range"
						min="0.7"
						max="2.0"
						step="0.05"
						value={contrast}
						onChange={(e) => onChangeContrast(Number(e.target.value))}
						className="w-full accent-teal-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
					/>
				</label>

				<div className="flex items-center justify-between pt-1 gap-2">
					<button
						type="button"
						onClick={onResetFilters}
						className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 active:scale-95 transition-all cursor-pointer shadow-2xs"
						data-testid="btn-mobile-reset-filters"
					>
						Сброс фильтров
					</button>

					<button
						type="button"
						onClick={onToggleClahe}
						className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 border ${
							enhancementClahe
								? "bg-teal-600 text-white border-teal-400 shadow-teal-500/20"
								: "bg-white/10 text-slate-200 border-white/15 hover:bg-white/15"
						}`}
						data-testid="btn-mobile-toggle-clahe"
					>
						CLAHE четкость
					</button>
				</div>
			</div>
		</div>
	);
};
