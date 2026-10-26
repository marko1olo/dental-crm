import type React from "react";
import { TOOTH46_PRESETS } from "./Tooth46ClinicalPresets";
import { Tooth46CariesBar } from "./Tooth46CariesBar";
import { Tooth46ProstheticBar } from "./Tooth46ProstheticBar";
import { LAYER_ITEMS } from "./tooth46LayerConstants";
import type {
	CariesDepth,
	CariesType,
	CrownMaterial,
	Tooth46ClinicalPreset,
	Tooth46LayerFlags,
} from "./tooth46Types";

export interface Tooth46StandTogglesProps {
	layers: Tooth46LayerFlags;
	activePreset?: Tooth46ClinicalPreset | null | undefined;
	onSelectPreset: (preset: Tooth46ClinicalPreset) => void;
	onToggle: (key: keyof Tooth46LayerFlags) => void;
	onChangeCrownMaterial?: ((mat: CrownMaterial) => void) | undefined;
	onToggleCondition?: ((type: "composite" | "crown") => void) | undefined;
	onChangeCariesType?: ((type: CariesType) => void) | undefined;
	onChangeCariesDepth?: ((depth: CariesDepth) => void) | undefined;
}

export const Tooth46StandToggles: React.FC<Tooth46StandTogglesProps> = ({
	layers,
	activePreset,
	onSelectPreset,
	onToggle,
	onChangeCrownMaterial,
	onToggleCondition,
	onChangeCariesType,
	onChangeCariesDepth,
}) => {
	return (
		<div className="w-full max-w-5xl flex flex-col gap-1.5 py-1.5">
			{/* Clinical States Segmented Preset Bar (Apple HIG Fade Mask & >= 44px Touch Targets) */}
			<div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]">
				<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5 shrink-0">
					Пресет:
				</span>
				{TOOTH46_PRESETS.map((preset) => {
					const isCurrent = activePreset === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							data-preset-id={preset.id}
							onClick={() => onSelectPreset(preset.id)}
							title={preset.description}
							className={`text-xs px-3 py-1.5 min-h-[44px] sm:min-h-[30px] rounded-lg border font-medium transition-all whitespace-nowrap shrink-0 flex items-center justify-center ${
								isCurrent
									? "bg-teal-600 text-white border-teal-500 shadow-sm"
									: "dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700 bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
							}`}
						>
							{preset.badge}
						</button>
					);
				})}
			</div>

			{/* Sub-toolbar: Crown Materials & Defect Statuses */}
			<Tooth46ProstheticBar
				layers={layers}
				onChangeCrownMaterial={onChangeCrownMaterial}
				onToggleCondition={onToggleCondition}
			/>

			{/* Sub-toolbar: Caries Class & WHO Depth Stages Quick Picker */}
			<Tooth46CariesBar
				layers={layers}
				onChangeCariesType={onChangeCariesType}
				onChangeCariesDepth={onChangeCariesDepth}
			/>

			{/* Granular Architectural Layer Flags (Touch Targets >= 44px on Mobile) */}
			<div className="w-full flex md:flex-wrap items-center gap-1.5 pt-1 border-t border-current/10 overflow-x-auto md:overflow-visible scrollbar-none touch-pan-x overscroll-x-contain [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)] md:[mask-image:none]">
				<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-0.5 shrink-0 hidden sm:inline">
					Слои:
				</span>
				{LAYER_ITEMS.map(([key, label]) => {
					const active = Boolean(layers[key]);
					return (
						<button
							key={key}
							type="button"
							onClick={() => onToggle(key)}
							className={`text-xs px-2.5 py-1 min-h-[44px] sm:min-h-[26px] rounded-md border transition-all whitespace-nowrap shrink-0 md:shrink flex items-center justify-center ${
								active
									? "bg-teal-500/15 border-teal-500/50 text-teal-600 dark:text-teal-300 font-medium"
									: "dark:bg-slate-800/60 dark:text-slate-400 dark:border-slate-800 bg-white text-slate-600 border-slate-200 opacity-70 hover:opacity-100"
							}`}
						>
							{active ? "✓ " : ""}
							{label}
						</button>
					);
				})}
			</div>
		</div>
	);
};
