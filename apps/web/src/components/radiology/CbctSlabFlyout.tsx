import React from "react";
import { Layers, X } from "lucide-react";
import type { SlabProjectionMode } from "./cbctMprMath";

export interface CbctSlabFlyoutProps {
	readonly normalizedSlabMode: SlabProjectionMode;
	readonly slabThicknessMm: number;
	readonly onSelectSlabMode: (mode: SlabProjectionMode) => void;
	readonly onChangeSlabThicknessMm?: ((thicknessMm: number) => void) | undefined;
	readonly onClose: () => void;
}

export const CbctSlabFlyout: React.FC<CbctSlabFlyoutProps> = ({
	normalizedSlabMode,
	slabThicknessMm,
	onSelectSlabMode,
	onChangeSlabThicknessMm,
	onClose,
}) => {
	return (
		<div
			role="dialog"
			aria-label="Настройки толщины среза и проекции MIP"
			data-testid="cbct-slab-flyout"
			className="absolute left-full ml-2 top-0 max-sm:top-auto max-sm:bottom-0 z-50 w-64 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100 max-sm:max-h-[calc(100vh-120px)] max-sm:overflow-y-auto"
		>
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2.5">
				<div className="flex items-center gap-1.5">
					<Layers className="w-4 h-4 text-cyan-400" />
					<span className="text-xs font-bold text-zinc-100">
						Толщина среза & MIP
					</span>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="w-7 h-7 min-w-[28px] min-h-[28px] [@media(pointer:coarse)]:w-11 [@media(pointer:coarse)]:h-11 [@media(pointer:coarse)]:min-w-[44px] [@media(pointer:coarse)]:min-h-[44px] flex items-center justify-center rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
					aria-label="Закрыть меню"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Projection Modes */}
			<div className="space-y-1.5 mb-3">
				<span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-semibold">
					Режим проекции
				</span>
				<div className="grid grid-cols-2 gap-1">
					<button
						type="button"
						onClick={() => onSelectSlabMode("single")}
						className={`px-2 py-1.5 [@media(pointer:coarse)]:py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
							normalizedSlabMode === "single"
								? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-bold"
								: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
						}`}
						data-testid="cbct-slab-mode-single"
					>
						Срез 1 мм
					</button>
					<button
						type="button"
						onClick={() => onSelectSlabMode("mip")}
						className={`px-2 py-1.5 [@media(pointer:coarse)]:py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
							normalizedSlabMode === "mip"
								? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-bold"
								: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
						}`}
						data-testid="cbct-slab-mode-mip"
					>
						Slab MIP
					</button>
					<button
						type="button"
						onClick={() => onSelectSlabMode("average")}
						className={`px-2 py-1.5 [@media(pointer:coarse)]:py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
							normalizedSlabMode === "average"
								? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-bold"
								: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
						}`}
						data-testid="cbct-slab-mode-average"
					>
						Avg IP
					</button>
					<button
						type="button"
						onClick={() => onSelectSlabMode("minip")}
						className={`px-2 py-1.5 [@media(pointer:coarse)]:py-2 rounded-md text-xs font-semibold flex items-center justify-center transition-colors ${
							normalizedSlabMode === "minip"
								? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-bold"
								: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
						}`}
						data-testid="cbct-slab-mode-minip"
					>
						Min IP
					</button>
				</div>
			</div>

			{/* Slab Thickness Presets & Continuous Range Slider */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs">
					<span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-semibold">
						Толщина сляба
					</span>
					<span className="font-mono text-cyan-300 font-bold text-xs bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
						{slabThicknessMm <= 0.25 ? "0.0 мм (1 воксель)" : `${slabThicknessMm.toFixed(1)} мм`}
					</span>
				</div>

				{/* Quick millimeter presets */}
				<div className="flex items-center gap-1 overflow-x-auto pb-1">
					{[0, 0.5, 1, 2, 3, 5, 10, 15, 30].map((t) => (
						<button
							key={t}
							type="button"
							onClick={() => onChangeSlabThicknessMm?.(t)}
							data-testid={t === 15 ? "cbct-tool-slab-15mm" : `cbct-slab-thickness-${t}`}
							className={`px-2 py-0.5 [@media(pointer:coarse)]:py-1 rounded text-[11px] font-mono transition-colors shrink-0 ${
								Math.abs(slabThicknessMm - t) < 0.2
									? "bg-zinc-800 text-cyan-400 border border-cyan-500/60 font-bold"
									: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-zinc-800"
							}`}
						>
							<span data-testid={`cbct-slab-thickness-${t}`}>{t === 0 ? "0 мм" : `${t}мм`}</span>
						</button>
					))}
				</div>

				<input
					type="range"
					min={0.0}
					max={30.0}
					step={0.25}
					value={slabThicknessMm}
					onChange={(e) =>
						onChangeSlabThicknessMm?.(Number.parseFloat(e.target.value))
					}
					style={{ touchAction: "none" }}
					className="w-full accent-cyan-400 min-h-[32px] cursor-pointer bg-transparent cbct-mpr-range-slider"
					data-testid="cbct-slab-thickness-slider"
				/>
			</div>
		</div>
	);
};
