import React from "react";
import { Check, Sliders, X } from "lucide-react";
import { CBCT_HOUNSFIELD_PRESETS, type HounsfieldPreset } from "./cbctMprMath";

export interface CbctHuFlyoutProps {
	readonly activePresetId?: string;
	readonly onSelectPreset: (presetId: string) => void;
	readonly onClose: () => void;
}

export const CbctHuFlyout: React.FC<CbctHuFlyoutProps> = ({
	activePresetId,
	onSelectPreset,
	onClose,
}) => {
	return (
		<div
			role="dialog"
			aria-label="Клинические пресеты плотности HU"
			data-testid="cbct-hu-flyout"
			className="absolute left-full ml-2 top-0 max-sm:top-auto max-sm:bottom-0 z-50 w-72 bg-zinc-950 border border-zinc-800 shadow-2xl rounded-xl p-3 text-zinc-100 max-sm:max-h-[calc(100vh-120px)] max-sm:overflow-y-auto"
		>
			<div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-2">
				<div className="flex items-center gap-1.5">
					<Sliders className="w-4 h-4 text-cyan-400" />
					<span className="text-xs font-bold text-zinc-100">
						Пресеты контраста (HU)
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

			<div className="space-y-1">
				{CBCT_HOUNSFIELD_PRESETS.map((p: HounsfieldPreset) => {
					const isActive = activePresetId === p.id;
					return (
						<button
							key={p.id}
							type="button"
							onClick={() => onSelectPreset(p.id)}
							className={`w-full px-2.5 py-1.5 [@media(pointer:coarse)]:py-2 rounded-lg text-left transition-colors flex items-center justify-between gap-2 border ${
								isActive
									? "bg-zinc-800 text-cyan-300 border-cyan-500/60 shadow-xs"
									: "bg-zinc-900 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border-zinc-800"
							}`}
							data-testid={`cbct-hu-preset-option-${p.id}`}
						>
							<div className="flex flex-col min-w-0">
								<span className="text-xs font-semibold truncate text-zinc-100">
									{p.label}
								</span>
								<span className="text-[10px] text-zinc-400 font-mono truncate">
									W: {p.windowWidth} / L: {p.windowLevel}
								</span>
							</div>
							{isActive && (
								<Check className="w-4 h-4 text-cyan-400 shrink-0" />
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
};
